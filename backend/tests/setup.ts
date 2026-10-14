import { afterAll, beforeAll } from "vitest";

/**
 * Test bootstrap.
 *
 * NODE_ENV=test makes src/config/env.ts point the pool at TEST_DATABASE_NAME,
 * so the suite can never touch development data.
 */
process.env.NODE_ENV = "test";
process.env.SESSION_SECRET = "test-only-session-secret-with-at-least-32-chars";
process.env.DATABASE_USER = process.env.DATABASE_USER ?? "root";
process.env.DATABASE_PASSWORD = process.env.DATABASE_PASSWORD ?? "";
process.env.SMTP_ENABLED = "false";
process.env.SMTP_TRANSPORT = "stream";
process.env.FRONTEND_URL = "http://localhost:3000";
process.env.APP_BASE_URL = "http://localhost:4000";

import { closePool } from "../src/config/db";
import { runMigrations } from "../src/db/migrate";
import { TRUNCATE_TABLES } from "./helpers/testData";

beforeAll(async () => {
  await runMigrations({
    info: () => undefined,
    warn: () => undefined,
    error: () => undefined,
    debug: () => undefined,
  });
  await clearTables();
});

afterAll(async () => {
  await closePool();
});

export async function clearTables(): Promise<void> {
  const { activeDatabaseName } = await import("../src/config/env");
  // Safety net: truncation must never touch the development database.
  if (!activeDatabaseName.endsWith("_test")) {
    throw new Error(
      `Refusing to truncate "${activeDatabaseName}" - the test suite only runs against a *_test database.`,
    );
  }
  const { execute } = await import("../src/config/db");
  await execute("SET FOREIGN_KEY_CHECKS = 0");
  for (const table of TRUNCATE_TABLES) {
    await execute(`TRUNCATE TABLE ${table}`);
  }
  await execute("SET FOREIGN_KEY_CHECKS = 1");
}
