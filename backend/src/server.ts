import { createApp, sessionStore } from "./app";
import { env, isProd } from "./config/env";
import { closePool, pingDatabase } from "./config/db";
import { logger } from "./utils/logger";
import { runMigrations } from "./db/migrate";

/**
 * Server entry point.
 * 1. Validate the environment (fails fast with a clear message).
 * 2. Check the database connection.
 * 3. Apply pending migrations in development (set AUTO_MIGRATE=false to opt out).
 * 4. Start listening on 0.0.0.0 so a phone on the same Wi-Fi can reach it.
 */

async function bootstrap(): Promise<void> {
  // --- database ---------------------------------------------------------
  try {
    const { ok, latencyMs } = await pingDatabase();
    logger.info("Database connection established", { ok, latencyMs, database: process.env.ACTIVE_DB });
  } catch (error) {
    logger.error("Could not connect to MySQL", { error: (error as Error).message });
    // eslint-disable-next-line no-console
    console.error(
      `\n\x1b[31mCould not connect to MySQL at ${env.DATABASE_HOST}:${env.DATABASE_PORT}.\x1b[0m\n` +
        `Check DATABASE_* values in backend/.env, then run: npm run migrate\n` +
        `Details: ${(error as Error).message}\n`,
    );
    process.exit(1);
  }

  // --- migrations -------------------------------------------------------
  const autoMigrate = !isProd && process.env.AUTO_MIGRATE !== "false";
  if (autoMigrate) {
    try {
      await runMigrations();
    } catch (error) {
      logger.error("Automatic migration failed", { error: (error as Error).message });
      process.exit(1);
    }
  }

  // --- HTTP -------------------------------------------------------------
  const app = createApp();
  const cleanupTimer = sessionStore.startAutoCleanup();

  const server = app.listen(env.PORT, "0.0.0.0", () => {
    logger.info(`API listening on http://localhost:${env.PORT} (also reachable on your LAN IP)`);
    // eslint-disable-next-line no-console
    console.log(`\n  \x1b[36mSalesforce Learning Academy API\x1b[0m`);
    console.log(`  Local:    http://localhost:${env.PORT}/api/health`);
    console.log(`  Network:  http://<your-ip>:${env.PORT}/api/health  (for mobile devices)`);
    console.log(`  Mode:     ${env.NODE_ENV}\n`);
  });

  server.headersTimeout = 15_000;
  server.requestTimeout = 30_000;

  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, shutting down gracefully`);
    clearInterval(cleanupTimer);
    server.close(async () => {
      await closePool();
      process.exit(0);
    });
    // Safety net if a connection keeps the process alive.
    setTimeout(() => process.exit(0), 8000).unref();
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

void bootstrap();
