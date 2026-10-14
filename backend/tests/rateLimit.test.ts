import express from "express";
import { describe, expect, it } from "vitest";
import request from "supertest";
import { limiter } from "../src/middleware/rateLimit";

/**
 * Rate limiting is deliberately opened up for the rest of the suite (a shared
 * IP would otherwise trip it mid-run), so throttling gets its own focused test
 * against the same `limiter()` factory the API uses - with an explicit small
 * budget for this file only.
 */

function buildApp(testMax: number) {
  const app = express();
  app.use(limiter(60_000, testMax, "Too many requests. Please slow down.", testMax));
  app.get("/ping", (_req, res) => res.json({ success: true }));
  // Error shape the API's error handler would produce.
  app.use(
    (
      err: { status?: number; message?: unknown },
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      res.status(err.status ?? 500).json(err.message);
    },
  );
  return app;
}

describe("limiter()", () => {
  const app = buildApp(3);

  it("allows requests up to the budget and then answers 429 with the error payload", async () => {
    // Within budget: all pass.
    for (let i = 0; i < 3; i += 1) {
      const ok = await request(app).get("/ping");
      expect(ok.status).toBe(200);
    }

    // Over budget: throttled with the documented code.
    const limited = await request(app).get("/ping");
    expect(limited.status).toBe(429);
    expect(limited.body.error.code).toBe("RATE_LIMITED");
    // Standard headers are enabled (draft-7 name or the combined form).
    const rateHeaders = Object.keys(limited.headers).filter((name) => name.startsWith("ratelimit"));
    expect(rateHeaders.length).toBeGreaterThan(0);
  });
});
