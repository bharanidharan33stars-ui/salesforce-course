import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";

/**
 * Environment validation.
 *
 * The backend refuses to start when a required variable is missing or
 * malformed. This turns confusing runtime crashes ("connect ECONNREFUSED
 * undefined:undefined") into one clear message at boot.
 */

// Always read backend/.env regardless of the folder we were started from
// (works for `tsx src/server.ts`, `npm run migrate` and the compiled dist/).
const envFile = process.env.ENV_FILE ?? path.resolve(__dirname, "../../.env");
if (fs.existsSync(envFile)) {
  // dotenv does not overwrite variables that already exist in the process.
  require("dotenv").config({ path: envFile });
}

const bool = z
  .union([z.boolean(), z.string()])
  .transform((v) => {
    if (typeof v === "boolean") return v;
    return ["1", "true", "yes", "on"].includes(v.trim().toLowerCase());
  })
  .default(false);

/** Same as `bool` but with an explicit default (for opt-out flags). */
const boolDefault = (def: boolean) =>
  z
    .union([z.boolean(), z.string()])
    .transform((v) => {
      if (typeof v === "boolean") return v;
      return ["1", "true", "yes", "on"].includes(v.trim().toLowerCase());
    })
    .default(def);

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),

  FRONTEND_URL: z.string().url().default("http://localhost:3000"),
  APP_BASE_URL: z.string().url().default("http://localhost:4000"),

  DATABASE_HOST: z.string().min(1).default("localhost"),
  DATABASE_PORT: z.coerce.number().int().min(1).max(65535).default(3306),
  DATABASE_NAME: z.string().min(1).default("salesforce_academy"),
  DATABASE_USER: z.string().min(1, "DATABASE_USER is required"),
  DATABASE_PASSWORD: z.string().min(1, "DATABASE_PASSWORD is required"),
  TEST_DATABASE_NAME: z.string().min(1).default("salesforce_academy_test"),
  // TLS for hosted MySQL (e.g. TiDB Serverless requires it). Off by default so
  // local MySQL keeps working unchanged.
  DATABASE_SSL: boolDefault(false),
  DATABASE_CA: z.string().optional().default(""), // PEM root CA, optional
  DATABASE_SSL_REJECT: boolDefault(true),

  SESSION_SECRET: z
    .string()
    .min(32, "SESSION_SECRET must be at least 32 characters")
    .refine((v) => !v.startsWith("replace_me"), "SESSION_SECRET must be changed from the placeholder value"),

  SMTP_ENABLED: bool,
  SMTP_TRANSPORT: z.enum(["stream", "smtp"]).default("stream"),
  SMTP_HOST: z.string().optional().default(""),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(587),
  SMTP_SECURE: bool,
  SMTP_USER: z.string().optional().default(""),
  SMTP_PASSWORD: z.string().optional().default(""),
  SMTP_FROM: z.string().min(1).default("Salesforce Learning Academy <no-reply@localhost>"),

  ADMIN_SETUP_EMAIL: z.string().optional().default(""),
  ADMIN_SETUP_PASSWORD: z.string().optional().default(""),
});

export type RawEnv = z.infer<typeof schema>;

function loadEnv(): RawEnv {
  // Tests supply their own SESSION_SECRET through the test bootstrap.
  const candidate: Record<string, unknown> = { ...process.env };
  if (process.env.NODE_ENV === "test" && !process.env.SESSION_SECRET) {
    candidate.SESSION_SECRET = "test-only-session-secret-with-at-least-32-characters";
  }
  if (process.env.NODE_ENV === "test" && !process.env.DATABASE_PASSWORD) {
    candidate.DATABASE_PASSWORD = "test-only-placeholder";
  }
  if (process.env.NODE_ENV === "test" && !process.env.DATABASE_USER) {
    candidate.DATABASE_USER = "root";
  }

  const parsed = schema.safeParse(candidate);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("\n");
    const message =
      `Invalid environment configuration in ${envFile}.\n` +
      `Fix the following:\n${issues}\n\n` +
      `Copy backend/.env.example to backend/.env and fill in your MySQL credentials.`;
    // eslint-disable-next-line no-console
    console.error("\n\x1b[31m" + message + "\x1b[0m\n");
    throw new Error("Invalid environment configuration");
  }
  return parsed.data;
}

export const env = loadEnv();
export const isProd = env.NODE_ENV === "production";
export const isTest = env.NODE_ENV === "test";

/** Database actually used by the connection pool (tests point at a separate DB). */
export const activeDatabaseName = isTest ? env.TEST_DATABASE_NAME : env.DATABASE_NAME;

/** True when real outbound email is possible. */
export const smtpConfigured = env.SMTP_ENABLED && env.SMTP_TRANSPORT === "smtp" && Boolean(env.SMTP_HOST);
