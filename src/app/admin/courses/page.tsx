"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { api, errorMessage } from "@/lib/api-client";
import type { AdminCourseItem } from "@/types";
import { Alert, Badge, Card, EmptyState, PageLoader, Skeleton } from "@/components/ui/primitives";
import { Button, LinkButton } from "@/components/ui/button";

export default function AdminCoursesPage() {
  const [courses, setCourses] = useState<AdminCourseItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setCourses(await api.get<AdminCourseItem[]>("/admin/courses"));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-navy">Courses</h1>
          <p className="mt-1 text-sm text-muted">Create courses, then fill them with units, lessons and quizzes.</p>
        </div>
        <LinkButton href="/admin/courses/new">
          <Plus className="h-4 w-4" aria-hidden="true" />
          New course
        </LinkButton>
      </div>

      {error ? (
        <Alert tone="danger" title="Could not load courses">
          <div className="flex flex-wrap items-center gap-3">
            <span>{error}</span>
            <Button variant="outline" size="sm" onClick={() => void load()}>
              Retry
            </Button>
          </div>
        </Alert>
      ) : null}

      {loading && !courses ? <PageLoader label="Loading courses" /> : null}

      {!loading && !error && courses && courses.length === 0 ? (
        <EmptyState
          title="No courses yet"
          description="Create the first course to start building the academy curriculum."
          action={
            <LinkButton href="/admin/courses/new" variant="outline">
              <Plus className="h-4 w-4" aria-hidden="true" />
              New course
            </LinkButton>
          }
        />
      ) : null}

      {!loading && courses && courses.length > 0 ? (
        <Card>
          <ul className="divide-y divide-line">
            {courses.map((course) => (
              <li key={course.id}>
                <Link
                  href={`/admin/courses/${course.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 py-4 transition-colors first:pt-0 last:pb-0 hover:text-brand"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-navy">{course.title}</p>
                    <p className="mt-0.5 truncate font-mono text-xs text-muted">/{course.slug}</p>
                    {course.description ? (
                      <p className="mt-1 line-clamp-2 text-sm text-muted">{course.description}</p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <Badge tone="neutral">
                      {course.unitCount} {course.unitCount === 1 ? "unit" : "units"}
                    </Badge>
                    <Badge tone={course.published ? "success" : "warning"}>
                      {course.published ? "Published" : "Draft"}
                    </Badge>
                    <span className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-brand">
                      Edit
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {loading && courses ? (
        <Card>
          <Skeleton className="mb-3 h-6 w-2/3" />
          <Skeleton className="mb-3 h-6 w-1/2" />
          <Skeleton className="h-6 w-3/5" />
        </Card>
      ) : null}
    </div>
  );
}
