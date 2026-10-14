import { execute, query } from "../config/db";
import type { CertificateRow } from "../types/domain";

/** Certificates + e-mail delivery logs. */

export interface CertificateWithUser extends CertificateRow {
  full_name: string;
  email: string;
  email_verified_at: string | null;
  course_title: string;
  course_slug: string;
}

const SELECT_WITH_USER = `
  SELECT c.*, u.full_name, u.email, u.email_verified_at, co.title AS course_title, co.slug AS course_slug
    FROM certificates c
    JOIN users u ON u.id = c.user_id
    JOIN courses co ON co.id = c.course_id`;

export async function findCertificateById(id: number): Promise<CertificateWithUser | null> {
  const rows = await query<CertificateWithUser[]>(`${SELECT_WITH_USER} WHERE c.id = ? LIMIT 1`, [id]);
  return rows[0] ?? null;
}

export async function findCertificateByUserAndCourse(
  userId: number,
  courseId: number,
): Promise<CertificateRow | null> {
  const rows = await query<CertificateRow[]>(
    "SELECT * FROM certificates WHERE user_id = ? AND course_id = ? LIMIT 1",
    [userId, courseId],
  );
  return rows[0] ?? null;
}

export async function findByVerificationId(verificationId: string): Promise<CertificateWithUser | null> {
  if (!/^[0-9a-f]{32}$/i.test(verificationId)) return null;
  const rows = await query<CertificateWithUser[]>(`${SELECT_WITH_USER} WHERE c.verification_id = ? LIMIT 1`, [
    verificationId,
  ]);
  return rows[0] ?? null;
}

export async function insertCertificate(input: {
  userId: number;
  courseId: number;
  certificateNumber: string;
  verificationId: string;
}): Promise<number> {
  const result = await execute(
    `INSERT INTO certificates (user_id, course_id, certificate_number, verification_id)
     VALUES (?, ?, ?, ?)`,
    [input.userId, input.courseId, input.certificateNumber, input.verificationId],
  );
  return result.insertId;
}

export async function updateCertificatePdf(
  id: number,
  input: { storageKey: string | null; status: "pending" | "generated" | "failed" },
): Promise<void> {
  await execute("UPDATE certificates SET pdf_storage_key = ?, pdf_status = ? WHERE id = ?", [
    input.storageKey,
    input.status,
    id,
  ]);
}

export async function updateCertificateEmail(
  id: number,
  input: { status: "pending" | "accepted" | "failed" | "retrying"; sentAt: string | null; attempts: number },
): Promise<void> {
  await execute(
    "UPDATE certificates SET email_status = ?, email_sent_at = ?, email_attempts = ? WHERE id = ?",
    [input.status, input.sentAt, input.attempts, id],
  );
}

export async function listCertificates(params: {
  search?: string;
  page: number;
  pageSize: number;
  status?: string;
}): Promise<{ rows: CertificateWithUser[]; total: number }> {
  const offset = (params.page - 1) * params.pageSize;
  const clauses: string[] = ["1=1"];
  const args: unknown[] = [];

  if (params.search) {
    clauses.push("(c.certificate_number LIKE ? OR u.full_name LIKE ? OR u.email LIKE ?)");
    const like = `%${params.search}%`;
    args.push(like, like, like);
  }
  if (params.status) {
    clauses.push("c.email_status = ?");
    args.push(params.status);
  }

  const where = `WHERE ${clauses.join(" AND ")}`;

  const rows = await query<CertificateWithUser[]>(
    `${SELECT_WITH_USER} ${where}
      ORDER BY c.issued_at DESC
      LIMIT ${Number(params.pageSize)} OFFSET ${Number(offset)}`,
    args,
  );

  const countRows = await query<{ count: number }[]>(
    `SELECT COUNT(*) AS count FROM certificates c JOIN users u ON u.id = c.user_id ${where}`,
    args,
  );

  return { rows, total: Number(countRows[0]?.count ?? 0) };
}

export async function countCertificates(): Promise<number> {
  const rows = await query<{ count: number }[]>("SELECT COUNT(*) AS count FROM certificates");
  return Number(rows[0]?.count ?? 0);
}

// ------------------------------------------------------------- email logs

export interface EmailLogRow {
  id: number;
  user_id: number | null;
  certificate_id: number | null;
  email_type: string;
  recipient_email: string;
  status: "pending" | "accepted" | "failed" | "retrying";
  attempt_count: number;
  last_attempt_at: string | null;
  error_message: string | null;
  created_at: string;
}

export async function insertEmailLog(input: {
  userId: number | null;
  certificateId: number | null;
  emailType: string;
  recipientEmail: string;
  status: EmailLogRow["status"];
}): Promise<number> {
  const result = await execute(
    `INSERT INTO email_logs (user_id, certificate_id, email_type, recipient_email, status, attempt_count, last_attempt_at)
     VALUES (?, ?, ?, ?, ?, 1, NOW())`,
    [input.userId, input.certificateId, input.emailType, input.recipientEmail, input.status],
  );
  return result.insertId;
}

export async function updateEmailLog(
  id: number,
  input: { status: EmailLogRow["status"]; errorMessage: string | null },
): Promise<void> {
  await execute(
    "UPDATE email_logs SET status = ?, error_message = ?, attempt_count = attempt_count + 1, last_attempt_at = NOW() WHERE id = ?",
    [input.status, input.errorMessage?.slice(0, 490) ?? null, id],
  );
}

export async function listEmailLogsForCertificate(certificateId: number): Promise<EmailLogRow[]> {
  return query<EmailLogRow[]>(
    "SELECT * FROM email_logs WHERE certificate_id = ? ORDER BY id DESC",
    [certificateId],
  );
}
