import { withTransaction } from "../config/db";
import * as quizzesRepo from "../repositories/quizzesRepo";
import * as contentRepo from "../repositories/contentRepo";
import * as progressRepo from "../repositories/progressRepo";
import { ApiError } from "../utils/errors";
import { issueCertificateIfEligible } from "./completionService";
import type { QuestionType } from "../types/domain";

/**
 * Quiz service.
 *
 * Security rule: the answer key (quiz_options.is_correct) is never sent to the
 * browser. Students receive question ids and option ids only; every score is
 * calculated here, on the server, inside a transaction.
 */

export interface StudentQuestion {
  id: number;
  questionText: string;
  questionType: QuestionType;
  options: { id: number; optionText: string }[];
}

export interface StudentQuizView {
  id: number;
  unitId: number;
  unitSlug: string;
  unitTitle: string;
  title: string;
  description: string | null;
  passingPercentage: number;
  maxAttempts: number;
  attemptsUsed: number;
  attemptsRemaining: number;
  bestScore: number;
  passed: boolean;
  questions: StudentQuestion[];
}

export async function getQuizForStudent(quizId: number, userId: number): Promise<StudentQuizView> {
  const quiz = await quizzesRepo.findQuizById(quizId);
  if (!quiz || quiz.published !== 1) throw ApiError.notFound("This quiz is not available.");

  const unit = await contentRepo.findUnitById(Number(quiz.unit_id));
  if (!unit || unit.published !== 1) throw ApiError.notFound("This quiz is not available.");

  const questions = await quizzesRepo.listQuestions(quizId);
  if (questions.length === 0) throw ApiError.notFound("This quiz has no questions yet.");

  const options = await quizzesRepo.listOptions(questions.map((q) => q.id));
  const attempts = await quizzesRepo.listAttempts(userId, quizId);

  return {
    id: Number(quiz.id),
    unitId: Number(unit.id),
    unitSlug: unit.slug,
    unitTitle: unit.title,
    title: quiz.title,
    description: quiz.description,
    passingPercentage: Number(quiz.passing_percentage),
    maxAttempts: Number(quiz.max_attempts),
    attemptsUsed: attempts.length,
    attemptsRemaining: Math.max(0, Number(quiz.max_attempts) - attempts.length),
    bestScore: attempts.reduce((max, a) => Math.max(max, Number(a.score)), 0),
    passed: attempts.some((a) => a.passed === 1),
    questions: questions.map((q) => ({
      id: Number(q.id),
      questionText: q.question_text,
      questionType: q.question_type,
      options: options
        .filter((o) => o.question_id === q.id)
        .map((o) => ({ id: Number(o.id), optionText: o.option_text })),
    })),
  };
}

export interface SubmittedAnswer {
  questionId: number;
  optionIds: number[];
}

export interface QuizResult {
  attemptId: number;
  attemptNumber: number;
  score: number;
  passed: boolean;
  passingPercentage: number;
  correctCount: number;
  totalQuestions: number;
  attemptsRemaining: number;
  certificateIssued: boolean;
  questions: {
    questionId: number;
    questionText: string;
    questionType: QuestionType;
    explanation: string | null;
    isCorrect: boolean;
    selectedOptionIds: number[];
    correctOptionIds: number[];
    options: { id: number; optionText: string }[];
  }[];
}

function sameSet(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  const setA = new Set(a);
  return b.every((v) => setA.has(v));
}

export async function submitQuiz(
  quizId: number,
  userId: number,
  answers: SubmittedAnswer[],
): Promise<QuizResult> {
  const quiz = await quizzesRepo.findQuizById(quizId);
  if (!quiz || quiz.published !== 1) throw ApiError.notFound("This quiz is not available.");

  const questions = await quizzesRepo.listQuestions(quizId);
  if (questions.length === 0) throw ApiError.notFound("This quiz has no questions yet.");

  const questionIds = new Set(questions.map((q) => Number(q.id)));
  const options = await quizzesRepo.listOptions(questions.map((q) => q.id));

  // Every submitted question must belong to this quiz, and every selected
  // option must belong to its question - otherwise the attempt is rejected.
  const answerMap = new Map<number, number[]>();
  for (const answer of answers) {
    if (!questionIds.has(answer.questionId)) {
      throw ApiError.badRequest("The submitted answers do not match this quiz.");
    }
    const validOptionIds = new Set(
      options.filter((o) => o.question_id === answer.questionId).map((o) => Number(o.id)),
    );
    if (answer.optionIds.some((id) => !validOptionIds.has(id))) {
      throw ApiError.badRequest("The submitted answers do not match this quiz.");
    }
    answerMap.set(answer.questionId, [...new Set(answer.optionIds)]);
  }

  const used = await quizzesRepo.countSubmittedAttempts(userId, quizId);
  if (used >= Number(quiz.max_attempts)) {
    throw ApiError.conflict("You have used all attempts for this quiz.");
  }

  const attemptNumber = await quizzesRepo.nextAttemptNumber(userId, quizId);
  const passingPercentage = Number(quiz.passing_percentage);

  const perQuestion = questions.map((question) => {
    const correctIds = options
      .filter((o) => o.question_id === question.id && o.is_correct === 1)
      .map((o) => Number(o.id));
    const selected = answerMap.get(Number(question.id)) ?? [];

    let isCorrect: boolean;
    if (question.question_type === "multiple_select") {
      // Multiple-select requires the exact set - no partial credit.
      isCorrect = selected.length > 0 && sameSet(selected, correctIds);
    } else {
      // single answer: exactly one option, and it must be the correct one
      isCorrect = selected.length === 1 && selected[0] === correctIds[0];
    }

    return {
      question,
      selected,
      correctIds,
      isCorrect,
    };
  });

  const total = perQuestion.length;
  const correct = perQuestion.filter((p) => p.isCorrect).length;
  const score = Math.round((correct / total) * 10000) / 100;
  const passed = score >= passingPercentage;

  const attemptId = await withTransaction(async (conn) => {
    const [insertResult] = await conn.execute(
      "INSERT INTO quiz_attempts (user_id, quiz_id, attempt_number) VALUES (?, ?, ?)",
      [userId, quizId, attemptNumber],
    );
    const id = (insertResult as { insertId: number }).insertId;

    for (const item of perQuestion) {
      await conn.execute(
        "INSERT INTO quiz_responses (attempt_id, question_id, selected_answer, is_correct) VALUES (?, ?, ?, ?)",
        [id, item.question.id, item.selected.length ? item.selected.join(",") : null, item.isCorrect ? 1 : 0],
      );
    }

    await conn.execute(
      "UPDATE quiz_attempts SET score = ?, passed = ?, status = 'submitted', submitted_at = NOW() WHERE id = ?",
      [score, passed ? 1 : 0, id],
    );

    return id as number;
  });

  // Passing a required quiz can complete the course -> may issue a certificate.
  let certificateIssued = false;
  if (passed) {
    const unit = await contentRepo.findUnitById(Number(quiz.unit_id));
    if (unit) {
      const result = await issueCertificateIfEligible(userId, Number(unit.course_id));
      certificateIssued = Boolean(result?.created);
    }
  }

  const attemptsRemaining = Math.max(0, Number(quiz.max_attempts) - (used + 1));

  return {
    attemptId,
    attemptNumber,
    score,
    passed,
    passingPercentage,
    correctCount: correct,
    totalQuestions: total,
    attemptsRemaining,
    certificateIssued,
    questions: perQuestion.map((item) => ({
      questionId: Number(item.question.id),
      questionText: item.question.question_text,
      questionType: item.question.question_type,
      explanation: item.question.explanation,
      isCorrect: item.isCorrect,
      selectedOptionIds: item.selected,
      correctOptionIds: item.correctIds,
      options: options
        .filter((o) => o.question_id === item.question.id)
        .map((o) => ({ id: Number(o.id), optionText: o.option_text })),
    })),
  };
}

export async function listAttemptHistory(userId: number, quizId: number) {
  const quiz = await quizzesRepo.findQuizById(quizId);
  if (!quiz) throw ApiError.notFound("This quiz is not available.");
  const attempts = await quizzesRepo.listAttempts(userId, quizId);
  return {
    quizId,
    passingPercentage: Number(quiz.passing_percentage),
    maxAttempts: Number(quiz.max_attempts),
    attempts: attempts.map((a) => ({
      id: Number(a.id),
      attemptNumber: Number(a.attempt_number),
      score: Number(a.score),
      passed: a.passed === 1,
      submittedAt: a.submitted_at,
    })),
  };
}

/** Detailed view of one attempt (owner or admin only). */
export async function getAttemptDetail(attemptId: number, requester: { id: number; role: string }) {
  const attempt = await quizzesRepo.findAttemptById(attemptId);
  if (!attempt) throw ApiError.notFound("Attempt not found.");
  if (Number(attempt.user_id) !== requester.id && requester.role !== "admin") {
    throw ApiError.forbidden("You may only view your own attempts.");
  }
  if (attempt.status !== "submitted") throw ApiError.badRequest("This attempt has not been submitted.");

  const questions = await quizzesRepo.listQuestions(Number(attempt.quiz_id));
  const options = await quizzesRepo.listOptions(questions.map((q) => q.id));
  const responses = await quizzesRepo.listResponses(attemptId);

  return {
    id: Number(attempt.id),
    quizId: Number(attempt.quiz_id),
    attemptNumber: Number(attempt.attempt_number),
    score: Number(attempt.score),
    passed: attempt.passed === 1,
    submittedAt: attempt.submitted_at,
    questions: questions.map((q) => {
      const response = responses.find((r) => Number(r.question_id) === Number(q.id));
      return {
        questionId: Number(q.id),
        questionText: q.question_text,
        questionType: q.question_type,
        explanation: q.explanation,
        selectedOptionIds: response?.selected_answer
          ? String(response.selected_answer).split(",").map(Number)
          : [],
        correctOptionIds: options
          .filter((o) => o.question_id === q.id && o.is_correct === 1)
          .map((o) => Number(o.id)),
        isCorrect: response ? response.is_correct === 1 : false,
        options: options
          .filter((o) => o.question_id === q.id)
          .map((o) => ({ id: Number(o.id), optionText: o.option_text })),
      };
    }),
  };
}

export { progressRepo };
