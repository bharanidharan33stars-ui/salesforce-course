import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { isProd } from "../config/env";
import { logger } from "../utils/logger";
import { ApiError } from "../utils/errors";

export function ok<T>(res: Response, data: T, status = 200): Response {
  return res.status(status).json({ success: true, data });
}

export function created<T>(res: Response, data: T): Response {
  return ok(res, data, 201);
}

/**
 * Central error handler.
 * Every error leaves the API in the same shape:
 *   { success: false, error: { code, message, details? } }
 */
export function errorHandler(error: unknown, req: Request, res: Response, next: NextFunction): void {
  if (res.headersSent) return next(error);

  if (error instanceof ApiError) {
    if (error.status >= 500) {
      logger.error(`${req.method} ${req.originalUrl} -> ${error.status} ${error.message}`, {
        code: error.code,
      });
    }
    res.status(error.status).json({
      success: false,
      error: { code: error.code, message: error.message, ...(error.details ? { details: error.details } : {}) },
    });
    return;
  }

  if (error instanceof ZodError) {
    res.status(422).json({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "The submitted data is invalid.",
        details: error.issues.map((i) => ({ field: i.path.join("."), message: i.message })),
      },
    });
    return;
  }

  const anyError = error as { code?: string; status?: number; message?: string; type?: string };
  // Body-parser / JSON syntax errors
  if (anyError?.type === "entity.parse.failed" || anyError?.status === 400) {
    res.status(400).json({
      success: false,
      error: { code: "BAD_REQUEST", message: "Malformed request body." },
    });
    return;
  }

  logger.error(`Unhandled error on ${req.method} ${req.originalUrl}`, {
    message: anyError?.message,
    stack: isProd ? undefined : (error as Error)?.stack,
  });

  res.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_ERROR",
      message: "Something went wrong on our side. Please try again.",
      ...(isProd ? {} : { debug: (error as Error)?.message }),
    },
  });
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: { code: "NOT_FOUND", message: `No API route matches ${req.method} ${req.originalUrl}` },
  });
}
