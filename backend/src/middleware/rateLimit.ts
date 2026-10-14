import type { RequestHandler } from "express";
import rateLimit from "express-rate-limit";
import { isTest } from "../config/env";

/**
 * Rate limits protect against credential stuffing, spam registrations and
 * quiz-answer brute forcing. Limits are counted per client IP.
 * In production put the app behind a reverse proxy and set TRUST_PROXY=1 so
 * the real client address is used.
 */

/**
 * Builds a rate limiter. Limits are counted per client IP.
 * `testMax` overrides the (otherwise near-infinite) test budget so a suite can
 * prove that throttling actually engages, without touching the real endpoints.
 */
export function limiter(windowMs: number, max: number, message: string, testMax?: number): RequestHandler {
  return rateLimit({
    windowMs,
    max: isTest ? (testMax ?? 10_000) : max, // effectively disabled inside the test suite
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { success: false, error: { code: "RATE_LIMITED", message } },
  });
}

/** Login + registration attempts. */
export const authLimiter = limiter(
  15 * 60 * 1000,
  20,
  "Too many sign-in attempts. Please wait 15 minutes and try again.",
);

/** Password reset / e-mail verification request links. */
export const resetLimiter = limiter(
  60 * 60 * 1000,
  8,
  "Too many password reset requests. Please wait an hour and try again.",
);

/** Quiz submissions - stops automated answer guessing. */
export const quizSubmitLimiter = limiter(
  10 * 60 * 1000,
  40,
  "Too many quiz submissions. Please wait a few minutes and try again.",
);

/** Certificate e-mail retries. */
export const emailRetryLimiter = limiter(
  60 * 60 * 1000,
  6,
  "Too many e-mail retry requests. Please wait an hour and try again.",
);

/** Fallback for the rest of the API. */
export const generalLimiter = limiter(
  15 * 60 * 1000,
  1000,
  "Too many requests. Please slow down and try again shortly.",
);
