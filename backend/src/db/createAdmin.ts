import readline from "node:readline/promises";
import { activeDatabaseName, env } from "../config/env";
import { execute, query, closePool } from "../config/db";
import { hashPassword } from "../services/authService";
import { logger } from "../utils/logger";

/**
 * Protected administrator setup.
 *
 * Usage:
 *   npm run create-admin
 *
 * Credentials come from ADMIN_SETUP_EMAIL / ADMIN_SETUP_PASSWORD in
 * backend/.env, or from an interactive prompt. There is no public
 * registration path for administrators anywhere in the application.
 */

const PASSWORD_RULES =
  "Password must be at least 8 characters and contain at least one letter and one number.";

function validPassword(password: string): boolean {
  return password.length >= 8 && /[A-Za-z]/.test(password) && /[0-9]/.test(password);
}

function validEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

export async function createAdmin(input?: { email?: string; password?: string }): Promise<string> {
  let email = input?.email ?? env.ADMIN_SETUP_EMAIL;
  let password = input?.password ?? env.ADMIN_SETUP_PASSWORD;

  if (!email || !password) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    try {
      email = email || (await rl.question("Administrator e-mail: ")).trim();
      password = password || (await rl.question(`Administrator password (${PASSWORD_RULES}): `));
    } finally {
      rl.close();
    }
  }

  email = String(email).trim().toLowerCase();
  password = String(password);

  if (!validEmail(email)) throw new Error(`"${email}" is not a valid e-mail address.`);
  if (!validPassword(password)) throw new Error(PASSWORD_RULES);

  const passwordHash = await hashPassword(password);

  // If the address already exists it is promoted; the password is rotated so
  // the operator knows exactly which credentials work.
  await execute(
    `INSERT INTO users (full_name, email, password_hash, role, status, email_verified_at)
     VALUES ('Academy Administrator', ?, ?, 'admin', 'active', NOW())
     ON DUPLICATE KEY UPDATE role = 'admin', status = 'active', password_hash = VALUES(password_hash)`,
    [email, passwordHash],
  );

  const rows = await query<{ id: number }[]>("SELECT id FROM users WHERE email = ?", [email]);
  logger.info(`Administrator ready in "${activeDatabaseName}"`, { userId: Number(rows[0]?.id), email });
  return email;
}

if (require.main === module) {
  createAdmin()
    .then(async (email) => {
      console.log(`\n\x1b[32mAdministrator account is ready: ${email}\x1b[0m\n`);
      await closePool();
      process.exit(0);
    })
    .catch(async (error) => {
      console.error(`\n\x1b[31m${(error as Error).message}\x1b[0m\n`);
      await closePool().catch(() => undefined);
      process.exit(1);
    });
}
