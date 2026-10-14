"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { api, errorMessage } from "@/lib/api-client";
import type { AdminCourseItem, AdminLessonItem, AdminUnitItem } from "@/types";
import { Alert, Badge, Card, CardHeader, EmptyState, PageLoader } from "@/components/ui/primitives";
import { Button, LinkButton } from "@/components/ui/button";
import { Checkbox, Input, Select, Textarea } from "@/components/ui/field";

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

interface UnitPayload {
  courseId: number;
  title: string;
  slug: string;
  description: string | null;
  sortOrder: number;
  published: boolean;
}

interface UnitFormInitial {
  courseId: string;
  title: string;
  slug: string;
  description: string;
  sortOrder: string;
  published: boolean;
}

interface UnitFormErrors {
  courseId?: string;
  title?: string;
  slug?: string;
  sortOrder?: string;
}

/* ------------------------------------------------------------------ form */

function UnitForm({
  courses,
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  courses: AdminCourseItem[];
  initial?: UnitFormInitial;
  submitLabel: string;
  onSubmit: (payload: UnitPayload) => Promise<void>;
  onCancel: () => void;
}) {
  const [courseId, setCourseId] = useState(initial?.courseId ?? "");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(initial?.slug));
  const [description, setDescription] = useState(initial?.description ?? "");
  const [sortOrder, setSortOrder] = useState(initial?.sortOrder ?? "0");
  const [published, setPublished] = useState(initial?.published ?? false);

  const [errors, setErrors] = useState<UnitFormErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function handleTitleChange(value: string) {
    setTitle(value);
    if (!slugTouched) setSlug(slugify(value));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedTitle = title.trim();
    const trimmedSlug = slug.trim();
    const orderValue = sortOrder.trim();
    const nextErrors: UnitFormErrors = {};

    if (!courseId) nextErrors.courseId = "Choose a course.";
    if (trimmedTitle.length < 3) nextErrors.title = "Enter a title of at least 3 characters.";
    if (trimmedSlug.length < 2 || !SLUG_PATTERN.test(trimmedSlug)) {
      nextErrors.slug = "Use lowercase letters, numbers and hyphens only.";
    }
    if (orderValue === "" || !Number.isInteger(Number(orderValue)) || Number(orderValue) < 0) {
      nextErrors.sortOrder = "Enter a whole number of 0 or more.";
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSaving(true);
    setError(null);
    try {
      await onSubmit({
        courseId: Number(courseId),
        title: trimmedTitle,
        slug: trimmedSlug,
        description: description.trim() ? description.trim() : null,
        sortOrder: Number(orderValue),
        published,
      });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {error ? (
        <Alert tone="danger" title="Could not save the unit">
          {error}
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          label="Course"
          required
          value={courseId}
          onChange={(e) => setCourseId(e.target.value)}
          error={errors.courseId}
          options={[
            { value: "", label: courses.length === 0 ? "No courses available" : "Choose a course" },
            ...courses.map((course) => ({ value: String(course.id), label: course.title })),
          ]}
          disabled={courses.length === 0}
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
          hint="Lower numbers appear first inside the course."
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Title"
          required
          maxLength={200}
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          error={errors.title}
          placeholder="Introduction to Salesforce"
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
          hint={errors.slug ? undefined : "Lowercase letters, numbers and hyphens."}
          placeholder="introduction-to-salesforce"
          spellCheck={false}
        />
      </div>

      <Textarea
        label="Description"
        rows={2}
        maxLength={5000}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        hint="Optional summary shown in the course outline."
      />

      <Checkbox
        label="Published (unit visible to students)"
        checked={published}
        onChange={(e) => setPublished(e.target.checked)}
      />

      <div className="flex flex-wrap gap-3">
        <Button type="submit" loading={saving} disabled={courses.length === 0}>
          {submitLabel}
        </Button>
        <Button variant="outline" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ page */

interface Group {
  courseId: number;
  title: string;
  units: AdminUnitItem[];
}

export default function AdminUnitsPage() {
  const [courses, setCourses] = useState<AdminCourseItem[]>([]);
  const [units, setUnits] = useState<AdminUnitItem[]>([]);
  const [lessonCounts, setLessonCounts] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showNew, setShowNew] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) setLoading(true);
    setError(null);
    try {
      const [coursesRes, unitsRes, lessonsRes] = await Promise.allSettled([
        api.get<AdminCourseItem[]>("/admin/courses"),
        api.get<AdminUnitItem[]>("/admin/units"),
        api.get<AdminLessonItem[]>("/admin/lessons"),
      ]);

      if (coursesRes.status === "rejected") throw coursesRes.reason;
      if (unitsRes.status === "rejected") throw unitsRes.reason;

      setCourses(coursesRes.value);
      setUnits(unitsRes.value);

      // Lesson counts come from the real lesson list (the units payload has none).
      if (lessonsRes.status === "fulfilled") {
        const counts: Record<number, number> = {};
        for (const lesson of lessonsRes.value) {
          counts[lesson.unitId] = (counts[lesson.unitId] ?? 0) + 1;
        }
        setLessonCounts(counts);
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const groups: Group[] = [];
  const byId = new Map<number, Group>();
  for (const course of courses) {
    const group: Group = { courseId: course.id, title: course.title, units: [] };
    byId.set(course.id, group);
    groups.push(group);
  }
  for (const unit of units) {
    let group = byId.get(unit.courseId);
    if (!group) {
      group = { courseId: unit.courseId, title: unit.courseTitle || `Course #${unit.courseId}`, units: [] };
      byId.set(unit.courseId, group);
      groups.push(group);
    }
    group.units.push(unit);
  }
  for (const group of groups) group.units.sort((a, b) => a.sortOrder - b.sortOrder);

  async function handleCreate(payload: UnitPayload) {
    await api.post("/admin/units", payload);
    setShowNew(false);
    setSuccess(`Unit "${payload.title}" created.`);
    await load({ silent: true });
  }

  async function handleUpdate(unitId: number, payload: UnitPayload) {
    await api.put(`/admin/units/${unitId}`, payload);
    setEditingId(null);
    setSuccess(`Unit "${payload.title}" updated.`);
    await load({ silent: true });
  }

  if (loading) return <PageLoader label="Loading units" />;

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-navy">Units</h1>
          <p className="mt-1 text-sm text-muted">Units are the chapters of each course, grouped by course below.</p>
        </div>
        <Button onClick={() => { setSuccess(null); setShowNew((open) => !open); }} disabled={courses.length === 0}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          {showNew ? "Hide form" : "New unit"}
        </Button>
      </div>

      {courses.length === 0 && !error ? (
        <Alert tone="info" title="Create a course first">
          Units belong to a course, so add a course before creating units.
        </Alert>
      ) : null}

      {success ? (
        <Alert tone="success" title="Unit saved" onDismiss={() => setSuccess(null)}>
          {success}
        </Alert>
      ) : null}

      {error ? (
        <Alert tone="danger" title="Could not load units">
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
          <CardHeader title="New unit" subtitle="Choose the course, then describe the unit." />
          <UnitForm
            courses={courses}
            submitLabel="Create unit"
            onSubmit={handleCreate}
            onCancel={() => setShowNew(false)}
          />
        </Card>
      ) : null}

      {!error && groups.length === 0 ? (
        <EmptyState
          title="No courses yet"
          description="Units are added to a course. Create the first course to get started."
          action={
            <LinkButton href="/admin/courses/new" variant="outline">
              New course
            </LinkButton>
          }
        />
      ) : null}

      {groups.map((group) => (
        <Card key={group.courseId}>
          <CardHeader
            title={
              <Link href={`/admin/courses/${group.courseId}`} className="hover:text-brand">
                {group.title}
              </Link>
            }
            subtitle={`${group.units.length} ${group.units.length === 1 ? "unit" : "units"}`}
          />

          {group.units.length === 0 ? (
            <p className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-sm text-muted">
              No units in this course yet. Use &ldquo;New unit&rdquo; to add one.
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {group.units.map((unit) => (
                <li key={unit.id} className="py-4 first:pt-0 last:pb-0">
                  {editingId === unit.id ? (
                    <UnitForm
                      courses={courses}
                      initial={{
                        courseId: String(unit.courseId),
                        title: unit.title,
                        slug: unit.slug,
                        description: unit.description ?? "",
                        sortOrder: String(unit.sortOrder),
                        published: unit.published,
                      }}
                      submitLabel="Save changes"
                      onSubmit={(payload) => handleUpdate(unit.id, payload)}
                      onCancel={() => setEditingId(null)}
                    />
                  ) : (
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="break-words font-semibold text-navy">{unit.title}</p>
                        <p className="mt-0.5 break-all font-mono text-xs text-muted">/{unit.slug}</p>
                        {unit.description ? (
                          <p className="mt-1 line-clamp-2 text-sm text-muted">{unit.description}</p>
                        ) : null}
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <Badge tone={unit.published ? "success" : "warning"}>
                            {unit.published ? "Published" : "Draft"}
                          </Badge>
                          <Badge tone="neutral">Order {unit.sortOrder}</Badge>
                          {lessonCounts[unit.id] !== undefined ? (
                            <Badge tone="brand">
                              {lessonCounts[unit.id]} {lessonCounts[unit.id] === 1 ? "lesson" : "lessons"}
                            </Badge>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-wrap gap-2">
                        <Button variant="outline" size="sm" onClick={() => { setSuccess(null); setEditingId(unit.id); }}>
                          Edit
                        </Button>
                        <LinkButton href={`/admin/lessons?unitId=${unit.id}`} variant="ghost" size="sm">
                          Lessons
                        </LinkButton>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      ))}
    </div>
  );
}
