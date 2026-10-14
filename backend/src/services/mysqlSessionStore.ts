import type { SessionData } from "express-session";
import session from "express-session";
import type { Pool } from "mysql2/promise";
import { getPool } from "../config/db";

/**
 * MySQL-backed session store for express-session.
 *
 * Sessions live in the `auth_sessions` table (see migration 001). Nothing
 * security sensitive is stored in the browser: the cookie only holds a random
 * session id, and the session row holds the user id.
 */

interface SessionRow {
  sid: string;
  expires: string;
  data: string;
}

function parseDate(value: unknown): Date {
  if (value instanceof Date) return value;
  return new Date(String(value));
}

export class MySQLSessionStore extends session.Store {
  private readonly pool: Pool;
  private readonly table = "auth_sessions";

  constructor(pool: Pool = getPool()) {
    super();
    this.pool = pool;
  }

  private async cleanupExpired(): Promise<void> {
    await this.pool.execute(`DELETE FROM ${this.table} WHERE expires < NOW()`);
  }

  get(sid: string, callback: (err?: unknown, session?: SessionData | null) => void): void {
    this.pool
      .query(`SELECT sid, expires, data FROM ${this.table} WHERE sid = ?`, [sid])
      .then((result) => {
        const rows = result[0] as SessionRow[];
        const row = rows[0];
        if (!row) return callback(null, null);
        if (parseDate(row.expires).getTime() <= Date.now()) {
          void this.pool.execute(`DELETE FROM ${this.table} WHERE sid = ?`, [sid]);
          return callback(null, null);
        }
        callback(null, JSON.parse(row.data) as SessionData);
      })
      .catch((err) => callback(err));
  }

  set(sid: string, session: SessionData, callback?: (err?: unknown) => void): void {
    const maxAge = session.cookie?.maxAge ?? 86_400_000;
    const expires = new Date(Date.now() + maxAge);
    const data = JSON.stringify(session);
    this.pool
      .execute(
        `INSERT INTO ${this.table} (sid, expires, data) VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE expires = VALUES(expires), data = VALUES(data)`,
        [sid, expires, data],
      )
      .then(() => callback?.(null))
      .catch((err) => callback?.(err));
  }

  destroy(sid: string, callback?: (err?: unknown) => void): void {
    this.pool
      .execute(`DELETE FROM ${this.table} WHERE sid = ?`, [sid])
      .then(() => callback?.(null))
      .catch((err) => callback?.(err));
  }

  override touch(sid: string, session: SessionData, callback?: (err?: unknown) => void): void {
    const maxAge = session.cookie?.maxAge ?? 86_400_000;
    const expires = new Date(Date.now() + maxAge);
    this.pool
      .execute(`UPDATE ${this.table} SET expires = ? WHERE sid = ?`, [expires, sid])
      .then(() => callback?.(null))
      .catch((err) => callback?.(err));
  }

  override clear(callback?: (err?: unknown) => void): void {
    this.pool
      .execute(`DELETE FROM ${this.table}`)
      .then(() => callback?.(null))
      .catch((err) => callback?.(err));
  }

  override length(callback: (err?: unknown, length?: number) => void): void {
    this.pool
      .query(`SELECT COUNT(*) AS count FROM ${this.table} WHERE expires >= NOW()`)
      .then((result) => {
        const rows = result[0] as { count: number }[];
        callback(null, Number(rows[0]?.count ?? 0));
      })
      .catch((err) => callback(err));
  }

  /** Periodically remove expired rows (defensive, in addition to lazy cleanup). */
  startAutoCleanup(intervalMs = 60 * 60 * 1000): NodeJS.Timeout {
    const timer = setInterval(() => {
      void this.cleanupExpired().catch(() => undefined);
    }, intervalMs);
    timer.unref?.();
    return timer;
  }
}
