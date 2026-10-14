"use client";

import { useEffect, useRef, useState } from "react";
import { Alert, Card, CardHeader } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { Checkbox, Input, Select, Textarea } from "@/components/ui/field";
import { api, errorMessage } from "@/lib/api-client";
import type { AdminLessonItem } from "@/types";

/**
 * Lesson create/edit form used by the admin lessons page.
 *
 * When editing, the full body is fetched from GET /admin/lessons/:lessonId
 * (the list payload only carries summary fields). A small in-session cache of
 * saved content (`getCachedLessonContent`) is kept as a fallback, and if the
 * body could not be loaded at all the editor shows a clear warning so an empty
 * box can never silently wipe a lesson.
 */

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const CONTENT_TYPES = ["article", "video", "code", "document"] as const;
type ContentType = (typeof CONTENT_TYPES)[number];

const CONTENT_TYPE_OPTIONS = CONTENT_TYPES.map((value) => ({
  value,
  label: value.charAt(0).toUpperCase() + value.slice(1),
}));

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 190);
}

function toContentType(value: string | null | undefined): ContentType {
  return (CONTENT_TYPES as readonly string[]).includes(value ?? "") ? (value as ContentType) : "article";
}

/* ----------------------------------------------------- session content cache */

const lessonContentCache = new Map<number, string>();

/** Content saved during this session for a lesson, if any. */
export function getCachedLessonContent(lessonId: number): string | undefined {
  return lessonContentCache.get(lessonId);
}

function cacheLessonContent(lessonId: number, content: string): void {
  lessonContentCache.set(lessonId, content);
}

/* ------------------------------------------------------------------- props */

interface LessonEditorProps {
  lesson?: AdminLessonItem | null;
  unitId: number;
  onSaved: () => void;
  onCancel: () => void;
  /** Known body content (from the session cache) to start the field with. */
  initialContent?: string;
}

/** The list payload, plus the body fields IF the API ever includes them. */
type AdminLessonPayload = AdminLessonItem & {
  content?: string | null;
  resourceUrl?: string | null;
};

interface FieldErrors {
  title?: string;
  slug?: string;
  sortOrder?: string;
  resourceUrl?: string;
}

export function LessonEditor({ lesson, unitId, onSaved, onCancel, initialContent }: LessonEditorProps) {
  const isEditing = Boolean(lesson);

  const [title, setTitle] = useState(lesson?.title ?? "");
  const [slug, setSlug] = useState(lesson?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(isEditing);
  const [summary, setSummary] = useState(lesson?.summary ?? "");
  const [contentType, setContentType] = useState<ContentType>(toContentType(lesson?.contentType));
  const [content, setContent] = useState(initialContent ?? "");
  const [resourceUrl, setResourceUrl] = useState("");
  const [isRequired, setIsRequired] = useState(lesson?.isRequired ?? true);
  const [sortOrder, setSortOrder] = useState(String(lesson?.sortOrder ?? 0));
  const [published, setPublished] = useState(lesson?.published ?? false);

  const [contentLoaded, setContentLoaded] = useState(initialContent !== undefined);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const contentTouchedRef = useRef(false);
  const resourceTouchedRef = useRef(false);

  /* When editing, load the full lesson body from the single-lesson endpoint
     (the list payload only carries summary fields). */
  useEffect(() => {
    if (!lesson) return;
    let cancelled = false;

    void (async () => {
      try {
        const found = await api.get<AdminLessonPayload>(`/admin/lessons/${lesson.id}`);
        if (cancelled) return;
        if (!contentTouchedRef.current && typeof found.content === "string") {
          setContent(found.content);
          cacheLessonContent(lesson.id, found.content);
          setContentLoaded(true);
        }
        if (!resourceTouchedRef.current && found.resourceUrl) {
          setResourceUrl(found.resourceUrl);
        }
      } catch {
        /* Fall back to the session cache / empty body with a visible warning. */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [lesson]);

  function handleTitleChange(value: string) {
    setTitle(value);
    if (!slugTouched) setSlug(slugify(value));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors: FieldErrors = {};
    const trimmedTitle = title.trim();
    const trimmedSlug = slug.trim();
    const trimmedResource = resourceUrl.trim();
    const orderValue = sortOrder.trim();

    if (trimmedTitle.length < 3) nextErrors.title = "Enter a title of at least 3 characters.";
    if (trimmedSlug.length < 2 || !SLUG_PATTERN.test(trimmedSlug)) {
      nextErrors.slug = "Use lowercase letters, numbers and hyphens only.";
    }
    if (orderValue === "" || !Number.isInteger(Number(orderValue)) || Number(orderValue) < 0) {
      nextErrors.sortOrder = "Enter a whole number of 0 or more.";
    }
    if (trimmedResource && !/^https:\/\//i.test(trimmedResource)) {
      nextErrors.resourceUrl = "Use an https:// link, or leave this field empty.";
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const payload = {
      unitId,
      title: trimmedTitle,
      slug: trimmedSlug,
      summary: summary.trim() ? summary.trim() : null,
      content,
      contentType,
      resourceUrl: trimmedResource ? trimmedResource : null,
      isRequired,
      sortOrder: Number(orderValue),
      published,
    };

    setSaving(true);
    setError(null);
    try {
      if (lesson) {
        await api.put(`/admin/lessons/${lesson.id}`, payload);
        cacheLessonContent(lesson.id, content);
      } else {
        const created = await api.post<{ id: number }>("/admin/lessons", payload);
        cacheLessonContent(created.id, content);
      }
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader
        title={lesson ? "Edit lesson" : "New lesson"}
        subtitle={lesson ? lesson.title : "Add a lesson to the selected unit."}
      />

      {error ? (
        <Alert tone="danger" title="Could not save the lesson" className="mb-4">
          {error}
        </Alert>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Title"
            required
            maxLength={200}
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            error={errors.title}
            placeholder="Getting started with Salesforce"
          />
          <Input
            label="Slug"
            required
            maxLength={190}
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value);
            }}
            error={errors.slug}
            hint={errors.slug ? undefined : "Lowercase letters, numbers and hyphens, e.g. getting-started."}
            placeholder="getting-started"
            spellCheck={false}
          />
        </div>

        <Textarea
          label="Summary"
          rows={2}
          maxLength={500}
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          hint="One or two sentences shown in the unit outline (max 500 characters)."
          placeholder="What will the student learn in this lesson?"
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Content type"
            value={contentType}
            onChange={(e) => setContentType(e.target.value as ContentType)}
            options={CONTENT_TYPE_OPTIONS}
          />
          <Input
            label="Sort order"
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            error={errors.sortOrder}
            hint="Lower numbers appear first."
          />
        </div>

        <Input
          label="Resource link (optional)"
          type="url"
          maxLength={500}
          value={resourceUrl}
          onChange={(e) => {
            resourceTouchedRef.current = true;
            setResourceUrl(e.target.value);
          }}
          error={errors.resourceUrl}
          hint="An https:// URL used for video, document or external lessons."
          placeholder="https://example.com/resource"
        />

        <div>
          <label htmlFor="lesson-content" className="mb-1.5 block text-sm font-semibold text-ink">
            Content
          </label>
          <textarea
            id="lesson-content"
            rows={16}
            value={content}
            onChange={(e) => {
              contentTouchedRef.current = true;
              setContent(e.target.value);
            }}
            placeholder={"## Heading\n\nWrite the lesson here.\n\n- A list item\n\n```apex\nSystem.debug('hello');\n```"}
            className="w-full resize-y rounded-xl border border-line bg-white px-3.5 py-2.5 font-mono text-sm text-ink placeholder:text-muted/70 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
          />
          <p className="mt-1.5 text-xs text-muted">
            Markdown supported: <code className="rounded bg-bg px-1">## headings</code>,{" "}
            <code className="rounded bg-bg px-1">- lists</code>,{" "}
            <code className="rounded bg-bg px-1">``` code blocks</code>.
          </p>
        </div>

        {isEditing && !contentLoaded ? (
          <Alert tone="warning" title="Lesson body could not be loaded">
            The existing content could not be downloaded right now (network or server issue), so this field starts
            empty. <strong>Saving replaces the existing content.</strong> Wait for the load to succeed, or paste the
            current content first if you are only changing the title. Anything typed during this session is remembered
            and restored the next time you edit the same lesson.
          </Alert>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <Checkbox
            label="Required lesson (students must complete it to finish the unit)"
            checked={isRequired}
            onChange={(e) => setIsRequired(e.target.checked)}
          />
          <Checkbox
            label="Published (visible to students)"
            checked={published}
            onChange={(e) => setPublished(e.target.checked)}
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <Button type="submit" loading={saving}>
            {lesson ? "Save changes" : "Create lesson"}
          </Button>
          <Button variant="outline" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}
