"use client";

import { useId, useState } from "react";
import { Alert, Card, CardHeader } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/field";
import { errorMessage } from "@/lib/api-client";
import type { AdminQuizQuestion } from "@/types";

/**
 * Question editor used by the quiz detail page for both "add" and "edit".
 *
 * The component is deliberately presentational: it builds a validated payload
 * and hands it to `onSubmit`. Any transport error is caught here and shown
 * inline so the form keeps what the admin typed.
 */

export type QuestionType = "multiple_choice" | "true_false" | "multiple_select";

export interface QuestionOptionInput {
  optionText: string;
  isCorrect: boolean;
}

export interface QuestionPayload {
  questionText: string;
  questionType: QuestionType;
  explanation: string;
  sortOrder: number;
  options: QuestionOptionInput[];
}

export interface QuestionEditorProps {
  initial?: AdminQuizQuestion | null;
  onSubmit: (payload: QuestionPayload) => Promise<void>;
  onCancel: () => void;
}

const TYPE_OPTIONS: { value: QuestionType; label: string }[] = [
  { value: "multiple_choice", label: "Multiple choice (one answer)" },
  { value: "true_false", label: "True / false" },
  { value: "multiple_select", label: "Multiple select (many answers)" },
];

const MIN_OPTIONS = 2;
const MAX_OPTIONS = 10;
const MIN_QUESTION_LENGTH = 5;

function emptyOptions(): QuestionOptionInput[] {
  return [
    { optionText: "", isCorrect: false },
    { optionText: "", isCorrect: false },
  ];
}

function looksLikeTrueFalse(options: QuestionOptionInput[]): boolean {
  if (options.length !== 2) return false;
  const labels = options.map((o) => o.optionText.trim().toLowerCase()).sort();
  return labels[0] === "false" && labels[1] === "true";
}

export function QuestionEditor({ initial, onSubmit, onCancel }: QuestionEditorProps) {
  const groupName = useId();

  const [questionText, setQuestionText] = useState(initial?.questionText ?? "");
  const [questionType, setQuestionType] = useState<QuestionType>(initial?.questionType ?? "multiple_choice");
  const [explanation, setExplanation] = useState(initial?.explanation ?? "");
  const [sortOrder, setSortOrder] = useState(String(initial?.sortOrder ?? 0));
  const [options, setOptions] = useState<QuestionOptionInput[]>(() => {
    if (!initial) return emptyOptions();
    return [...initial.options]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((o) => ({ optionText: o.optionText, isCorrect: o.isCorrect }));
  });

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmedText = questionText.trim();
  const hasCorrect = options.some((o) => o.isCorrect);
  const optionsFilled = options.every((o) => o.optionText.trim().length > 0);
  const orderValue = sortOrder.trim();
  const orderValid = orderValue !== "" && Number.isInteger(Number(orderValue)) && Number(orderValue) >= 0;
  const canSubmit = trimmedText.length >= MIN_QUESTION_LENGTH && hasCorrect && optionsFilled && orderValid;

  function handleTypeChange(next: QuestionType) {
    setQuestionType(next);
    if (next === "true_false") {
      setOptions((prev) => (looksLikeTrueFalse(prev) ? prev : [
        { optionText: "True", isCorrect: true },
        { optionText: "False", isCorrect: false },
      ]));
    } else if (next === "multiple_choice") {
      // A single answer is the rule here: keep only the first correct option.
      setOptions((prev) => {
        let firstCorrectSeen = false;
        return prev.map((o) => {
          if (!o.isCorrect) return o;
          if (firstCorrectSeen) return { ...o, isCorrect: false };
          firstCorrectSeen = true;
          return o;
        });
      });
    }
  }

  function handleCorrectToggle(index: number) {
    setOptions((prev) => {
      if (questionType === "multiple_select") {
        return prev.map((o, i) => (i === index ? { ...o, isCorrect: !o.isCorrect } : o));
      }
      return prev.map((o, i) => ({ ...o, isCorrect: i === index }));
    });
  }

  function handleTextChange(index: number, value: string) {
    setOptions((prev) => prev.map((o, i) => (i === index ? { ...o, optionText: value } : o)));
  }

  function handleRemove(index: number) {
    setOptions((prev) => (prev.length <= MIN_OPTIONS ? prev : prev.filter((_, i) => i !== index)));
  }

  function handleAdd() {
    setOptions((prev) => (prev.length >= MAX_OPTIONS ? prev : [...prev, { optionText: "", isCorrect: false }]));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit || busy) return;
    setBusy(true);
    setError(null);
    try {
      await onSubmit({
        questionText: trimmedText,
        questionType,
        explanation: explanation.trim(),
        sortOrder: Number(orderValue),
        options: options.map((o) => ({ optionText: o.optionText.trim(), isCorrect: o.isCorrect })),
      });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const isTrueFalse = questionType === "true_false";

  return (
    <Card>
      <CardHeader
        title={initial ? "Edit question" : "Add question"}
        subtitle={
          isTrueFalse
            ? "True/false questions always have exactly two options."
            : `Between ${MIN_OPTIONS} and ${MAX_OPTIONS} options.`
        }
      />

      {error ? (
        <Alert tone="danger" title="Could not save the question" className="mb-4">
          {error}
        </Alert>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Textarea
          label="Question"
          rows={3}
          required
          maxLength={2000}
          placeholder="Which object stores customer accounts in Salesforce?"
          value={questionText}
          onChange={(e) => setQuestionText(e.target.value)}
          error={
            trimmedText.length > 0 && trimmedText.length < MIN_QUESTION_LENGTH
              ? `Questions need at least ${MIN_QUESTION_LENGTH} characters.`
              : undefined
          }
          hint={trimmedText.length < MIN_QUESTION_LENGTH ? `At least ${MIN_QUESTION_LENGTH} characters.` : undefined}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Question type"
            value={questionType}
            onChange={(e) => handleTypeChange(e.target.value as QuestionType)}
            options={TYPE_OPTIONS}
          />
          <Input
            label="Sort order"
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            error={orderValid ? undefined : "Enter a whole number of 0 or more."}
            hint="Lower numbers appear first."
          />
        </div>

        <div className="rounded-xl border border-line bg-bg/60 p-3 sm:p-4">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-ink">
              Options
              <span className="ml-2 text-xs font-normal text-muted">
                {options.length}/{MAX_OPTIONS}
              </span>
            </p>
            {!isTrueFalse ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleAdd}
                disabled={options.length >= MAX_OPTIONS}
                aria-label="Add option"
              >
                + Add option
              </Button>
            ) : null}
          </div>

          <ul className="space-y-2">
            {options.map((option, index) => (
              <li key={index} className="flex items-center gap-2">
                <input
                  type={questionType === "multiple_select" ? "checkbox" : "radio"}
                  name={groupName}
                  checked={option.isCorrect}
                  onChange={() => handleCorrectToggle(index)}
                  aria-label={`Mark option ${index + 1} as correct`}
                  className="h-5 w-5 shrink-0 accent-[#1675D1]"
                />
                <input
                  type="text"
                  value={option.optionText}
                  maxLength={500}
                  onChange={(e) => handleTextChange(index, e.target.value)}
                  placeholder={isTrueFalse ? (index === 0 ? "True" : "False") : `Option ${index + 1}`}
                  aria-label={`Option ${index + 1} text`}
                  className="h-11 min-w-0 flex-1 rounded-xl border border-line bg-white px-3 text-[15px] text-ink placeholder:text-muted/70 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                />
                {!isTrueFalse ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemove(index)}
                    disabled={options.length <= MIN_OPTIONS}
                    aria-label={`Remove option ${index + 1}`}
                    className="shrink-0 px-2 text-muted hover:text-danger"
                  >
                    ✕
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>

          <p className="mt-2 text-xs text-muted">
            Tick the correct answer{questionType === "multiple_select" ? "s" : ""} using the control on the left.
          </p>
          {!hasCorrect ? (
            <p role="alert" className="mt-2 text-xs font-medium text-danger">
              Mark at least one option as correct before saving.
            </p>
          ) : null}
          {!optionsFilled ? (
            <p role="alert" className="mt-1 text-xs font-medium text-danger">
              Every option needs text.
            </p>
          ) : null}
        </div>

        <Textarea
          label="Explanation (optional)"
          rows={3}
          maxLength={2000}
          placeholder="Shown to the student after they submit an answer."
          value={explanation}
          onChange={(e) => setExplanation(e.target.value)}
        />

        <div className="flex flex-wrap gap-3">
          <Button type="submit" loading={busy} disabled={!canSubmit}>
            {initial ? "Save question" : "Add question"}
          </Button>
          <Button variant="outline" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}
