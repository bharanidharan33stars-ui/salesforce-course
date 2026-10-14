"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Award, CheckCircle2, ChevronRight, RefreshCcw, RotateCcw, XCircle } from "lucide-react";
import { api, errorMessage } from "@/lib/api-client";
import { Alert, Badge, Card, PageLoader } from "@/components/ui/primitives";
import { Button, LinkButton } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AttemptHistory, QuizResultQuestion, StudentQuizView } from "@/types";

interface AttemptDetail {
  id: number;
  quizId: number;
  attemptNumber: number;
  score: number;
  passed: boolean;
  submittedAt: string | null;
  questions: QuizResultQuestion[];
}

function ResultsContent() {
  const params = useParams<{ quizId: string }>();
  const searchParams = useSearchParams();
  const attemptId = searchParams.get("attempt");

  const [attempt, setAttempt] = useState<AttemptDetail | null>(null);
  const [quiz, setQuiz] = useState<StudentQuizView | null>(null);
  const [history, setHistory] = useState<AttemptHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const detail = await api.get<AttemptDetail>(`/student/quiz-attempts/${attemptId}`);
      setAttempt(detail);
      const [quizData, historyData] = await Promise.all([
        api.get<StudentQuizView>(`/student/quizzes/${detail.quizId}`).catch(() => null),
        api.get<AttemptHistory>(`/student/quizzes/${detail.quizId}/attempts`).catch(() => null),
      ]);
      setQuiz(quizData);
      setHistory(historyData);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setLoading(false);
    }
  }, [attemptId]);

  useEffect(() => {
    if (attemptId) void load();
    else {
      setError("This result link is missing its attempt id.");
      setLoading(false);
    }
  }, [attemptId, load]);

  if (loading) return <PageLoader label="Loading result" />;
  if (error || !attempt) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Alert tone="danger" title="Result unavailable">
          {error ?? "We could not load this attempt."}
        </Alert>
        <LinkButton href="/dashboard" variant="outline">Back to dashboard</LinkButton>
      </div>
    );
  }

  const passingPercentage = quiz?.passingPercentage ?? history?.passingPercentage ?? 70;
  const maxAttempts = quiz?.maxAttempts ?? history?.maxAttempts ?? 3;
  const attemptsRemaining = Math.max(0, maxAttempts - (history?.attempts.length ?? attempt.attemptNumber));
  const correctCount = attempt.questions.filter((q) => q.isCorrect).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="mx-auto max-w-3xl space-y-5"
    >
      {/* Score card */}
      <Card className="text-center">
        <nav aria-label="Breadcrumb" className="mb-3 flex items-center justify-center gap-1 text-sm text-muted">
          <Link href="/dashboard" className="hover:text-brand">Dashboard</Link>
          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{quiz?.title ?? "Quiz result"}</span>
        </nav>

        <div
          className={cn(
            "mx-auto flex h-24 w-24 items-center justify-center rounded-full border-4",
            attempt.passed ? "border-success bg-success-soft" : "border-danger bg-danger-soft",
          )}
        >
          <span className={cn("text-2xl font-bold", attempt.passed ? "text-success" : "text-danger")}>
            {attempt.score}%
          </span>
        </div>

        <h1 className="mt-4 text-2xl font-bold text-navy">
          {attempt.passed ? "Well done — you passed!" : "Not quite there yet"}
        </h1>
        <p className="mt-1 text-sm text-muted">
          {correctCount} of {attempt.questions.length} correct · pass mark {passingPercentage}% · attempt{" "}
          {attempt.attemptNumber} of {maxAttempts}
        </p>

        <div className="mt-4 flex justify-center">
          {attempt.passed ? (
            <Badge tone="success"><CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> Passed</Badge>
          ) : (
            <Badge tone="danger"><XCircle className="h-3.5 w-3.5" aria-hidden="true" /> Not passed</Badge>
          )}
        </div>

        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          {attempt.passed ? (
            <LinkButton href="/dashboard">
              <Award className="h-4 w-4" aria-hidden="true" /> Continue to dashboard
            </LinkButton>
          ) : attemptsRemaining > 0 ? (
            <LinkButton href={`/quizzes/${attempt.quizId}`}>
              <RefreshCcw className="h-4 w-4" aria-hidden="true" /> Try again ({attemptsRemaining} left)
            </LinkButton>
          ) : (
            <LinkButton href="/dashboard" variant="outline">Back to dashboard</LinkButton>
          )}
          <LinkButton href={`/course/${quiz?.unitSlug ?? ""}`} variant="outline">
            Review the lessons
          </LinkButton>
        </div>
      </Card>

      {history && history.attempts.length > 1 ? (
        <Card>
          <h2 className="mb-3 text-base font-bold text-navy">Attempt history</h2>
          <ul className="divide-y divide-line">
            {history.attempts.map((item) => (
              <li key={item.id} className="flex items-center justify-between py-2.5 text-sm">
                <span className="text-muted">Attempt {item.attemptNumber}</span>
                <span className="flex items-center gap-3">
                  <span className="font-semibold text-navy">{item.score}%</span>
                  {item.passed ? <Badge tone="success">Passed</Badge> : <Badge tone="neutral">Not passed</Badge>}
                  {Number(item.id) !== Number(attempt.id) ? (
                    <Link
                      href={`/quizzes/${attempt.quizId}/results?attempt=${item.id}`}
                      className="text-brand underline underline-offset-2"
                    >
                      View
                    </Link>
                  ) : (
                    <span className="text-xs text-muted">current</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {/* Answer review */}
      <Card>
        <h2 className="mb-1 text-base font-bold text-navy">Answer review</h2>
        <p className="mb-4 text-sm text-muted">
          Explanations appear only after submission, so the answer key is never exposed while the quiz is running.
        </p>
        <ol className="space-y-4">
          {attempt.questions.map((question, index) => (
            <li key={question.questionId} className="rounded-xl border border-line p-4">
              <div className="flex items-start gap-2.5">
                <span
                  className={cn(
                    "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                    question.isCorrect ? "bg-success-soft text-success" : "bg-danger-soft text-danger",
                  )}
                >
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold leading-relaxed text-navy">{question.questionText}</p>
                  <ul className="mt-2 space-y-1.5 text-sm">
                    {question.options.map((option) => {
                      const isSelected = question.selectedOptionIds.includes(option.id);
                      const isCorrect = question.correctOptionIds.includes(option.id);
                      return (
                        <li
                          key={option.id}
                          className={cn(
                            "flex items-start gap-2 rounded-lg px-2.5 py-1.5",
                            isCorrect ? "bg-success-soft" : isSelected ? "bg-danger-soft" : "text-muted",
                          )}
                        >
                          <span className="mt-0.5 w-4 shrink-0 text-xs font-bold">
                            {isCorrect ? "✓" : isSelected ? "✗" : ""}
                          </span>
                          <span className={cn(isCorrect ? "font-medium text-navy" : "")}>
                            {option.optionText}
                            {isSelected && !isCorrect ? <span className="ml-1 text-xs text-muted">(your answer)</span> : null}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                  {question.explanation ? (
                    <div className="mt-3 rounded-lg bg-brand-soft px-3 py-2 text-sm leading-relaxed text-navy">
                      <span className="font-semibold">Why: </span>
                      {question.explanation}
                    </div>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ol>
      </Card>

      <div className="flex justify-center pb-4">
        <Button variant="ghost" onClick={() => window.print()}>
          <RotateCcw className="h-4 w-4" aria-hidden="true" /> Print this result
        </Button>
      </div>
    </motion.div>
  );
}

export default function QuizResultsPage() {
  return (
    <Suspense fallback={<PageLoader label="Loading result" />}>
      <ResultsContent />
    </Suspense>
  );
}
