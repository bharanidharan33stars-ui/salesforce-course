/**
 * Vercel serverless entry point.
 *
 * Vercel routes every /api/* request (see vercel.json rewrites) to this
 * function, which runs the exact same Express app that `backend/src/server.ts`
 * runs locally. Sessions live in MySQL and certificate PDFs / captured e-mails
 * are written to /tmp on Vercel (see storage.ts and mailer.ts), so nothing
 * depends on the local filesystem.
 *
 * Local development is unaffected: `npm run dev` still starts the standalone
 * Express server on port 4000 and Next proxies /api to it.
 */
import type { IncomingMessage, ServerResponse } from "node:http";
import { createApp } from "../backend/src/app";

const app = createApp();

export default function handler(req: IncomingMessage, res: ServerResponse): unknown {
  // Depending on router behaviour the function can see the rewrite
  // destination (/api/index...) instead of the original path - normalise so
  // Express always matches on the real /api/... URL.
  if (typeof req.url === "string" && req.url.startsWith("/api/index")) {
    const rest = req.url.slice("/api/index".length);
    req.url = rest === "" || rest.startsWith("?") || rest.startsWith("/") ? `/api${rest}` : `/api/${rest}`;
  }
  return app(req, res);
}
