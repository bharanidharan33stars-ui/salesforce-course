import express from "express";
import helmet from "helmet";
import cors from "cors";
import session from "express-session";
import { env, isProd } from "./config/env";
import { getPool } from "./config/db";
import { MySQLSessionStore } from "./services/mysqlSessionStore";
import { attachUser } from "./middleware/auth";
import { csrfProtection, issueCsrfCookie } from "./middleware/csrf";
import { isOriginAllowed } from "./utils/origins";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { generalLimiter } from "./middleware/rateLimit";
import { apiRouter } from "./routes";

export const sessionStore = new MySQLSessionStore(getPool());

export function createApp() {
  const app = express();

  // Behind a reverse proxy in production so req.ip is the real client address.
  if (isProd) app.set("trust proxy", 1);
  app.disable("x-powered-by");

  app.use(
    helmet({
      // The API is consumed by the Next.js frontend on another origin in dev.
      crossOriginResourcePolicy: { policy: "cross-origin" },
      contentSecurityPolicy: false,
    }),
  );

  app.use(
    cors({
      origin(origin, callback) {
        // Allow same-origin / server-to-server requests (no Origin header),
        // plus configured URLs and, in development, local-network devices.
        if (!origin) return callback(null, true);
        return callback(null, isOriginAllowed(origin));
      },
      credentials: true, // cookies are required for session auth
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["content-type", "x-csrf-token"],
    }),
  );

  app.use(express.json({ limit: "256kb" }));

  app.use(
    session({
      name: "sla.sid",
      secret: env.SESSION_SECRET,
      store: sessionStore,
      resave: false,
      saveUninitialized: false,
      rolling: false,
      cookie: {
        httpOnly: true, // never readable from JavaScript
        secure: isProd, // HTTPS only in production
        sameSite: "lax", // blocks cross-site POSTs while keeping top-level navigation
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: "/",
      },
    }),
  );

  app.use(attachUser);
  app.use(issueCsrfCookie);
  app.use("/api", generalLimiter);
  app.use("/api", csrfProtection);

  app.use("/api", apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
