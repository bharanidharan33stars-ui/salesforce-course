"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { AlertCircle, Award, ChevronRight, HelpCircle, Lock, RotateCcw, Send } from "lucide-react";
import { api, ApiClientError, errorMessage } from "@/lib/api-client";
import { Alert, Badge, Card, PageLoader } from "@/components/ui/primitives";
import { Button, LinkButton } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { QuizResult, StudentQuizView } from "@/types";

/**
 * Quiz runner.
 *
 * The browser only ever receives question ids and option ids - never which
 * option is correct. The score is produced by the server on submission.
 */
export default function QuizPage() {
  const params = useParams<{ quizId: string }>();
  const router = useRouter();
  const reduceMotion = useReducedMotion();

  const [quiz, setQuiz] = useState<StudentQuizView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<number, number[]>>({});
  const [submitting, setSubmitting] = useState(false);
  const [blocked, setBlocked] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setQuiz(await api.get<StudentQuizView>(`/student/quizzes/${params.quizId}`));
    } catch (caught) {
      setError(errorMessage(caught));
      if (caught instanceof ApiClientError && caught.status === 409) setBlocked(true);
    } finally {
      setLoading(false);
    }
  }, [params.quizId]);

  useEffect(() => {
    void load();
  }, [load]);

  const selectOption = (questionId: number, optionId: number, type: string) => {
    setAnswers((current) => {
      const existing = current[questionId] ?? [];
      if (type === "multiple_select") {
        const next = existing.includes(optionId)
          ? existing.filter((id) => id !== optionId)
          : [...existing, optionId];
        return { ...current, [questionId]: next };
      }
      return { ...current, [questionId]: [optionId] };
    });
  };

  const answeredCount = useMemo(
    () => (quiz ? quiz.questions.filter((q) => (answers[q.id] ?? []).length > 0).length : 0),
    [answers, quiz],
  );

  const submit = async () => {
    if (!quiz) return;
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        answers: quiz.questions.map((question) => ({
          questionId: question.id,
          optionIds: answers[question.id] ?? [],
        })),
      };
      const result = await api.post<QuizResult>(`/student/quizzes/${quiz.id}/submit`, payload);
      router.push(`/quizzes/${quiz.id}/results?attempt=${result.attemptId}`);
    } catch (caught) {
      setError(errorMessage(caught));
      setSubmitting(false);
    }
  };

  if (loading) return <PageLoader label="Loading quiz" />;

  if (!quiz) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Alert tone="danger" title="Quiz unavailable">
          {error ?? "This quiz could not be loaded."}
        </Alert>
        {blocked ? (
          <Alert tone="warning" title="No attempts remaining">
            You have used every attempt for this quiz. Your best score still counts towards the course.
          </Alert>
        ) : null}
        <div className="flex flex-wrap gap-3">
          <LinkButton href="/dashboard" variant="outline">Back to dashboard</LinkButton>
          <LinkButton href="/course" variant="outline">Course outline</LinkButton>
        </div>
      </div>
    );
  }

  const exhausted = quiz.attemptsRemaining <= 0 && !quiz.passed;

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="mx-auto max-w-3xl space-y-5"
    >
      {/* Header */}
      <Card>
        <nav aria-label="Breadcrumb" className="mb-3 flex items-center gap-1 text-sm text-muted">
          <Link href="/dashboard" className="hover:text-brand">Dashboard</Link>
          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          <Link href={`/course/${quiz.unitSlug}`} className="hover:text-brand">{quiz.unitTitle}</Link>
        </nav>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-navy">{quiz.title}</h1>
            {quiz.description ? <p className="mt-1 text-sm text-muted">{quiz.description}</p> : null}
          </div>
          {quiz.passed ? <Badge tone="success"><Award className="h-3.5 w-3.5" aria-hidden="true" /> Passed</Badge> : null}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MetaTile label="Questions" value={String(quiz.questions.length)} />
          <MetaTile label="Pass mark" value={`${quiz.passingPercentage}%`} />
          <MetaTile label="Attempts used" value={`${quiz.attemptsUsed}/${quiz.maxAttempts}`} />
          <MetaTile label="Best score" value={quiz.bestScore ? `${quiz.bestScore}%` : "—"} />
        </div>
      </Card>

      {exhausted ? (
        <Alert tone="danger" title="No attempts remaining">
          You have used all {quiz.maxAttempts} attempts for this quiz. Review the lessons and ask your instructor if
          you need another chance.
          <div className="mt-3">
            <LinkButton href={`/course/${quiz.unitSlug}`} size="sm" variant="outline">Back to the unit</LinkButton>
          </div>
        </Alert>
      ) : null}

      {error ? <Alert tone="danger" onDismiss={() => setError(null)}>{error}</Alert> : null}

      {/* Questions */}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
        className="space-y-4"
      >
        {quiz.questions.map((question, index) => {
          const selected = answers[question.id] ?? [];
          const isMulti = question.questionType === "multiple_select";
          return (
            <fieldset key={question.id} className="card p-5">
              <legend className="sr-only">{question.questionText}</legend>
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-bold text-brand">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold leading-relaxed text-navy">{question.questionText}</p>
                  <p className="mt-1 text-xs text-muted">
                    {question.questionType === "true_false"
                      ? "True or false"
                      : isMulti
                        ? "Select every correct answer"
                        : "Choose one answer"}
                  </p>

                  <div className="mt-3 space-y-2">
                    {question.options.map((option) => {
                      const checked = selected.includes(option.id);
                      return (
                        <label
                          key={option.id}
                          className={cn(
                            "flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-2.5 text-sm transition-colors",
                            checked ? "border-brand bg-brand-soft text-navy" : "border-line bg-white text-ink hover:border-brand/50",
                          )}
                        >
                          <input
                            type={isMulti ? "checkbox" : "radio"}
                            name={`question-${question.id}`}
                            checked={checked}
                            onChange={() => selectOption(question.id, option.id, question.questionType)}
                            className="h-5 w-5 shrink-0 accent-[#1675D1]"
                          />
                          <span className="leading-snug">{option.optionText}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            </fieldset>
          );
        })}

        {!exhausted ? (
          <Card className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted">
              {answeredCount}/{quiz.questions.length} answered ·{" "}
              <span className="font-semibold text-navy">{quiz.attemptsRemaining} attempt{quiz.attemptsRemaining === 1 ? "" : "s"} left</span>
            </p>
            <Button type="submit" size="lg" loading={submitting} disabled={answeredCount === 0}>
              <Send className="h-4 w-4" aria-hidden="true" />
              {submitting ? "Scoring…" : "Submit answers"}
            </Button>
          </Card>
        ) : null}
      </form>

      <p className="flex items-start gap-2 text-xs text-muted">
        <HelpCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        Answers are checked on the server. Your score is stored permanently and the passing percentage is set by the
        academy.
      </p>
      {blocked ? (
        <p className="flex items-start gap-2 text-xs text-warning">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          This quiz is locked for new attempts.
        </p>
      ) : null}
      <div className="flex justify-center pb-4">
        <LinkButton href="/dashboard" variant="ghost" size="sm">
          <RotateCcw className="h-4 w-4" aria-hidden="true" /> Back to dashboard
        </LinkButton>
      </div>
    </motion.div>
  );
}

function MetaTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line bg-bg px-3 py-2">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-0.5 text-base font-bold text-navy">{value}</p>
    </div>
  );
}
