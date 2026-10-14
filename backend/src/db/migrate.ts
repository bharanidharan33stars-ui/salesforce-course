import fs from "node:fs";
import path from "node:path";
import mysql from "mysql2/promise";
import { activeDatabaseName, env } from "../config/env";
import { logger } from "../utils/logger";

/**
 * Migration runner.
 *
 * - Creates the database when it does not exist yet.
 * - Applies every .sql file in /migrations exactly once, in file-name order.
 * - Records applied files in `schema_migrations` so re-running is safe.
 *
 * Usage: npm run migrate
 */

const MIGRATIONS_DIR = path.resolve(__dirname, "../../migrations");

async function ensureDatabase(): Promise<mysql.Connection> {
  const connection = await mysql.createConnection({
    host: env.DATABASE_HOST,
    port: env.DATABASE_PORT,
    user: env.DATABASE_USER,
    password: env.DATABASE_PASSWORD,
    multipleStatements: true,
  });

  await connection.query(
    `CREATE DATABASE IF NOT EXISTS \`${activeDatabaseName}\`
     CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  );
  await connection.changeUser({ database: activeDatabaseName });
  return connection;
}

export async function runMigrations(log = logger): Promise<string[]> {
  const connection = await ensureDatabase();
  const applied: string[] = [];

  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        name VARCHAR(190) NOT NULL,
        applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uq_migration_name (name)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    const [existingRows] = await connection.query<mysql.RowDataPacket[]>(
      "SELECT name FROM schema_migrations",
    );
    const alreadyApplied = new Set(existingRows.map((r) => r.name as string));

    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    for (const file of files) {
      if (alreadyApplied.has(file)) {
        log.info(`skip (already applied): ${file}`);
        continue;
      }
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");
      log.info(`applying migration: ${file}`);
      await connection.query(sql);
      await connection.query("INSERT INTO schema_migrations (name) VALUES (?)", [file]);
      applied.push(file);
    }

    if (applied.length === 0) log.info("Database is up to date - no new migrations.");
    else log.info(`Applied ${applied.length} migration(s).`);
  } finally {
    await connection.end();
  }

  return applied;
}

if (require.main === module) {
  runMigrations()
    .then(() => process.exit(0))
    .catch((error) => {
      logger.error("Migration failed", { error: (error as Error).message });
      // eslint-disable-next-line no-console
      console.error(error);
      process.exit(1);
    });
}
