import readline from "node:readline/promises";
import mysql from "mysql2/promise";
import { activeDatabaseName, env } from "../config/env";
import { logger } from "../utils/logger";

/**
 * Development helper: drops and recreates the database.
 *
 *   npm run db:reset
 *
 * Refuses to run when NODE_ENV=production. Requires typed confirmation.
 */

export async function resetDatabase(assumeYes = false): Promise<void> {
  if (env.NODE_ENV === "production") {
    throw new Error("Refusing to reset a production database.");
  }

  if (!assumeYes) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const answer = await rl.question(
      `\nThis DELETES every table in "${activeDatabaseName}". Type the database name to continue: `,
    );
    rl.close();
    if (answer.trim() !== activeDatabaseName) throw new Error("Confirmation did not match - nothing was changed.");
  }

  const connection = await mysql.createConnection({
    host: env.DATABASE_HOST,
    port: env.DATABASE_PORT,
    user: env.DATABASE_USER,
    password: env.DATABASE_PASSWORD,
    ...(env.DATABASE_SSL
      ? {
          ssl: {
            rejectUnauthorized: env.DATABASE_SSL_REJECT,
            ...(env.DATABASE_CA ? { ca: env.DATABASE_CA } : {}),
          },
        }
      : {}),
    multipleStatements: true,
  });

  try {
    await connection.query(`DROP DATABASE IF EXISTS \`${activeDatabaseName}\``);
    await connection.query(
      `CREATE DATABASE \`${activeDatabaseName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    );
    logger.info(`Database "${activeDatabaseName}" was reset. Run: npm run db:seed`);
  } finally {
    await connection.end();
  }
}

if (require.main === module) {
  resetDatabase(process.argv.includes("--yes"))
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(`\n\x1b[31m${(error as Error).message}\x1b[0m\n`);
      process.exit(1);
    });
}
