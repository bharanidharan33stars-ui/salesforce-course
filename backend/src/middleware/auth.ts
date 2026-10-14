import type { Request, RequestHandler } from "express";
import { query } from "../config/db";
import type { AuthenticatedUser } from "../types/express";
import { ApiError } from "../utils/errors";

/**
 * Authentication / authorization middleware.
 *
 * The browser only holds an opaque session id in an HTTP-only cookie. The
 * real identity is loaded from MySQL on every request, so disabling an
 * account or changing a role takes effect immediately - the client can never
 * talk its way into a higher privilege level.
 */

const SELECT_USER = `
  SELECT id, full_name, email, role, status, email_verified_at
  FROM users
  WHERE id = ?
  LIMIT 1`;

export async function loadUserFromSession(userId: number): Promise<AuthenticatedUser | null> {
  const rows = await query<AuthenticatedUser[]>(SELECT_USER, [userId]);
  const user = rows[0];
  if (!user) return null;
  if (user.status !== "active") return null;
  return user;
}

/** Reads the session, attaches req.user when there is a valid one. Never fails. */
export const attachUser: RequestHandler = async (req, _res, next) => {
  try {
    const userId = req.session?.userId;
    if (userId) {
      const user = await loadUserFromSession(userId);
      if (user) req.user = user;
      else {
        // Session points to a removed/disabled account: destroy it.
        await new Promise<void>((resolve) => req.session?.destroy(() => resolve()));
      }
    }
    next();
  } catch (error) {
    next(error);
  }
};

/** Requires a signed-in user. */
export const requireAuth: RequestHandler = (req, _res, next) => {
  if (!req.user) return next(ApiError.unauthorized());
  next();
};

/** Requires the administrator role (checked server-side on every call). */
export const requireAdmin: RequestHandler = (req, _res, next) => {
  if (!req.user) return next(ApiError.unauthorized());
  if (req.user.role !== "admin") return next(ApiError.forbidden("Administrator access is required."));
  next();
};

/** Guard used by helper functions inside services. */
export function assertAuthenticated(req: Request): AuthenticatedUser {
  if (!req.user) throw ApiError.unauthorized();
  return req.user;
}

export function assertAdmin(req: Request): AuthenticatedUser {
  const user = assertAuthenticated(req);
  if (user.role !== "admin") throw ApiError.forbidden("Administrator access is required.");
  return user;
}
