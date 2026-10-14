import crypto from "node:crypto";

/** Cryptographically strong, URL-safe random token (used for verification links). */
export function randomToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString("hex");
}

/** Non-guessable public certificate identifier (32 hex characters). */
export function randomVerificationId(): string {
  return crypto.randomBytes(16).toString("hex");
}

/** SHA-256 hex digest. Tokens are stored hashed, never in plain text. */
export function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

/**
 * Human friendly certificate number, e.g. SLA-2026-4F7K-9QZ2.
 * Readable on a resume, but the authoritative public identifier is the
 * separate random verification_id.
 */
export function certificateNumber(year = new Date().getFullYear()): string {
  const block = () =>
    crypto.randomBytes(4).toString("hex").toUpperCase().slice(0, 4);
  return `SLA-${year}-${block()}-${block()}`;
}

export function timingSafeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}
