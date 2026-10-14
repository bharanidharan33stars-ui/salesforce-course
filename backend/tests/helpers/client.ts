import type { Express } from "express";
import request from "supertest";

/**
 * Test HTTP client.
 *
 * Wraps supertest and mirrors what the browser does:
 *  - keeps cookies between requests (session id),
 *  - reads the `sla_csrf` cookie and echoes it in the x-csrf-token header,
 *    exactly like the frontend fetch wrapper.
 */

export const FRONTEND_ORIGIN = "http://localhost:3000";

export class TestClient {
  readonly agent: ReturnType<typeof request.agent>;
  private csrfToken: string | null = null;

  constructor(app: Express) {
    this.agent = request.agent(app);
  }

  private captureCsrf(headers: unknown): void {
    const setCookie = (headers as { "set-cookie"?: string[] } | undefined)?.["set-cookie"];
    if (!setCookie) return;
    for (const cookie of setCookie) {
      const match = /sla_csrf=([^;]+)/.exec(cookie);
      if (match) this.csrfToken = decodeURIComponent(match[1]);
    }
  }

  async get(path: string) {
    const response = await this.agent
      .get(`/api${path}`)
      .set("Origin", FRONTEND_ORIGIN)
      .redirects(0);
    this.captureCsrf(response.headers);
    return response;
  }

  async post(path: string, body?: unknown) {
    // Establish/refresh the CSRF cookie the way a browser would on page load.
    if (!this.csrfToken) await this.get("/auth/me");

    const req = this.agent.post(`/api${path}`).set("Origin", FRONTEND_ORIGIN);
    if (this.csrfToken) req.set("x-csrf-token", this.csrfToken);
    const response = body === undefined ? await req.redirects(0) : await req.send(body as object).redirects(0);
    this.captureCsrf(response.headers);
    return response;
  }

  async patch(path: string, body?: unknown) {
    if (!this.csrfToken) await this.get("/auth/me");
    const req = this.agent.patch(`/api${path}`).set("Origin", FRONTEND_ORIGIN);
    if (this.csrfToken) req.set("x-csrf-token", this.csrfToken);
    const response = body === undefined ? await req.redirects(0) : await req.send(body as object).redirects(0);
    this.captureCsrf(response.headers);
    return response;
  }

  async put(path: string, body?: unknown) {
    if (!this.csrfToken) await this.get("/auth/me");
    const req = this.agent.put(`/api${path}`).set("Origin", FRONTEND_ORIGIN);
    if (this.csrfToken) req.set("x-csrf-token", this.csrfToken);
    const response = body === undefined ? await req.redirects(0) : await req.send(body as object).redirects(0);
    this.captureCsrf(response.headers);
    return response;
  }

  async delete(path: string) {
    if (!this.csrfToken) await this.get("/auth/me");
    const req = this.agent.delete(`/api${path}`).set("Origin", FRONTEND_ORIGIN);
    if (this.csrfToken) req.set("x-csrf-token", this.csrfToken);
    const response = await req.redirects(0);
    this.captureCsrf(response.headers);
    return response;
  }
}

export interface TestUser {
  id: number;
  email: string;
  password: string;
  fullName: string;
  client: TestClient;
}

let userCounter = 0;

/** 1 -> "A", 26 -> "Z", 27 -> "AA" (the name validator allows letters only). */
function letterLabel(n: number): string {
  let out = "";
  let value = n;
  while (value > 0) {
    value -= 1;
    out = String.fromCharCode(65 + (value % 26)) + out;
    value = Math.floor(value / 26);
  }
  return out || "A";
}

/** Registers a fresh student and returns a signed-in client. */
export async function registerStudent(app: Express, overrides?: Partial<{ email: string; password: string; fullName: string }>): Promise<TestUser> {
  userCounter += 1;
  const email = overrides?.email ?? `student${userCounter}.${Date.now()}@example.com`;
  const password = overrides?.password ?? "Password123";
  const fullName = overrides?.fullName ?? `Student ${letterLabel(userCounter)}`;

  const client = new TestClient(app);
  const response = await client.post("/auth/register", {
    fullName,
    email,
    password,
    confirmPassword: password,
    acceptTerms: true,
  });

  if (response.status !== 201) {
    throw new Error(`Registration failed: ${response.status} ${JSON.stringify(response.body)}`);
  }

  return { id: response.body.data.user.id, email, password, fullName, client };
}

/** Creates an administrator account directly in the database and signs in. */
export async function createAdminClient(app: Express): Promise<TestUser> {
  const { hashPassword } = await import("../../src/services/authService");
  const { execute, query } = await import("../../src/config/db");

  userCounter += 1;
  const email = `admin${userCounter}.${Date.now()}@example.com`;
  const password = "AdminPass123";
  const passwordHash = await hashPassword(password);
  await execute(
    `INSERT INTO users (full_name, email, password_hash, role, status, email_verified_at)
     VALUES ('Test Admin', ?, ?, 'admin', 'active', NOW())`,
    [email, passwordHash],
  );
  const rows = await query<{ id: number }[]>("SELECT id FROM users WHERE email = ?", [email]);

  const client = new TestClient(app);
  const response = await client.post("/auth/login", { email, password, remember: false });
  if (response.status !== 200) throw new Error(`Admin login failed: ${response.status}`);

  return { id: Number(rows[0].id), email, password, fullName: "Test Admin", client };
}
