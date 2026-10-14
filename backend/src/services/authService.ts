import argon2 from "argon2";
import type { Request } from "express";
import { env, isTest } from "../config/env";
import * as usersRepo from "../repositories/usersRepo";
import * as settingsRepo from "../repositories/settingsRepo";
import { ApiError } from "../utils/errors";
import { randomToken, sha256 } from "../utils/tokens";
import { execute, query } from "../config/db";
import { logger } from "../utils/logger";
import { passwordResetEmail, sendMail, verificationEmail } from "./mailer";

/**
 * Authentication service.
 *
 * Passwords are hashed with Argon2id (memory-hard, resistant to GPU attacks).
 * Reset/verification tokens are random 64-byte values: the browser receives
 * the raw token once, and only its SHA-256 hash is stored in MySQL, so a
 * database leak cannot be used to take over accounts.
 */

export const VERIFICATION_TOKEN_HOURS = 24;
export const RESET_TOKEN_MINUTES = 60;

const hashOptions: argon2.Options = { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 };

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, hashOptions);
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}

export async function registerUser(input: {
  fullName: string;
  email: string;
  password: string;
}): Promise<{ userId: number; emailVerificationToken?: string }> {
  const email = input.email.toLowerCase();

  const existing = await usersRepo.findByEmail(email);
  if (existing) {
    throw ApiError.conflict("An account with this e-mail address already exists. Try signing in instead.");
  }

  const passwordHash = await hashPassword(input.password);
  const userId = await usersRepo.createUser({
    fullName: input.fullName.trim(),
    email,
    passwordHash,
    role: "student", // roles are never accepted from the client
  });

  let token: string | undefined;
  if (!isTest) {
    token = randomToken();
    await saveVerificationToken(userId, token);
    const message = verificationEmail({
      name: input.fullName.trim(),
      url: `${env.FRONTEND_URL}/verify-email?token=${token}`,
      expiresInHours: VERIFICATION_TOKEN_HOURS,
    });
    message.to = email;
    const result = await sendMail(message);
    logger.info("Verification e-mail queued", { userId, accepted: result.accepted, simulated: result.simulated });
  }

  return { userId, emailVerificationToken: token };
}

/** Establishes a server-side session. Never stores the password anywhere. */
export async function startSession(req: Request, userId: number, remember = false): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    req.session.regenerate((err) => (err ? reject(err) : resolve()));
  });
  req.session.userId = userId;
  req.session.csrfToken = req.session.csrfToken ?? randomToken(12);
  if (remember) {
    req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
  }
}

export async function endSession(req: Request): Promise<void> {
  await new Promise<void>((resolve) => req.session.destroy(() => resolve()));
}

export async function authenticate(email: string, password: string): Promise<number> {
  const user = await usersRepo.findByEmail(email.toLowerCase());
  if (!user) throw ApiError.unauthorized("Incorrect e-mail address or password.");

  const valid = await verifyPassword(user.password_hash, password);
  if (!valid) throw ApiError.unauthorized("Incorrect e-mail address or password.");

  if (user.status !== "active") {
    throw ApiError.forbidden("This account has been disabled. Contact support for help.");
  }

  const requireVerification = await settingsRepo.getSetting("email_verification_required_for_login");
  if (requireVerification === "true" && !user.email_verified_at) {
    throw ApiError.forbidden("Please verify your e-mail address before signing in.");
  }

  return Number(user.id);
}

// ------------------------------------------------------ password reset

async function saveVerificationToken(userId: number, token: string): Promise<void> {
  await execute(
    `INSERT INTO email_verification_tokens (user_id, token_hash, expires_at)
     VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? HOUR))`,
    [userId, sha256(token), VERIFICATION_TOKEN_HOURS],
  );
}

async function saveResetToken(userId: number, token: string): Promise<void> {
  await execute(
    `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
     VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE))`,
    [userId, sha256(token), RESET_TOKEN_MINUTES],
  );
}

interface TokenRow {
  id: number;
  user_id: number;
  token_hash: string;
  expires_at: string;
  used_at: string | null;
}

async function readResetToken(token: string): Promise<TokenRow | null> {
  const rows = await query<TokenRow[]>(
    "SELECT * FROM password_reset_tokens WHERE token_hash = ? LIMIT 1",
    [sha256(token)],
  );
  return rows[0] ?? null;
}

/**
 * Always resolves - the caller cannot tell whether the address exists, which
 * prevents account enumeration.
 */
export async function requestPasswordReset(email: string): Promise<void> {
  const user = await usersRepo.findByEmail(email.toLowerCase());
  if (!user) return;

  const token = randomToken();
  await saveResetToken(Number(user.id), token);

  const message = passwordResetEmail({
    name: user.full_name,
    url: `${env.FRONTEND_URL}/reset-password?token=${token}`,
    expiresInMinutes: RESET_TOKEN_MINUTES,
  });
  message.to = user.email;
  await sendMail(message);
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  const row = await readResetToken(token);
  if (!row || row.used_at) throw ApiError.badRequest("This reset link is invalid or has already been used.");
  if (new Date(row.expires_at).getTime() < Date.now()) {
    throw ApiError.badRequest("This reset link has expired. Request a new one.");
  }

  const passwordHash = await hashPassword(newPassword);
  await usersRepo.updatePasswordHash(Number(row.user_id), passwordHash);
  await execute("UPDATE password_reset_tokens SET used_at = NOW() WHERE id = ?", [row.id]);
  // Invalidate every active session of the user after a password change.
  await execute(
    `DELETE FROM auth_sessions WHERE JSON_VALID(data) AND CAST(JSON_EXTRACT(data, '$.userId') AS UNSIGNED) = ?`,
    [row.user_id],
  );
}

export async function verifyEmailToken(token: string): Promise<{ userId: number }> {
  const rows = await query<TokenRow[]>(
    "SELECT * FROM email_verification_tokens WHERE token_hash = ? LIMIT 1",
    [sha256(token)],
  );
  const row = rows[0];
  if (!row || row.used_at) throw ApiError.badRequest("This verification link is invalid or has already been used.");
  if (new Date(row.expires_at).getTime() < Date.now()) {
    throw ApiError.badRequest("This verification link has expired. Request a new one from your dashboard.");
  }

  await usersRepo.markEmailVerified(Number(row.user_id));
  await execute("UPDATE email_verification_tokens SET used_at = NOW() WHERE id = ?", [row.id]);
  return { userId: Number(row.user_id) };
}

export async function resendVerification(userId: number): Promise<void> {
  const user = await usersRepo.findById(userId);
  if (!user || user.email_verified_at) return;
  const token = randomToken();
  await saveVerificationToken(userId, token);
  const message = verificationEmail({
    name: user.full_name,
    url: `${env.FRONTEND_URL}/verify-email?token=${token}`,
    expiresInHours: VERIFICATION_TOKEN_HOURS,
  });
  message.to = user.email;
  await sendMail(message);
}
