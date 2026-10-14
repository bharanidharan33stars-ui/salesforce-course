"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { api, ApiClientError, errorMessage } from "@/lib/api-client";
import type { AdminQuizItem, AdminUnitItem } from "@/types";
import { Alert, Badge, Card, CardHeader, EmptyState, PageLoader } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { Checkbox, Input, Select, Textarea } from "@/components/ui/field";

interface QuizPayload {
  unitId: number;
  title: string;
  description: string | null;
  passingPercentage: number;
  maxAttempts: number;
  published: boolean;
  isRequired: boolean;
}

interface SubmitError {
  tone: "danger" | "warning";
  title: string;
  message: string;
}

/* -------------------------------------------------------------- new form */

function NewQuizForm({
  units,
  unitsWithQuiz,
  onSubmit,
  onCancel,
}: {
  units: AdminUnitItem[];
  unitsWithQuiz: Set<number>;
  onSubmit: (payload: QuizPayload) => Promise<void>;
  onCancel: () => void;
}) {
  const [unitId, setUnitId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [passingPercentage, setPassingPercentage] = useState("70");
  const [maxAttempts, setMaxAttempts] = useState("3");
  const [published, setPublished] = useState(false);
  const [isRequired, setIsRequired] = useState(true);

  const [errors, setErrors] = useState<{ unitId?: string; title?: string; passing?: string; attempts?: string }>({});
  const [submitError, setSubmitError] = useState<SubmitError | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedTitle = title.trim();
    const passValue = passingPercentage.trim();
    const attemptValue = maxAttempts.trim();
    const pass = Number(passValue);
    const attempts = Number(attemptValue);
    const nextErrors: typeof errors = {};

    if (!unitId) nextErrors.unitId = "Choose a unit.";
    if (trimmedTitle.length < 3) nextErrors.title = "Enter a title of at least 3 characters.";
    if (passValue === "" || !Number.isInteger(pass) || pass < 1 || pass > 100) {
      nextErrors.passing = "Enter a whole number between 1 and 100.";
    }
    if (attemptValue === "" || !Number.isInteger(attempts) || attempts < 1 || attempts > 20) {
      nextErrors.attempts = "Enter a whole number between 1 and 20.";
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSaving(true);
    setSubmitError(null);
    try {
      await onSubmit({
        unitId: Number(unitId),
        title: trimmedTitle,
        description: description.trim() ? description.trim() : null,
        passingPercentage: pass,
        maxAttempts: attempts,
        published,
        isRequired,
      });
    } catch (err) {
      if (err instanceof ApiClientError && err.status === 409) {
        setSubmitError({ tone: "warning", title: "This unit already has a quiz", message: err.message });
      } else {
        setSubmitError({ tone: "danger", title: "Could not create the quiz", message: errorMessage(err) });
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {submitError ? (
        <Alert tone={submitError.tone} title={submitError.title} onDismiss={() => setSubmitError(null)}>
          {submitError.message}
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          label="Unit"
          required
          value={unitId}
          onChange={(e) => setUnitId(e.target.value)}
          error={errors.unitId}
          options={[
            { value: "", label: units.length === 0 ? "No units available" : "Choose a unit" },
            ...units.map((unit) => ({
              value: String(unit.id),
              label: `${unit.courseTitle} — ${unit.title}${unitsWithQuiz.has(unit.id) ? " (quiz exists)" : ""}`,
            })),
          ]}
          disabled={units.length === 0}
          hint="A unit can only hold one quiz."
        />
        <Input
          label="Title"
          required
          maxLength={200}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          error={errors.title}
          placeholder="Unit 1 knowledge check"
        />
      </div>

      <Textarea
        label="Description"
        rows={2}
        maxLength={2000}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
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
          value={passingPercentage}
          onChange={(e) => setPassingPercentage(e.target.value)}
          error={errors.passing}
          hint="Whole number between 1 and 100 (default 70)."
        />
        <Input
          label="Max attempts"
          type="number"
          min={1}
          max={20}
          step={1}
          inputMode="numeric"
          value={maxAttempts}
          onChange={(e) => setMaxAttempts(e.target.value)}
          error={errors.attempts}
          hint="How many tries each student gets (default 3)."
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Checkbox
          label="Published (quiz visible to students)"
          checked={published}
          onChange={(e) => setPublished(e.target.checked)}
        />
        <Checkbox
          label="Required (students must pass to complete the unit)"
          checked={isRequired}
          onChange={(e) => setIsRequired(e.target.checked)}
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <Button type="submit" loading={saving} disabled={units.length === 0}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Create quiz
        </Button>
        <Button variant="outline" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ page */

export default function AdminQuizzesPage() {
  const [quizzes, setQuizzes] = useState<AdminQuizItem[] | null>(null);
  const [units, setUnits] = useState<AdminUnitItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showNew, setShowNew] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [quizList, unitList] = await Promise.all([
        api.get<AdminQuizItem[]>("/admin/quizzes"),
        api.get<AdminUnitItem[]>("/admin/units"),
      ]);
      setQuizzes(quizList);
      setUnits(unitList);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const unitsWithQuiz = new Set((quizzes ?? []).map((quiz) => quiz.unitId));
  const availableUnits = (units ?? []).filter((unit) => !unitsWithQuiz.has(unit.id));

  async function handleCreate(payload: QuizPayload) {
    await api.post("/admin/quizzes", payload);
    setShowNew(false);
    setSuccess(`Quiz "${payload.title}" created. Open it to add questions.`);
    await load();
  }

  if (loading) return <PageLoader label="Loading quizzes" />;

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-navy">Quizzes</h1>
          <p className="mt-1 text-sm text-muted">One quiz per unit: set the passing score, then add questions.</p>
        </div>
        <Button
          onClick={() => { setSuccess(null); setShowNew((open) => !open); }}
          disabled={(units ?? []).length === 0}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          {showNew ? "Hide form" : "New quiz"}
        </Button>
      </div>

      {units && units.length === 0 && !error ? (
        <Alert tone="info" title="Create a unit first">
          Quizzes belong to a unit, so add a course and a unit before creating quizzes.
        </Alert>
      ) : null}

      {success ? (
        <Alert tone="success" title="Quiz created" onDismiss={() => setSuccess(null)}>
          {success}
        </Alert>
      ) : null}

      {error ? (
        <Alert tone="danger" title="Could not load quizzes">
          <div className="flex flex-wrap items-center gap-3">
            <span>{error}</span>
            <Button variant="outline" size="sm" onClick={() => void load()}>
              Retry
            </Button>
          </div>
        </Alert>
      ) : null}

      {showNew ? (
        <Card>
          <CardHeader title="New quiz" subtitle="Pick the unit, then set the rules." />
          <NewQuizForm
            units={availableUnits.length > 0 ? availableUnits : (units ?? [])}
            unitsWithQuiz={unitsWithQuiz}
            onSubmit={handleCreate}
            onCancel={() => setShowNew(false)}
          />
        </Card>
      ) : null}

      {!error && quizzes && quizzes.length === 0 ? (
        <EmptyState
          title="No quizzes yet"
          description="Create a quiz for a unit, then add multiple choice, true/false and multi-select questions."
          action={
            <Button onClick={() => { setSuccess(null); setShowNew(true); }} disabled={(units ?? []).length === 0}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              New quiz
            </Button>
          }
        />
      ) : null}

      {quizzes && quizzes.length > 0 ? (
        <Card>
          <ul className="divide-y divide-line">
            {quizzes.map((quiz) => (
              <li key={quiz.id}>
                <Link
                  href={`/admin/quizzes/${quiz.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 py-4 transition-colors first:pt-0 last:pb-0 hover:text-brand"
                >
                  <div className="min-w-0 flex-1">
                    <p className="break-words font-semibold text-navy">{quiz.title}</p>
                    <p className="mt-0.5 truncate text-xs text-muted">{quiz.unitTitle}</p>
                    {quiz.description ? (
                      <p className="mt-1 line-clamp-2 text-sm text-muted">{quiz.description}</p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <Badge tone="brand">Pass {quiz.passingPercentage}%</Badge>
                    <Badge tone="neutral">
                      {quiz.maxAttempts} {quiz.maxAttempts === 1 ? "attempt" : "attempts"}
                    </Badge>
                    <Badge tone={quiz.isRequired ? "brand" : "neutral"}>
                      {quiz.isRequired ? "Required" : "Optional"}
                    </Badge>
                    <Badge tone={quiz.published ? "success" : "warning"}>
                      {quiz.published ? "Published" : "Draft"}
                    </Badge>
                    <span className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-brand">
                      Open
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}
