import { execute, query } from "../config/db";
import type { CourseRow, LessonRow, UnitRow } from "../types/domain";

/** Courses, units and lessons (published curriculum + admin queries). */

// ---------------------------------------------------------------- courses

export async function findPublishedCourseBySlug(slug: string): Promise<CourseRow | null> {
  const rows = await query<CourseRow[]>("SELECT * FROM courses WHERE slug = ? AND published = 1 LIMIT 1", [slug]);
  return rows[0] ?? null;
}

export async function findCourseById(id: number): Promise<CourseRow | null> {
  const rows = await query<CourseRow[]>("SELECT * FROM courses WHERE id = ? LIMIT 1", [id]);
  return rows[0] ?? null;
}

export async function listPublishedCourses(): Promise<CourseRow[]> {
  return query<CourseRow[]>("SELECT * FROM courses WHERE published = 1 ORDER BY id ASC");
}

export async function listAllCourses(): Promise<CourseRow[]> {
  return query<CourseRow[]>("SELECT * FROM courses ORDER BY id ASC");
}

export async function insertCourse(input: {
  title: string;
  slug: string;
  description: string | null;
  published: boolean;
}): Promise<number> {
  const result = await execute(
    "INSERT INTO courses (title, slug, description, published) VALUES (?, ?, ?, ?)",
    [input.title, input.slug, input.description, input.published ? 1 : 0],
  );
  return result.insertId;
}

export async function updateCourse(
  id: number,
  input: { title: string; slug: string; description: string | null; published: boolean },
): Promise<void> {
  await execute("UPDATE courses SET title = ?, slug = ?, description = ?, published = ? WHERE id = ?", [
    input.title,
    input.slug,
    input.description,
    input.published ? 1 : 0,
    id,
  ]);
}

// ------------------------------------------------------------------ units

export async function listPublishedUnits(courseId: number): Promise<UnitRow[]> {
  return query<UnitRow[]>(
    "SELECT * FROM course_units WHERE course_id = ? AND published = 1 ORDER BY sort_order ASC, id ASC",
    [courseId],
  );
}

export async function listAllUnits(courseId?: number): Promise<UnitRow[]> {
  if (courseId) {
    return query<UnitRow[]>(
      "SELECT * FROM course_units WHERE course_id = ? ORDER BY sort_order ASC, id ASC",
      [courseId],
    );
  }
  return query<UnitRow[]>("SELECT * FROM course_units ORDER BY sort_order ASC, id ASC");
}

export async function findUnitBySlug(slug: string, courseId?: number): Promise<UnitRow | null> {
  const rows = courseId
    ? await query<UnitRow[]>("SELECT * FROM course_units WHERE slug = ? AND course_id = ? LIMIT 1", [slug, courseId])
    : await query<UnitRow[]>("SELECT * FROM course_units WHERE slug = ? LIMIT 1", [slug]);
  return rows[0] ?? null;
}

export async function findUnitById(id: number): Promise<UnitRow | null> {
  const rows = await query<UnitRow[]>("SELECT * FROM course_units WHERE id = ? LIMIT 1", [id]);
  return rows[0] ?? null;
}

export async function insertUnit(input: {
  courseId: number;
  title: string;
  slug: string;
  description: string | null;
  sortOrder: number;
  published: boolean;
}): Promise<number> {
  const result = await execute(
    `INSERT INTO course_units (course_id, title, slug, description, sort_order, published)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [input.courseId, input.title, input.slug, input.description, input.sortOrder, input.published ? 1 : 0],
  );
  return result.insertId;
}

export async function updateUnit(
  id: number,
  input: { title: string; slug: string; description: string | null; sortOrder: number; published: boolean },
): Promise<void> {
  await execute(
    "UPDATE course_units SET title = ?, slug = ?, description = ?, sort_order = ?, published = ? WHERE id = ?",
    [input.title, input.slug, input.description, input.sortOrder, input.published ? 1 : 0, id],
  );
}

// ---------------------------------------------------------------- lessons

export async function listPublishedLessons(unitId: number): Promise<LessonRow[]> {
  return query<LessonRow[]>(
    "SELECT * FROM lessons WHERE unit_id = ? AND published = 1 ORDER BY sort_order ASC, id ASC",
    [unitId],
  );
}

export async function listLessonsByUnits(unitIds: number[]): Promise<LessonRow[]> {
  if (unitIds.length === 0) return [];
  const placeholders = unitIds.map(() => "?").join(",");
  return query<LessonRow[]>(
    `SELECT * FROM lessons WHERE unit_id IN (${placeholders}) AND published = 1 ORDER BY unit_id, sort_order ASC, id ASC`,
    unitIds,
  );
}

export async function listAllLessons(unitId?: number): Promise<LessonRow[]> {
  if (unitId) {
    return query<LessonRow[]>(
      "SELECT * FROM lessons WHERE unit_id = ? ORDER BY sort_order ASC, id ASC",
      [unitId],
    );
  }
  return query<LessonRow[]>("SELECT * FROM lessons ORDER BY unit_id, sort_order ASC, id ASC");
}

export async function findLessonById(id: number): Promise<LessonRow | null> {
  const rows = await query<LessonRow[]>("SELECT * FROM lessons WHERE id = ? LIMIT 1", [id]);
  return rows[0] ?? null;
}

export async function findPublishedLessonBySlug(unitId: number, slug: string): Promise<LessonRow | null> {
  const rows = await query<LessonRow[]>(
    "SELECT * FROM lessons WHERE unit_id = ? AND slug = ? AND published = 1 LIMIT 1",
    [unitId, slug],
  );
  return rows[0] ?? null;
}

export async function insertLesson(input: {
  unitId: number;
  title: string;
  slug: string;
  summary: string | null;
  content: string | null;
  contentType: LessonRow["content_type"];
  resourceUrl: string | null;
  isRequired: boolean;
  sortOrder: number;
  published: boolean;
}): Promise<number> {
  const result = await execute(
    `INSERT INTO lessons
       (unit_id, title, slug, summary, content, content_type, resource_url, is_required, sort_order, published)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.unitId,
      input.title,
      input.slug,
      input.summary,
      input.content,
      input.contentType,
      input.resourceUrl,
      input.isRequired ? 1 : 0,
      input.sortOrder,
      input.published ? 1 : 0,
    ],
  );
  return result.insertId;
}

export async function updateLesson(
  id: number,
  input: {
    title: string;
    slug: string;
    summary: string | null;
    content: string | null;
    contentType: LessonRow["content_type"];
    resourceUrl: string | null;
    isRequired: boolean;
    sortOrder: number;
    published: boolean;
  },
): Promise<void> {
  await execute(
    `UPDATE lessons
        SET title = ?, slug = ?, summary = ?, content = ?, content_type = ?, resource_url = ?,
            is_required = ?, sort_order = ?, published = ?
      WHERE id = ?`,
    [
      input.title,
      input.slug,
      input.summary,
      input.content,
      input.contentType,
      input.resourceUrl,
      input.isRequired ? 1 : 0,
      input.sortOrder,
      input.published ? 1 : 0,
      id,
    ],
  );
}

/** Neighbouring published lesson in the same unit (for prev/next navigation). */
export async function findAdjacentLesson(
  unitId: number,
  sortOrder: number,
  direction: "prev" | "next",
): Promise<LessonRow | null> {
  const op = direction === "prev" ? "<" : ">";
  const order = direction === "prev" ? "DESC" : "ASC";
  const rows = await query<LessonRow[]>(
    `SELECT * FROM lessons
      WHERE unit_id = ? AND published = 1 AND sort_order ${op} ?
      ORDER BY sort_order ${order} LIMIT 1`,
    [unitId, sortOrder],
  );
  return rows[0] ?? null;
}

/** First published lesson of the next unit (for "next unit" navigation). */
export async function findNextUnitFirstLesson(currentUnit: UnitRow): Promise<{ unit: UnitRow; lesson: LessonRow } | null> {
  const rows = await query<UnitRow[]>(
    `SELECT * FROM course_units
      WHERE course_id = ? AND published = 1 AND (sort_order > ? OR (sort_order = ? AND id > ?))
      ORDER BY sort_order ASC, id ASC LIMIT 1`,
    [currentUnit.course_id, currentUnit.sort_order, currentUnit.sort_order, currentUnit.id],
  );
  const nextUnit = rows[0];
  if (!nextUnit) return null;
  const lessons = await listPublishedLessons(nextUnit.id);
  if (lessons.length === 0) return null;
  return { unit: nextUnit, lesson: lessons[0] };
}
