import { isProd } from "../config/env";

/**
 * Minimal structured logger.
 * Sensitive keys are redacted so passwords, tokens and secrets never reach
 * the log files or the console.
 */
const SENSITIVE = /(password|secret|token|hash|cookie|authorization|session)/i;

function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      out[key] = SENSITIVE.test(key) ? "[redacted]" : redact(val);
    }
    return out;
  }
  return value;
}

type Level = "info" | "warn" | "error" | "debug";

function write(level: Level, message: string, meta?: Record<string, unknown>) {
  if (level === "debug" && isProd) return;
  const entry = {
    time: new Date().toISOString(),
    level,
    message,
    ...(meta ? { meta: redact(meta) } : {}),
  };
  const line = JSON.stringify(entry);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const logger = {
  info: (message: string, meta?: Record<string, unknown>) => write("info", message, meta),
  warn: (message: string, meta?: Record<string, unknown>) => write("warn", message, meta),
  error: (message: string, meta?: Record<string, unknown>) => write("error", message, meta),
  debug: (message: string, meta?: Record<string, unknown>) => write("debug", message, meta),
};
