import type { PoolConnection } from "mysql2/promise";
import { execute, query } from "../config/db";
import type { AttemptRow, OptionRow, QuestionRow, QuizRow } from "../types/domain";

/** Quizzes, questions, options, attempts and responses. */

export async function findQuizByUnit(unitId: number): Promise<QuizRow | null> {
  const rows = await query<QuizRow[]>("SELECT * FROM quizzes WHERE unit_id = ? LIMIT 1", [unitId]);
  return rows[0] ?? null;
}

export async function findPublishedQuizForUnit(unitId: number): Promise<QuizRow | null> {
  const rows = await query<QuizRow[]>(
    "SELECT * FROM quizzes WHERE unit_id = ? AND published = 1 LIMIT 1",
    [unitId],
  );
  return rows[0] ?? null;
}

export async function findQuizById(id: number): Promise<QuizRow | null> {
  const rows = await query<QuizRow[]>("SELECT * FROM quizzes WHERE id = ? LIMIT 1", [id]);
  return rows[0] ?? null;
}

export async function listPublishedQuizzes(courseId?: number): Promise<(QuizRow & { unit_slug: string; unit_title: string; course_id: number })[]> {
  if (courseId) {
    return query(
      `SELECT q.*, u.slug AS unit_slug, u.title AS unit_title, u.course_id
         FROM quizzes q JOIN course_units u ON u.id = q.unit_id
        WHERE q.published = 1 AND u.published = 1 AND u.course_id = ?
        ORDER BY u.sort_order ASC`,
      [courseId],
    );
  }
  return query(
    `SELECT q.*, u.slug AS unit_slug, u.title AS unit_title, u.course_id
       FROM quizzes q JOIN course_units u ON u.id = q.unit_id
      WHERE q.published = 1 AND u.published = 1
      ORDER BY u.sort_order ASC`,
  );
}

export async function listAllQuizzes(): Promise<(QuizRow & { unit_slug: string; unit_title: string })[]> {
  return query(
    `SELECT q.*, u.slug AS unit_slug, u.title AS unit_title
       FROM quizzes q JOIN course_units u ON u.id = q.unit_id
      ORDER BY u.sort_order ASC, q.id ASC`,
  );
}

export async function insertQuiz(input: {
  unitId: number;
  title: string;
  description: string | null;
  passingPercentage: number;
  maxAttempts: number;
  published: boolean;
  isRequired: boolean;
}): Promise<number> {
  const result = await execute(
    `INSERT INTO quizzes (unit_id, title, description, passing_percentage, max_attempts, published, is_required)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      input.unitId,
      input.title,
      input.description,
      input.passingPercentage,
      input.maxAttempts,
      input.published ? 1 : 0,
      input.isRequired ? 1 : 0,
    ],
  );
  return result.insertId;
}

export async function updateQuiz(
  id: number,
  input: {
    title: string;
    description: string | null;
    passingPercentage: number;
    maxAttempts: number;
    published: boolean;
    isRequired: boolean;
  },
): Promise<void> {
  await execute(
    `UPDATE quizzes
        SET title = ?, description = ?, passing_percentage = ?, max_attempts = ?, published = ?, is_required = ?
      WHERE id = ?`,
    [
      input.title,
      input.description,
      input.passingPercentage,
      input.maxAttempts,
      input.published ? 1 : 0,
      input.isRequired ? 1 : 0,
      id,
    ],
  );
}

// ------------------------------------------------------------- questions

export async function listQuestions(quizId: number): Promise<QuestionRow[]> {
  return query<QuestionRow[]>(
    "SELECT * FROM quiz_questions WHERE quiz_id = ? ORDER BY sort_order ASC, id ASC",
    [quizId],
  );
}

export async function listOptions(questionIds: number[]): Promise<OptionRow[]> {
  if (questionIds.length === 0) return [];
  const placeholders = questionIds.map(() => "?").join(",");
  return query<OptionRow[]>(
    `SELECT * FROM quiz_options WHERE question_id IN (${placeholders}) ORDER BY sort_order ASC, id ASC`,
    questionIds,
  );
}

export async function findQuestionById(id: number): Promise<QuestionRow | null> {
  const rows = await query<QuestionRow[]>("SELECT * FROM quiz_questions WHERE id = ? LIMIT 1", [id]);
  return rows[0] ?? null;
}

export async function insertQuestion(input: {
  quizId: number;
  questionText: string;
  questionType: QuestionRow["question_type"];
  explanation: string | null;
  sortOrder: number;
}): Promise<number> {
  const result = await execute(
    "INSERT INTO quiz_questions (quiz_id, question_text, question_type, explanation, sort_order) VALUES (?, ?, ?, ?, ?)",
    [input.quizId, input.questionText, input.questionType, input.explanation, input.sortOrder],
  );
  return result.insertId;
}

export async function updateQuestion(
  id: number,
  input: { questionText: string; questionType: QuestionRow["question_type"]; explanation: string | null; sortOrder: number },
): Promise<void> {
  await execute(
    "UPDATE quiz_questions SET question_text = ?, question_type = ?, explanation = ?, sort_order = ? WHERE id = ?",
    [input.questionText, input.questionType, input.explanation, input.sortOrder, id],
  );
}

export async function deleteQuestion(id: number): Promise<void> {
  await execute("DELETE FROM quiz_questions WHERE id = ?", [id]);
}

export async function insertOption(input: {
  questionId: number;
  optionText: string;
  isCorrect: boolean;
  sortOrder: number;
}): Promise<number> {
  const result = await execute(
    "INSERT INTO quiz_options (question_id, option_text, is_correct, sort_order) VALUES (?, ?, ?, ?)",
    [input.questionId, input.optionText, input.isCorrect ? 1 : 0, input.sortOrder],
  );
  return result.insertId;
}

export async function deleteOptionsForQuestion(questionId: number): Promise<void> {
  await execute("DELETE FROM quiz_options WHERE question_id = ?", [questionId]);
}

// -------------------------------------------------------------- attempts

export async function countSubmittedAttempts(userId: number, quizId: number): Promise<number> {
  const rows = await query<{ count: number }[]>(
    "SELECT COUNT(*) AS count FROM quiz_attempts WHERE user_id = ? AND quiz_id = ? AND status = 'submitted'",
    [userId, quizId],
  );
  return Number(rows[0]?.count ?? 0);
}

export async function listAttempts(userId: number, quizId: number): Promise<AttemptRow[]> {
  return query<AttemptRow[]>(
    `SELECT * FROM quiz_attempts
      WHERE user_id = ? AND quiz_id = ? AND status = 'submitted'
      ORDER BY attempt_number ASC`,
    [userId, quizId],
  );
}

export async function findAttemptById(id: number): Promise<AttemptRow | null> {
  const rows = await query<AttemptRow[]>("SELECT * FROM quiz_attempts WHERE id = ? LIMIT 1", [id]);
  return rows[0] ?? null;
}

export async function nextAttemptNumber(userId: number, quizId: number): Promise<number> {
  const rows = await query<{ max_number: number | null }[]>(
    "SELECT MAX(attempt_number) AS max_number FROM quiz_attempts WHERE user_id = ? AND quiz_id = ?",
    [userId, quizId],
  );
  return Number(rows[0]?.max_number ?? 0) + 1;
}

export async function insertAttempt(
  input: { userId: number; quizId: number; attemptNumber: number },
  conn?: PoolConnection,
): Promise<number> {
  const sql = "INSERT INTO quiz_attempts (user_id, quiz_id, attempt_number) VALUES (?, ?, ?)";
  const params = [input.userId, input.quizId, input.attemptNumber];
  if (conn) {
    const [result] = await conn.execute(sql, params as never[]);
    return (result as { insertId: number }).insertId;
  }
  const result = await execute(sql, params);
  return result.insertId;
}

export async function finalizeAttempt(
  attemptId: number,
  input: { score: number; passed: boolean },
  conn?: PoolConnection,
): Promise<void> {
  const sql = "UPDATE quiz_attempts SET score = ?, passed = ?, status = 'submitted', submitted_at = NOW() WHERE id = ?";
  const params = [input.score, input.passed ? 1 : 0, attemptId];
  if (conn) {
    await conn.execute(sql, params as never[]);
    return;
  }
  await execute(sql, params);
}

export async function insertResponse(input: {
  attemptId: number;
  questionId: number;
  selectedAnswer: string | null;
  isCorrect: boolean;
}, conn?: PoolConnection): Promise<void> {
  const sql =
    "INSERT INTO quiz_responses (attempt_id, question_id, selected_answer, is_correct) VALUES (?, ?, ?, ?)";
  const params = [input.attemptId, input.questionId, input.selectedAnswer, input.isCorrect ? 1 : 0];
  if (conn) await conn.execute(sql, params as never[]);
  else await execute(sql, params);
}

export interface ResponseRow {
  id: number;
  attempt_id: number;
  question_id: number;
  selected_answer: string | null;
  is_correct: 0 | 1;
}

export async function listResponses(attemptId: number): Promise<ResponseRow[]> {
  return query<ResponseRow[]>("SELECT * FROM quiz_responses WHERE attempt_id = ?", [attemptId]);
}

export interface QuizPassSummary {
  quiz_id: number;
  passed: number;
  attempts: number;
  passing_percentage: number;
  is_required: number;
  unit_id: number;
  unit_slug: string;
  unit_title: string;
}

export async function listQuizPassSummary(userId: number, courseId: number): Promise<QuizPassSummary[]> {
  return query<QuizPassSummary[]>(
    `SELECT q.id AS quiz_id,
            COALESCE(MAX(a.passed), 0) AS passed,
            COALESCE(COUNT(a.id), 0) AS attempts,
            q.passing_percentage,
            q.is_required,
            u.id AS unit_id, u.slug AS unit_slug, u.title AS unit_title
       FROM quizzes q
       JOIN course_units u ON u.id = q.unit_id
       LEFT JOIN quiz_attempts a ON a.quiz_id = q.id AND a.user_id = ? AND a.status = 'submitted'
      WHERE q.published = 1 AND u.published = 1 AND u.course_id = ?
      GROUP BY q.id, q.passing_percentage, q.is_required, u.id, u.slug, u.title, u.sort_order
      ORDER BY u.sort_order ASC`,
    [userId, courseId],
  );
}

export async function aggregateQuizStats(): Promise<{
  totalAttempts: number;
  passedAttempts: number;
  distinctPassingStudents: number;
}> {
  const rows = await query<{ total: number; passed: number }[]>(
    "SELECT COUNT(*) AS total, COALESCE(SUM(passed), 0) AS passed FROM quiz_attempts WHERE status = 'submitted'",
  );
  const students = await query<{ count: number }[]>(
    "SELECT COUNT(DISTINCT user_id) AS count FROM quiz_attempts WHERE status = 'submitted' AND passed = 1",
  );
  return {
    totalAttempts: Number(rows[0]?.total ?? 0),
    passedAttempts: Number(rows[0]?.passed ?? 0),
    distinctPassingStudents: Number(students[0]?.count ?? 0),
  };
}
