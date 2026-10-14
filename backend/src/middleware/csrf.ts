import type { NextFunction, Request, RequestHandler, Response } from "express";
import { isProd } from "../config/env";
import { timingSafeEqual } from "../utils/tokens";
import { isOriginAllowed } from "../utils/origins";
import { ApiError } from "../utils/errors";

/**
 * CSRF protection.
 *
 * Two layers:
 *  1. Origin / Referer validation - a browser that sends a cross-site origin
 *     for a state-changing request is rejected.
 *  2. Double-submit token - once a session exists, mutations must echo the
 *     value of the `sla_csrf` cookie in the `x-csrf-token` header.
 *
 * Non-browser clients (curl, tests) send neither Origin nor Referer; they are
 * allowed only outside production, where CSRF is not applicable anyway.
 */

export const CSRF_COOKIE = "sla_csrf";
export const CSRF_HEADER = "x-csrf-token";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function originFromRequest(req: Request): string | null {
  const origin = req.headers.origin;
  if (typeof origin === "string" && origin !== "null") return origin;
  const referer = req.headers.referer;
  if (referer) {
    try {
      return new URL(referer).origin;
    } catch {
      return null;
    }
  }
  return null;
}

export const csrfProtection: RequestHandler = (req: Request, _res: Response, next: NextFunction) => {
  if (SAFE_METHODS.has(req.method)) return next();

  const origin = originFromRequest(req);
  if (origin) {
    if (!isOriginAllowed(origin)) {
      return next(ApiError.forbidden("Request origin is not allowed."));
    }
  } else if (isProd) {
    return next(ApiError.forbidden("Missing request origin."));
  }

  // Second layer: once signed in, mutations must carry the CSRF token.
  if (req.session?.userId && req.session.csrfToken) {
    const header = req.headers[CSRF_HEADER];
    const provided = Array.isArray(header) ? header[0] : header;
    if (!provided || !timingSafeEqual(String(provided), req.session.csrfToken)) {
      return next(ApiError.forbidden("Invalid or missing CSRF token. Reload the page and try again."));
    }
  }

  next();
};

/** Issues/refreshes the readable CSRF cookie for the current session. */
export const issueCsrfCookie: RequestHandler = (req, res, next) => {
  try {
    if (!req.session) return next();
    if (!req.session.csrfToken) {
      req.session.csrfToken = require("node:crypto").randomBytes(24).toString("hex");
    }

    // IMPORTANT: the cookie must be written when the response is flushed, not
    // right now. Handlers below can replace the session (login and signup call
    // `req.session.regenerate()`, which drops the token and mints a new one).
    // Emitting the cookie early would ship the OLD token while the session
    // holds the NEW one, and every following mutation would fail the
    // double-submit comparison with "Invalid or missing CSRF token".
    const originalEnd = res.end.bind(res);
    let emitted = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (res as any).end = (...args: any[]) => {
      if (!emitted) {
        emitted = true;
        try {
          const token = req.session?.csrfToken;
          if (token) {
            res.cookie(CSRF_COOKIE, token, {
              httpOnly: false, // must be readable by the frontend fetch wrapper
              sameSite: "lax",
              secure: isProd,
              path: "/",
              maxAge: 7 * 24 * 60 * 60 * 1000,
            });
          }
        } catch {
          // Never block a response because of cookie bookkeeping.
        }
      }
      return originalEnd(...args);
    };

    next();
  } catch (error) {
    next(error);
  }
};
