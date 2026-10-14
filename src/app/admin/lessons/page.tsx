"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { api, errorMessage } from "@/lib/api-client";
import type { AdminLessonItem, AdminUnitItem } from "@/types";
import { Alert, Badge, Card, CardHeader, EmptyState, PageLoader, Spinner } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import { LessonEditor, getCachedLessonContent } from "@/components/admin/lesson-editor";

type EditorState = { mode: "new" } | { mode: "edit"; lesson: AdminLessonItem };

function LessonsView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedUnitId = searchParams.get("unitId") ?? "";

  const [units, setUnits] = useState<AdminUnitItem[] | null>(null);
  const [unitsError, setUnitsError] = useState<string | null>(null);

  const [lessons, setLessons] = useState<AdminLessonItem[] | null>(null);
  const [lessonsError, setLessonsError] = useState<string | null>(null);
  const [lessonsLoading, setLessonsLoading] = useState(true);

  const [editor, setEditor] = useState<EditorState | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const requestRef = useRef(0);

  const loadUnits = useCallback(async () => {
    setUnitsError(null);
    try {
      setUnits(await api.get<AdminUnitItem[]>("/admin/units"));
    } catch (err) {
      setUnitsError(errorMessage(err));
    }
  }, []);

  const loadLessons = useCallback(async () => {
    const requestId = ++requestRef.current;
    setLessonsLoading(true);
    setLessonsError(null);
    try {
      const rows = await api.get<AdminLessonItem[]>("/admin/lessons", {
        query: selectedUnitId ? { unitId: selectedUnitId } : undefined,
      });
      if (requestId === requestRef.current) setLessons(rows);
    } catch (err) {
      if (requestId === requestRef.current) setLessonsError(errorMessage(err));
    } finally {
      if (requestId === requestRef.current) setLessonsLoading(false);
    }
  }, [selectedUnitId]);

  useEffect(() => {
    void loadUnits();
  }, [loadUnits]);

  useEffect(() => {
    // A fresh fetch invalidates anything the editor has in flight.
    setEditor(null);
    void loadLessons();
  }, [loadLessons]);

  function handleFilterChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const value = event.target.value;
    router.replace(value ? `/admin/lessons?unitId=${value}` : "/admin/lessons", { scroll: false });
  }

  function handleSaved() {
    const wasEdit = editor?.mode === "edit";
    setEditor(null);
    setSuccess(wasEdit ? "Lesson updated." : "Lesson created.");
    void loadLessons();
  }

  const unitOptions = [
    { value: "", label: "All units" },
    ...(units ?? []).map((unit) => ({
      value: String(unit.id),
      label: `${unit.courseTitle} — ${unit.title}`,
    })),
  ];

  if (unitsError) {
    return (
      <div className="space-y-6 animate-fade-up">
        <div>
          <h1 className="text-2xl font-bold text-navy">Lessons</h1>
          <p className="mt-1 text-sm text-muted">Write and organise the lesson content of every unit.</p>
        </div>
        <Alert tone="danger" title="Could not load units">
          <div className="flex flex-wrap items-center gap-3">
            <span>{unitsError}</span>
            <Button variant="outline" size="sm" onClick={() => void loadUnits()}>
              Retry
            </Button>
          </div>
        </Alert>
      </div>
    );
  }

  if (!units) return <PageLoader label="Loading lessons" />;

  const selectedUnitNumber = Number(selectedUnitId);
  const canCreate = selectedUnitId !== "" && Number.isInteger(selectedUnitNumber) && selectedUnitNumber > 0;

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-navy">Lessons</h1>
          <p className="mt-1 text-sm text-muted">Write and organise the lesson content of every unit.</p>
        </div>
        <div className="flex flex-col items-start gap-1 sm:items-end">
          <Button onClick={() => { setSuccess(null); setEditor({ mode: "new" }); }} disabled={!canCreate}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            New lesson
          </Button>
          {!canCreate && units.length > 0 ? (
            <p className="text-xs text-muted">Choose a unit below to add a lesson.</p>
          ) : null}
        </div>
      </div>

      {success ? (
        <Alert tone="success" title="Lesson saved" onDismiss={() => setSuccess(null)}>
          {success}
        </Alert>
      ) : null}

      {editor ? (
        <LessonEditor
          key={editor.mode === "edit" ? `edit-${editor.lesson.id}` : "new"}
          lesson={editor.mode === "edit" ? editor.lesson : null}
          unitId={editor.mode === "edit" ? editor.lesson.unitId : selectedUnitNumber}
          initialContent={editor.mode === "edit" ? getCachedLessonContent(editor.lesson.id) : undefined}
          onSaved={handleSaved}
          onCancel={() => setEditor(null)}
        />
      ) : null}

      <Card>
        <CardHeader
          title="Lessons"
          subtitle={lessons ? `${lessons.length} ${lessons.length === 1 ? "lesson" : "lessons"} shown` : undefined}
        />

        <div className="mb-4 w-full sm:max-w-sm">
          <Select
            label="Filter by unit"
            value={selectedUnitId}
            onChange={handleFilterChange}
            options={unitOptions}
            hint="The selection is kept in the page URL."
          />
        </div>

        {lessonsLoading && !lessons ? <Spinner label="Loading lessons" /> : null}

        {lessonsError ? (
          <Alert tone="danger" title="Could not load lessons">
            <div className="flex flex-wrap items-center gap-3">
              <span>{lessonsError}</span>
              <Button variant="outline" size="sm" onClick={() => void loadLessons()}>
                Retry
              </Button>
            </div>
          </Alert>
        ) : null}

        {!lessonsLoading && !lessonsError && lessons && lessons.length === 0 ? (
          <EmptyState
            title={selectedUnitId ? "No lessons in this unit" : "No lessons yet"}
            description={
              selectedUnitId
                ? "Add the first lesson to this unit."
                : "Choose a unit, then create its first lesson."
            }
            action={
              <Button onClick={() => setEditor({ mode: "new" })} disabled={!canCreate}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                New lesson
              </Button>
            }
          />
        ) : null}

        {lessons && lessons.length > 0 ? (
          <div className="overflow-x-auto">
            <ul className="min-w-0 divide-y divide-line">
              {lessons.map((lesson) => (
                <li key={lesson.id} className="flex flex-wrap items-start justify-between gap-3 py-4">
                  <div className="min-w-0 flex-1">
                    <p className="break-words font-semibold text-navy">{lesson.title}</p>
                    <p className="mt-0.5 break-all font-mono text-xs text-muted">/{lesson.slug}</p>
                    <p className="mt-1 text-xs text-muted">
                      {lesson.unitTitle} · {lesson.contentType}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Badge tone={lesson.isRequired ? "brand" : "neutral"}>
                        {lesson.isRequired ? "Required" : "Optional"}
                      </Badge>
                      <Badge tone={lesson.published ? "success" : "warning"}>
                        {lesson.published ? "Published" : "Draft"}
                      </Badge>
                      <Badge tone="neutral">Order {lesson.sortOrder}</Badge>
                    </div>
                  </div>
                  <div className="shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { setSuccess(null); setEditor({ mode: "edit", lesson }); }}
                    >
                      Edit
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </Card>
    </div>
  );
}

export default function AdminLessonsPage() {
  return (
    <Suspense fallback={<PageLoader label="Loading lessons" />}>
      <LessonsView />
    </Suspense>
  );
}
