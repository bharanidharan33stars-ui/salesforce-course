import { execute, query } from "../config/db";

/** Academy settings (key/value) and the administrative audit log. */

export const DEFAULT_SETTINGS: Record<string, string> = {
  academy_name: "Salesforce Learning Academy",
  academy_logo_text: "SLA",
  support_email: "support@localhost",
  course_title: "Salesforce CRM and Platform",
  certificate_signer: "The Salesforce Learning Academy Team",
  certificate_footer_note:
    "Academy-issued course-completion certificate. This is not an official Salesforce certification.",
  lesson_completion_rule: "manual", // manual | auto
  require_email_verification_for_certificate: "false",
  email_verification_required_for_login: "false",
  quiz_default_passing_percentage: "70",
  ai_assistant_enabled: "false",
};

export async function getAllSettings(): Promise<Record<string, string>> {
  const rows = await query<{ setting_key: string; setting_value: string | null }[]>(
    "SELECT setting_key, setting_value FROM academy_settings",
  );
  const merged: Record<string, string> = { ...DEFAULT_SETTINGS };
  for (const row of rows) merged[row.setting_key] = row.setting_value ?? "";
  return merged;
}

export async function getSetting(key: string): Promise<string | null> {
  const rows = await query<{ setting_value: string | null }[]>(
    "SELECT setting_value FROM academy_settings WHERE setting_key = ? LIMIT 1",
    [key],
  );
  if (rows.length === 0) return DEFAULT_SETTINGS[key] ?? null;
  return rows[0].setting_value ?? "";
}

export async function setSettings(values: Record<string, string>): Promise<void> {
  for (const [key, value] of Object.entries(values)) {
    await execute(
      `INSERT INTO academy_settings (setting_key, setting_value) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
      [key, value],
    );
  }
}

export async function audit(input: {
  adminUserId: number | null;
  action: string;
  entityType?: string;
  entityId?: string | number;
  details?: unknown;
  ipAddress?: string | null;
}): Promise<void> {
  await execute(
    `INSERT INTO admin_audit_logs (admin_user_id, action, entity_type, entity_id, details, ip_address)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      input.adminUserId,
      input.action,
      input.entityType ?? null,
      input.entityId != null ? String(input.entityId) : null,
      input.details ? JSON.stringify(input.details).slice(0, 2000) : null,
      input.ipAddress ?? null,
    ],
  );
}

export interface AuditRow {
  id: number;
  admin_user_id: number | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  details: string | null;
  ip_address: string | null;
  created_at: string;
}

export async function listAuditLogs(limit = 50): Promise<AuditRow[]> {
  return query<AuditRow[]>(
    `SELECT a.*, u.full_name AS admin_name
       FROM admin_audit_logs a
       LEFT JOIN users u ON u.id = a.admin_user_id
      ORDER BY a.id DESC LIMIT ${Number(limit)}`,
  );
}
