"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Circle, Plus } from "lucide-react";
import { api, errorMessage } from "@/lib/api-client";
import type { AdminQuizQuestion } from "@/types";
import { Alert, Badge, Card, CardHeader, PageLoader, Spinner } from "@/components/ui/primitives";
import { Button, LinkButton } from "@/components/ui/button";
import { Checkbox, Input, Textarea } from "@/components/ui/field";
import { QuestionEditor, type QuestionPayload } from "@/components/admin/question-editor";

interface QuizDetail {
  id: number;
  unitId: number;
  title: string;
  description: string | null;
  passingPercentage: number;
  maxAttempts: number;
  published: boolean;
  isRequired: boolean;
  questions: AdminQuizQuestion[];
}

interface SettingsForm {
  title: string;
  description: string;
  passingPercentage: string;
  maxAttempts: string;
  published: boolean;
  isRequired: boolean;
}

interface SettingsErrors {
  title?: string;
  passing?: string;
  attempts?: string;
}

function toForm(detail: QuizDetail): SettingsForm {
  return {
    title: detail.title,
    description: detail.description ?? "",
    passingPercentage: String(detail.passingPercentage),
    maxAttempts: String(detail.maxAttempts),
    published: detail.published,
    isRequired: detail.isRequired,
  };
}

const QUESTION_TYPE_LABELS: Record<AdminQuizQuestion["questionType"], string> = {
  multiple_choice: "Multiple choice",
  true_false: "True / false",
  multiple_select: "Multiple select",
};

export default function AdminQuizDetailPage({ params }: { params: Promise<{ quizId: string }> }) {
  const { quizId } = use(params);
  const numericId = Number(quizId);

  const [detail, setDetail] = useState<QuizDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [form, setForm] = useState<SettingsForm | null>(null);
  const [settingsErrors, setSettingsErrors] = useState<SettingsErrors>({});
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);

  const [adding, setAdding] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<number | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [questionError, setQuestionError] = useState<string | null>(null);
  const [questionSuccess, setQuestionSuccess] = useState<string | null>(null);

  const load = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!options?.silent) setLoading(true);
      setLoadError(null);
      try {
        const data = await api.get<QuizDetail>(`/admin/quizzes/${numericId}`);
        setDetail(data);
        setForm((previous) => previous ?? toForm(data));
      } catch (err) {
        setLoadError(errorMessage(err));
      } finally {
        setLoading(false);
      }
    },
    [numericId],
  );

  useEffect(() => {
    if (!Number.isFinite(numericId)) {
      setLoadError("Invalid quiz id.");
      setLoading(false);
      return;
    }
    void load();
  }, [load]);

  function updateForm(patch: Partial<SettingsForm>) {
    setForm((previous) => (previous ? { ...previous, ...patch } : previous));
    setSettingsSaved(false);
  }

  async function handleSaveSettings(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!detail || !form) return;

    const title = form.title.trim();
    const passValue = form.passingPercentage.trim();
    const attemptValue = form.maxAttempts.trim();
    const pass = Number(passValue);
    const attempts = Number(attemptValue);
    const nextErrors: SettingsErrors = {};

    if (title.length < 3) nextErrors.title = "Enter a title of at least 3 characters.";
    if (passValue === "" || !Number.isInteger(pass) || pass < 1 || pass > 100) {
      nextErrors.passing = "Enter a whole number between 1 and 100.";
    }
    if (attemptValue === "" || !Number.isInteger(attempts) || attempts < 1 || attempts > 20) {
      nextErrors.attempts = "Enter a whole number between 1 and 20.";
    }

    setSettingsErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSavingSettings(true);
    setSettingsError(null);
    try {
      const payload = {
        unitId: detail.unitId,
        title,
        description: form.description.trim() ? form.description.trim() : null,
        passingPercentage: pass,
        maxAttempts: attempts,
        published: form.published,
        isRequired: form.isRequired,
      };
      await api.put(`/admin/quizzes/${numericId}`, payload);
      setDetail((previous) => (previous ? { ...previous, ...payload } : previous));
      setSettingsSaved(true);
      await load({ silent: true });
    } catch (err) {
      setSettingsError(errorMessage(err));
    } finally {
      setSavingSettings(false);
    }
  }

  async function handleAddQuestion(payload: QuestionPayload) {
    await api.post(`/admin/quizzes/${numericId}/questions`, payload);
    setAdding(false);
    setQuestionSuccess("Question added.");
    await load({ silent: true });
  }

  async function handleUpdateQuestion(questionId: number, payload: QuestionPayload) {
    await api.put(`/admin/questions/${questionId}`, payload);
    setEditingQuestionId(null);
    setQuestionSuccess("Question updated.");
    await load({ silent: true });
  }

  async function handleDeleteQuestion(questionId: number) {
    setDeletingId(questionId);
    setQuestionError(null);
    try {
      await api.delete(`/admin/questions/${questionId}`);
      setPendingDeleteId(null);
      setQuestionSuccess("Question deleted.");
      await load({ silent: true });
    } catch (err) {
      setQuestionError(errorMessage(err));
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) return <PageLoader label="Loading quiz" />;

  if (!detail || !form) {
    return (
      <div className="space-y-6 animate-fade-up">
        <div>
          <h1 className="text-2xl font-bold text-navy">Quiz</h1>
          <p className="mt-1 text-sm text-muted">Settings, questions and answer options.</p>
        </div>
        <Alert tone="danger" title="Could not load the quiz">
          <div className="flex flex-wrap items-center gap-3">
            <span>{loadError ?? "This quiz could not be found."}</span>
            <Button variant="outline" size="sm" onClick={() => void load()}>
              Retry
            </Button>
            <LinkButton href="/admin/quizzes" variant="outline" size="sm">
              Back to quizzes
            </LinkButton>
          </div>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-navy">Quiz</h1>
          <p className="mt-1 text-sm text-muted">{detail.title}</p>
        </div>
        <Link
          href="/admin/quizzes"
          className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-brand transition-colors hover:bg-brand-soft"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to quizzes
        </Link>
      </div>

      {loadError ? (
        <Alert tone="warning" title="Could not refresh the quiz" onDismiss={() => setLoadError(null)}>
          <div className="flex flex-wrap items-center gap-3">
            <span>{loadError}</span>
            <Button variant="outline" size="sm" onClick={() => void load()}>
              Retry
            </Button>
          </div>
        </Alert>
      ) : null}

      {settingsSaved ? (
        <Alert tone="success" title="Quiz settings saved" onDismiss={() => setSettingsSaved(false)}>
          The quiz settings were updated successfully.
        </Alert>
      ) : null}

      {/* ------------------------------------------------------- settings */}
      <Card>
        <CardHeader title="Settings" subtitle="Passing score, attempts and visibility." />
        <form onSubmit={handleSaveSettings} className="space-y-4" noValidate>
          {settingsError ? (
            <Alert tone="danger" title="Could not save the quiz">
              {settingsError}
            </Alert>
          ) : null}

          <Input
            label="Title"
            required
            maxLength={200}
            value={form.title}
            onChange={(e) => updateForm({ title: e.target.value })}
            error={settingsErrors.title}
          />

          <Textarea
            label="Description"
            rows={2}
            maxLength={2000}
            value={form.description}
            onChange={(e) => updateForm({ description: e.target.value })}
            hint="Optional message shown above the quiz."
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Passing score (%)"
              type="number"
              min={1}
              max={100}
              step={1}
              inputMode="numeric"
              value={form.passingPercentage}
              onChange={(e) => updateForm({ passingPercentage: e.target.value })}
              error={settingsErrors.passing}
              hint="Whole number between 1 and 100."
            />
            <Input
              label="Max attempts"
              type="number"
              min={1}
              max={20}
              step={1}
              inputMode="numeric"
              value={form.maxAttempts}
              onChange={(e) => updateForm({ maxAttempts: e.target.value })}
              error={settingsErrors.attempts}
              hint="How many tries each student gets."
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Checkbox
              label="Published (quiz visible to students)"
              checked={form.published}
              onChange={(e) => updateForm({ published: e.target.checked })}
            />
            <Checkbox
              label="Required (students must pass to complete the unit)"
              checked={form.isRequired}
              onChange={(e) => updateForm({ isRequired: e.target.checked })}
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" loading={savingSettings}>
              Save settings
            </Button>
            <div className="flex flex-wrap gap-2">
              <Badge tone={form.published ? "success" : "warning"}>
                {form.published ? "Published" : "Draft"}
              </Badge>
              <Badge tone={form.isRequired ? "brand" : "neutral"}>
                {form.isRequired ? "Required" : "Optional"}
              </Badge>
            </div>
          </div>
        </form>
      </Card>

      {/* ----------------------------------------------------- questions */}
      <Card>
        <CardHeader
          title="Questions"
          subtitle={`${detail.questions.length} ${detail.questions.length === 1 ? "question" : "questions"} in this quiz`}
          action={
            <Button
              size="sm"
              onClick={() => { setQuestionSuccess(null); setQuestionError(null); setAdding(true); }}
              disabled={adding || editingQuestionId !== null}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add question
            </Button>
          }
        />

        {questionSuccess ? (
          <Alert tone="success" title="Done" className="mb-4" onDismiss={() => setQuestionSuccess(null)}>
            {questionSuccess}
          </Alert>
        ) : null}

        {questionError ? (
          <Alert tone="danger" title="Could not delete the question" className="mb-4" onDismiss={() => setQuestionError(null)}>
            {questionError}
          </Alert>
        ) : null}

        {adding ? (
          <div className="mb-4">
            <QuestionEditor onSubmit={handleAddQuestion} onCancel={() => setAdding(false)} />
          </div>
        ) : null}

        {detail.questions.length === 0 && !adding ? (
          <p className="rounded-xl border border-dashed border-line px-4 py-8 text-center text-sm text-muted">
            No questions yet. Use &ldquo;Add question&rdquo; to create the first one.
          </p>
        ) : null}

        {detail.questions.length > 0 ? (
          <div className="overflow-x-auto">
            <ol className="min-w-0 space-y-3">
              {detail.questions.map((question, index) => (
                <li key={question.id} className="min-w-0 rounded-xl border border-line p-3 sm:p-4">
                  {editingQuestionId === question.id ? (
                    <QuestionEditor
                      initial={question}
                      onSubmit={(payload) => handleUpdateQuestion(question.id, payload)}
                      onCancel={() => setEditingQuestionId(null)}
                    />
                  ) : (
                    <div>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                            Question {index + 1} · {QUESTION_TYPE_LABELS[question.questionType]} · order{" "}
                            {question.sortOrder}
                          </p>
                          <p className="mt-1 break-words font-semibold text-navy">{question.questionText}</p>
                        </div>
                        <div className="flex shrink-0 gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setQuestionSuccess(null);
                              setPendingDeleteId(null);
                              setEditingQuestionId(question.id);
                            }}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => {
                              setQuestionSuccess(null);
                              setQuestionError(null);
                              setPendingDeleteId((current) => (current === question.id ? null : question.id));
                            }}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>

                      <ul className="mt-3 space-y-1.5 overflow-x-auto">
                        {[...question.options]
                          .sort((a, b) => a.sortOrder - b.sortOrder)
                          .map((option) => (
                            <li key={option.id} className="flex items-start gap-2 text-sm">
                              {option.isCorrect ? (
                                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                              ) : (
                                <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
                              )}
                              <span className={option.isCorrect ? "font-medium text-ink" : "text-muted"}>
                                {option.optionText}
                                {option.isCorrect ? <span className="sr-only"> (correct answer)</span> : null}
                              </span>
                            </li>
                          ))}
                      </ul>

                      {question.explanation ? (
                        <p className="mt-2 text-xs leading-relaxed text-muted">Explanation: {question.explanation}</p>
                      ) : null}

                      {pendingDeleteId === question.id ? (
                        <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-danger/30 bg-danger-soft px-3 py-3">
                          <p className="text-sm font-semibold text-navy">Delete this question? This cannot be undone.</p>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              variant="danger"
                              size="sm"
                              loading={deletingId === question.id}
                              onClick={() => void handleDeleteQuestion(question.id)}
                            >
                              Yes, delete
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={deletingId === question.id}
                              onClick={() => setPendingDeleteId(null)}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  )}
                </li>
              ))}
            </ol>
          </div>
        ) : null}

        {deletingId !== null ? <Spinner className="mt-3" label="Deleting…" /> : null}
      </Card>
    </div>
  );
}
