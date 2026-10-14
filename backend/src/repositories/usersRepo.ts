import { execute, query } from "../config/db";
import type { Role, UserRow } from "../types/domain";

/** Users table access. All statements are parameterised. */

export async function findByEmail(email: string): Promise<UserRow | null> {
  const rows = await query<UserRow[]>("SELECT * FROM users WHERE email = ? LIMIT 1", [email.toLowerCase()]);
  return rows[0] ?? null;
}

export async function findById(id: number): Promise<UserRow | null> {
  const rows = await query<UserRow[]>("SELECT * FROM users WHERE id = ? LIMIT 1", [id]);
  return rows[0] ?? null;
}

export async function findPublicById(id: number): Promise<Omit<UserRow, "password_hash"> | null> {
  const rows = await query<Omit<UserRow, "password_hash">[]>(
    "SELECT id, full_name, email, role, status, email_verified_at, created_at, updated_at FROM users WHERE id = ? LIMIT 1",
    [id],
  );
  return rows[0] ?? null;
}

export async function createUser(input: {
  fullName: string;
  email: string;
  passwordHash: string;
  role: Role;
}): Promise<number> {
  const result = await execute(
    `INSERT INTO users (full_name, email, password_hash, role, status)
     VALUES (?, ?, ?, ?, 'active')`,
    [input.fullName, input.email.toLowerCase(), input.passwordHash, input.role],
  );
  return result.insertId;
}

export async function updatePasswordHash(userId: number, passwordHash: string): Promise<void> {
  await execute("UPDATE users SET password_hash = ? WHERE id = ?", [passwordHash, userId]);
}

export async function markEmailVerified(userId: number): Promise<void> {
  await execute("UPDATE users SET email_verified_at = COALESCE(email_verified_at, NOW()) WHERE id = ?", [userId]);
}

export async function setUserStatus(userId: number, status: "active" | "disabled"): Promise<void> {
  await execute("UPDATE users SET status = ? WHERE id = ?", [status, userId]);
}

export interface StudentListRow extends Omit<UserRow, "password_hash"> {
  enrolled_at: string | null;
  completed_at: string | null;
  certificate_number: string | null;
}

export async function listStudents(params: {
  search?: string;
  page: number;
  pageSize: number;
  sort?: "newest" | "name" | "progress";
}): Promise<{ rows: StudentListRow[]; total: number }> {
  const offset = (params.page - 1) * params.pageSize;
  const like = params.search ? `%${params.search}%` : null;

  const where = like
    ? `WHERE u.role = 'student' AND (u.full_name LIKE ? OR u.email LIKE ?)`
    : `WHERE u.role = 'student'`;

  const args: unknown[] = like ? [like, like] : [];

  const order =
    params.sort === "name" ? "u.full_name ASC" : params.sort === "progress" ? "completed_at IS NULL, completed_at DESC, u.id DESC" : "u.id DESC";

  const rows = await query<StudentListRow[]>(
    `SELECT u.id, u.full_name, u.email, u.role, u.status, u.email_verified_at, u.created_at, u.updated_at,
            e.enrolled_at, e.completed_at, c.certificate_number
       FROM users u
       LEFT JOIN enrollments e ON e.user_id = u.id AND e.course_id = 1
       LEFT JOIN certificates c ON c.user_id = u.id AND c.course_id = 1
       ${where}
       ORDER BY ${order}
       LIMIT ${Number(params.pageSize)} OFFSET ${Number(offset)}`,
    args,
  );

  const countRows = await query<{ count: number }[]>(
    `SELECT COUNT(*) AS count FROM users u ${where}`,
    args,
  );

  return { rows, total: Number(countRows[0]?.count ?? 0) };
}

export async function countUsersByRole(role: Role): Promise<number> {
  const rows = await query<{ count: number }[]>("SELECT COUNT(*) AS count FROM users WHERE role = ?", [role]);
  return Number(rows[0]?.count ?? 0);
}

export async function countActiveStudentsSince(days: number): Promise<number> {
  const rows = await query<{ count: number }[]>(
    `SELECT COUNT(DISTINCT user_id) AS count FROM lesson_progress
      WHERE last_accessed_at >= DATE_SUB(NOW(), INTERVAL ? DAY)`,
    [days],
  );
  return Number(rows[0]?.count ?? 0);
}
