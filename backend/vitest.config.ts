import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    setupFiles: ["./tests/setup.ts"],
    testTimeout: 40_000,
    hookTimeout: 60_000,
    // Set BEFORE any module loads: ESM imports are hoisted, so src/config/env
    // would otherwise read NODE_ENV before setup.ts gets a chance to set it
    // and could point the pool (and the table truncation) at the real database.
    env: {
      NODE_ENV: "test",
      SESSION_SECRET: "test-only-session-secret-with-at-least-32-chars",
    },
    // The suite shares one MySQL test database, so files must not run in parallel.
    fileParallelism: false,
    sequence: { concurrent: false },
    reporters: ["default"],
  },
});
