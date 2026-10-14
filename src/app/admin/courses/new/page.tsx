"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";
import { api, errorMessage } from "@/lib/api-client";
import { Alert, Card, CardHeader } from "@/components/ui/primitives";
import { Button, LinkButton } from "@/components/ui/button";
import { Checkbox, Input, Textarea } from "@/components/ui/field";

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 190);
}

export default function NewCoursePage() {
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [description, setDescription] = useState("");
  const [published, setPublished] = useState(false);

  const [errors, setErrors] = useState<{ title?: string; slug?: string }>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedTitle, setSavedTitle] = useState<string | null>(null);

  function handleTitleChange(value: string) {
    setTitle(value);
    if (!slugTouched) setSlug(slugify(value));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedTitle = title.trim();
    const trimmedSlug = slug.trim();
    const nextErrors: { title?: string; slug?: string } = {};
    if (trimmedTitle.length < 3) nextErrors.title = "Enter a title of at least 3 characters.";
    if (trimmedSlug.length < 2 || !SLUG_PATTERN.test(trimmedSlug)) {
      nextErrors.slug = "Use lowercase letters, numbers and hyphens only.";
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSaving(true);
    setError(null);
    try {
      await api.post("/admin/courses", {
        title: trimmedTitle,
        slug: trimmedSlug,
        description: description.trim() ? description.trim() : null,
        published,
      });
      setSavedTitle(trimmedTitle);
      setTitle("");
      setSlug("");
      setSlugTouched(false);
      setDescription("");
      setPublished(false);
      setErrors({});
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-navy">New course</h1>
          <p className="mt-1 text-sm text-muted">Courses hold the units, lessons and quizzes students work through.</p>
        </div>
        <Link
          href="/admin/courses"
          className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-brand transition-colors hover:bg-brand-soft"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to courses
        </Link>
      </div>

      {savedTitle ? (
        <Alert
          tone="success"
          title="Course created"
          onDismiss={() => setSavedTitle(null)}
        >
          <div className="flex flex-wrap items-center gap-3">
            <span>
              <strong>{savedTitle}</strong> was created successfully.
            </span>
            <LinkButton href="/admin/courses" variant="outline" size="sm">
              Back to courses
            </LinkButton>
          </div>
        </Alert>
      ) : null}

      {error ? (
        <Alert tone="danger" title="Could not create the course">
          {error}
        </Alert>
      ) : null}

      <Card>
        <CardHeader title="Course details" subtitle="The slug becomes the public URL for the course." />
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <Input
            label="Title"
            required
            maxLength={200}
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            error={errors.title}
            placeholder="Salesforce CRM and Platform"
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
            hint={errors.slug ? undefined : "Lowercase letters, numbers and hyphens, e.g. salesforce-crm-and-platform."}
            placeholder="salesforce-crm-and-platform"
            spellCheck={false}
          />

          <Textarea
            label="Description"
            rows={4}
            maxLength={5000}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            hint="Shown on the course overview. Leave empty if you do not need one."
            placeholder="What does this course teach?"
          />

          <Checkbox
            label="Published (visible to students)"
            checked={published}
            onChange={(e) => setPublished(e.target.checked)}
          />

          <div className="flex flex-wrap gap-3">
            <Button type="submit" loading={saving}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Create course
            </Button>
            <LinkButton href="/admin/courses" variant="outline">
              Cancel
            </LinkButton>
          </div>
        </form>
      </Card>
    </div>
  );
}
