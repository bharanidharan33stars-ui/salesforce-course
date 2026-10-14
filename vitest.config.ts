import { defineConfig } from "vitest/config";
import path from "node:path";

/**
 * Frontend unit tests.
 * The API integration suite lives in backend/ and runs with `npm test`.
 */
export default defineConfig({
  root: __dirname,
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  esbuild: {
    jsx: "automatic",
  },
  test: {
    environment: "jsdom",
    globals: true,
    include: ["src/**/*.test.{ts,tsx}"],
    setupFiles: ["./src/test/setup.ts"],
    css: false,
  },
});
