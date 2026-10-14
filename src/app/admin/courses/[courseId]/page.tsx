"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";
import { api, errorMessage } from "@/lib/api-client";
import type { AdminCourseItem } from "@/types";
import { Alert, Badge, Card, CardHeader, PageLoader } from "@/components/ui/primitives";
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

export default function EditCoursePage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = use(params);
  const numericId = Number(courseId);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [course, setCourse] = useState<AdminCourseItem | null>(null);

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(true);
  const [description, setDescription] = useState("");
  const [published, setPublished] = useState(false);

  const [errors, setErrors] = useState<{ title?: string; slug?: string }>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const courses = await api.get<AdminCourseItem[]>("/admin/courses");
      const found = courses.find((item) => item.id === numericId);
      if (!found) {
        setLoadError("This course could not be found. It may have been deleted.");
        setCourse(null);
        return;
      }
      setCourse(found);
      setTitle(found.title);
      setSlug(found.slug);
      setSlugTouched(true);
      setDescription(found.description ?? "");
      setPublished(found.published);
      setSaved(false);
    } catch (err) {
      setLoadError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [numericId]);

  useEffect(() => {
    if (!Number.isFinite(numericId)) {
      setLoadError("Invalid course id.");
      setLoading(false);
      return;
    }
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);

  function handleTitleChange(value: string) {
    setTitle(value);
    if (!slugTouched) setSlug(slugify(value));
    setSaved(false);
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
    setSaveError(null);
    try {
      const payload = {
        title: trimmedTitle,
        slug: trimmedSlug,
        description: description.trim() ? description.trim() : null,
        published,
      };
      await api.put(`/admin/courses/${numericId}`, payload);
      setCourse((prev) => (prev ? { ...prev, ...payload } : prev));
      setSaved(true);
    } catch (err) {
      setSaveError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <PageLoader label="Loading course" />;

  if (loadError || !course) {
    return (
      <div className="space-y-6 animate-fade-up">
        <div>
          <h1 className="text-2xl font-bold text-navy">Edit course</h1>
          <p className="mt-1 text-sm text-muted">Update the course details, publication state and description.</p>
        </div>
        <Alert tone="danger" title="Could not load the course">
          <div className="flex flex-wrap items-center gap-3">
            <span>{loadError ?? "This course could not be found."}</span>
            <Button variant="outline" size="sm" onClick={() => void load()}>
              Retry
            </Button>
            <LinkButton href="/admin/courses" variant="outline" size="sm">
              Back to courses
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
          <h1 className="text-2xl font-bold text-navy">Edit course</h1>
          <p className="mt-1 text-sm text-muted">
            {course.title}
            <span className="ml-2 font-mono text-xs">/{course.slug}</span>
          </p>
        </div>
        <Link
          href="/admin/courses"
          className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-brand transition-colors hover:bg-brand-soft"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to courses
        </Link>
      </div>

      {saved ? (
        <Alert tone="success" title="Course saved" onDismiss={() => setSaved(false)}>
          <div className="flex flex-wrap items-center gap-3">
            <span>
              <strong>{title.trim()}</strong> was updated successfully.
            </span>
            <LinkButton href="/admin/courses" variant="outline" size="sm">
              Back to courses
            </LinkButton>
          </div>
        </Alert>
      ) : null}

      {saveError ? (
        <Alert tone="danger" title="Could not save the course">
          {saveError}
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
          />

          <Input
            label="Slug"
            required
            maxLength={190}
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value);
              setSaved(false);
            }}
            error={errors.slug}
            hint={errors.slug ? undefined : "Lowercase letters, numbers and hyphens, e.g. salesforce-crm-and-platform."}
            spellCheck={false}
          />

          <Textarea
            label="Description"
            rows={4}
            maxLength={5000}
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              setSaved(false);
            }}
            hint="Shown on the course overview. Leave empty if you do not need one."
          />

          <Checkbox
            label="Published (visible to students)"
            checked={published}
            onChange={(e) => {
              setPublished(e.target.checked);
              setSaved(false);
            }}
          />

          <div className="flex flex-wrap gap-3">
            <Button type="submit" loading={saving}>
              <Save className="h-4 w-4" aria-hidden="true" />
              Save changes
            </Button>
            <LinkButton href="/admin/courses" variant="outline">
              Back to courses
            </LinkButton>
          </div>
        </form>
      </Card>

      <Card>
        <CardHeader title="Status" subtitle="Where this course stands right now." />
        <div className="flex flex-wrap items-center gap-3">
          <Badge tone={course.published ? "success" : "warning"}>
            {course.published ? "Published" : "Draft"}
          </Badge>
          <Badge tone="neutral">
            {course.unitCount} {course.unitCount === 1 ? "unit" : "units"}
          </Badge>
        </div>
      </Card>
    </div>
  );
}
