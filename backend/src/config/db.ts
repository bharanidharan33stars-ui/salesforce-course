import mysql, { type Pool, type PoolConnection, type ResultSetHeader, type RowDataPacket } from "mysql2/promise";
import { activeDatabaseName, env, isProd } from "./env";

/**
 * Central MySQL access.
 * Every query in the application goes through parameterised helpers so that
 * user input can never be concatenated into SQL (SQL-injection safe).
 */

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    pool = mysql.createPool({
      host: env.DATABASE_HOST,
      port: env.DATABASE_PORT,
      user: env.DATABASE_USER,
      password: env.DATABASE_PASSWORD,
      database: activeDatabaseName,
      waitForConnections: true,
      connectionLimit: isProd ? 20 : 10,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
      // Windows + MySQL8 defaults: caching_sha2_password is the default plugin.
      authPlugins: undefined,
      charset: "utf8mb4",
      dateStrings: true, // return DATETIME as "YYYY-MM-DD HH:MM:SS" strings
      decimalNumbers: true,
      // Optional TLS - required by hosted MySQL services (TiDB Serverless etc.).
      ...(env.DATABASE_SSL
        ? {
            ssl: {
              rejectUnauthorized: env.DATABASE_SSL_REJECT,
              ...(env.DATABASE_CA ? { ca: env.DATABASE_CA } : {}),
            },
          }
        : {}),
    });
  }
  return pool;
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

/**
 * Run a SELECT and return typed rows. The generic is intentionally
 * unconstrained so callers can use plain interfaces (mysql2 casts for us).
 */
export async function query<T = RowDataPacket[]>(sql: string, params: unknown[] = []): Promise<T> {
  const [rows] = await getPool().execute(sql, params as never[]);
  return rows as T;
}

export async function execute(sql: string, params: unknown[] = []): Promise<ResultSetHeader> {
  const [result] = await getPool().execute(sql, params as never[]);
  return result as ResultSetHeader;
}

/**
 * Run several statements atomically. If anything throws, every change made
 * inside the callback is rolled back.
 */
export async function withTransaction<T>(fn: (conn: PoolConnection) => Promise<T>): Promise<T> {
  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    const result = await fn(connection);
    await connection.commit();
    return result;
  } catch (error) {
    try {
      await connection.rollback();
    } catch {
      /* rollback failure must not mask the original error */
    }
    throw error;
  } finally {
    connection.release();
  }
}

/** Simple health probe used by GET /api/health. */
export async function pingDatabase(): Promise<{ ok: boolean; latencyMs: number }> {
  const started = Date.now();
  await query("SELECT 1");
  return { ok: true, latencyMs: Date.now() - started };
}
