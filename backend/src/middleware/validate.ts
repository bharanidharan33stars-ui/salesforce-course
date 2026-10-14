import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { ZodType } from "zod";
import { ApiError } from "../utils/errors";

/**
 * Request validation middleware.
 * Nothing reaches a controller unless the payload matches the schema.
 *
 *   validate({ body: loginSchema })
 */
interface Schemas {
  body?: ZodType;
  query?: ZodType;
  params?: ZodType;
}

export function validate(schemas: Schemas): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (schemas.params) {
        const parsed = schemas.params.safeParse(req.params);
        if (!parsed.success) {
          return next(ApiError.notFound("The requested resource was not found."));
        }
        req.params = parsed.data as typeof req.params;
      }
      if (schemas.query) {
        const parsed = schemas.query.safeParse(req.query);
        if (!parsed.success) return next(invalid(parsed.error));
        // Attach the typed query so controllers can use it safely, and shadow
        // `req.query` (a getter on Express's prototype) so controllers that
        // read it directly receive coerced values AND schema defaults -
        // otherwise optional params like `page` stay undefined and turn into
        // NaN offsets.
        (req as Request & { validatedQuery?: unknown }).validatedQuery = parsed.data;
        Object.defineProperty(req, "query", {
          value: parsed.data,
          writable: true,
          enumerable: true,
          configurable: true,
        });
      }
      if (schemas.body) {
        const parsed = schemas.body.safeParse(req.body);
        if (!parsed.success) return next(invalid(parsed.error));
        req.body = parsed.data;
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}

function invalid(error: { issues: { path: PropertyKey[]; message: string }[] }) {
  return ApiError.validation("The submitted data is invalid.", {
    issues: error.issues.map((i) => ({ field: i.path.join("."), message: i.message })),
  });
}
