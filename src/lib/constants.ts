import { z } from "zod";

/** Base URL of the Express API (never expose server-only secrets here). */
/**
 * Base URL for API calls.
 *
 * The default "/api" is relative, so requests always go to the Next origin
 * and are proxied to the Express backend (see next.config.ts rewrites). That
 * is what makes the site work both on this PC and on a phone over Wi-Fi with
 * no configuration. Set NEXT_PUBLIC_API_URL to an absolute URL only when the
 * API is hosted somewhere else entirely.
 */
export const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "/api";

export const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "http://localhost:3000";

export const ACADEMY_NAME = "Salesforce Learning Academy";

/** The five learning units, in teaching order. */
export const UNIT_SLUGS = [
  "introduction-to-salesforce",
  "salesforce-crm-functionality",
  "apex-programming-basics",
  "apex-programming-development",
  "visualforce-development",
] as const;

export const COURSE_SLUG = "salesforce-crm-and-platform";

export const PASSWORD_POLICY_TEXT =
  "Use at least 8 characters with one letter and one number.";
