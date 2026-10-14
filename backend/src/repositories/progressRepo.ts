import type { PoolConnection } from "mysql2/promise";
import { execute, query } from "../config/db";
import type { EnrollmentRow, LessonProgressRow } from "../types/domain";

/** Enrollments and per-lesson progress. */

export async function findEnrollment(userId: number, courseId: number): Promise<EnrollmentRow | null> {
  const rows = await query<EnrollmentRow[]>(
    "SELECT * FROM enrollments WHERE user_id = ? AND course_id = ? LIMIT 1",
    [userId, courseId],
  );
  return rows[0] ?? null;
}

export async function listEnrollments(userId: number): Promise<EnrollmentRow[]> {
  return query<EnrollmentRow[]>("SELECT * FROM enrollments WHERE user_id = ? ORDER BY id ASC", [userId]);
}

export async function createEnrollment(userId: number, courseId: number): Promise<number> {
  const result = await execute(
    "INSERT INTO enrollments (user_id, course_id) VALUES (?, ?)",
    [userId, courseId],
  );
  return result.insertId;
}

export async function markEnrollmentCompleted(userId: number, courseId: number): Promise<void> {
  await execute(
    "UPDATE enrollments SET status = 'completed', completed_at = COALESCE(completed_at, NOW()) WHERE user_id = ? AND course_id = ?",
    [userId, courseId],
  );
}

// -------------------------------------------------------- lesson progress

export async function findLessonProgress(userId: number, lessonId: number): Promise<LessonProgressRow | null> {
  const rows = await query<LessonProgressRow[]>(
    "SELECT * FROM lesson_progress WHERE user_id = ? AND lesson_id = ? LIMIT 1",
    [userId, lessonId],
  );
  return rows[0] ?? null;
}

/** Upsert that touches last_accessed_at without creating duplicates. */
export async function touchLesson(userId: number, lessonId: number): Promise<void> {
  await execute(
    `INSERT INTO lesson_progress (user_id, lesson_id, status, last_accessed_at)
     VALUES (?, ?, 'in_progress', NOW())
     ON DUPLICATE KEY UPDATE last_accessed_at = NOW()`,
    [userId, lessonId],
  );
}

export async function startLesson(userId: number, lessonId: number, conn?: PoolConnection): Promise<void> {
  const sql = `INSERT INTO lesson_progress (user_id, lesson_id, status, started_at, last_accessed_at)
               VALUES (?, ?, 'in_progress', NOW(), NOW())
               ON DUPLICATE KEY UPDATE last_accessed_at = NOW()`;
  const params = [userId, lessonId];
  if (conn) await conn.execute(sql, params as never[]);
  else await execute(sql, params);
}

/** Idempotent completion - never produces a second row. */
export async function completeLesson(userId: number, lessonId: number, conn?: PoolConnection): Promise<boolean> {
  const sql = `UPDATE lesson_progress
                  SET status = 'completed', completed_at = COALESCE(completed_at, NOW()), last_accessed_at = NOW()
                WHERE user_id = ? AND lesson_id = ?`;
  const params = [userId, lessonId];

  if (conn) {
    const [result] = await conn.execute(sql, params as never[]);
    return (result as { affectedRows: number }).affectedRows > 0;
  }
  const result = await execute(sql, params);
  return result.affectedRows > 0;
}

export async function listCompletedLessonIds(userId: number, lessonIds: number[]): Promise<number[]> {
  if (lessonIds.length === 0) return [];
  const placeholders = lessonIds.map(() => "?").join(",");
  const rows = await query<{ lesson_id: number }[]>(
    `SELECT lesson_id FROM lesson_progress
      WHERE user_id = ? AND status = 'completed' AND lesson_id IN (${placeholders})`,
    [userId, ...lessonIds],
  );
  return rows.map((r) => Number(r.lesson_id));
}

export async function countCompletedRequiredLessons(userId: number, courseIds: number[]): Promise<number> {
  if (courseIds.length === 0) return 0;
  const placeholders = courseIds.map(() => "?").join(",");
  const rows = await query<{ count: number }[]>(
    `SELECT COUNT(DISTINCT lp.lesson_id) AS count
       FROM lesson_progress lp
       JOIN lessons l ON l.id = lp.lesson_id
       JOIN course_units u ON u.id = l.unit_id
      WHERE lp.user_id = ?
        AND lp.status = 'completed'
        AND l.is_required = 1
        AND l.published = 1
        AND u.published = 1
        AND u.course_id IN (${placeholders})`,
    [userId, ...courseIds],
  );
  return Number(rows[0]?.count ?? 0);
}

export interface LastAccessedLesson {
  lesson_id: number;
  lesson_title: string;
  lesson_slug: string;
  unit_slug: string;
  unit_title: string;
  last_accessed_at: string;
  status: string;
}

export async function findLastAccessedLesson(userId: number, courseId: number): Promise<LastAccessedLesson | null> {
  const rows = await query<LastAccessedLesson[]>(
    `SELECT lp.lesson_id, l.title AS lesson_title, l.slug AS lesson_slug,
            u.slug AS unit_slug, u.title AS unit_title, lp.last_accessed_at, lp.status
       FROM lesson_progress lp
       JOIN lessons l ON l.id = lp.lesson_id
       JOIN course_units u ON u.id = l.unit_id
      WHERE lp.user_id = ? AND u.course_id = ?
      ORDER BY lp.last_accessed_at DESC
      LIMIT 1`,
    [userId, courseId],
  );
  return rows[0] ?? null;
}

export interface UnitProgressRow {
  unit_id: number;
  unit_title: string;
  unit_slug: string;
  required_total: number;
  required_completed: number;
}

export async function listUnitProgress(userId: number, courseId: number): Promise<UnitProgressRow[]> {
  return query<UnitProgressRow[]>(
    `SELECT u.id AS unit_id, u.title AS unit_title, u.slug AS unit_slug,
            SUM(l.is_required = 1) AS required_total,
            SUM(l.is_required = 1 AND lp.status = 'completed') AS required_completed
       FROM course_units u
       JOIN lessons l ON l.unit_id = u.id AND l.published = 1
       LEFT JOIN lesson_progress lp ON lp.lesson_id = l.id AND lp.user_id = ?
      WHERE u.course_id = ? AND u.published = 1
      GROUP BY u.id, u.title, u.slug, u.sort_order
      ORDER BY u.sort_order ASC, u.id ASC`,
    [userId, courseId],
  );
}
