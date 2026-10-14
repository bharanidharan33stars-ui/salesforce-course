import { beforeAll, describe, expect, it } from "vitest";
import type { Express } from "express";
import { createApp } from "../src/app";
import { TestClient, registerStudent } from "./helpers/client";
import { clearTables } from "./setup";

/**
 * Authentication: registration policy, login, session lifecycle, password
 * reset, e-mail verification, and the security basics (lockout, CSRF).
 */

let app: Express;

beforeAll(async () => {
  app = createApp();
  await clearTables();
});

describe("POST /api/auth/register", () => {
  it("creates a student and starts a session", async () => {
    const client = new TestClient(app);
    const response = await client.post("/auth/register", {
      fullName: "Ada Lovelace",
      email: "ada@example.com",
      password: "Password123",
      confirmPassword: "Password123",
      acceptTerms: true,
    });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.user.email).toBe("ada@example.com");
    expect(response.body.data.user.role).toBe("student");
    expect(response.body.data.user).not.toHaveProperty("passwordHash");

    const me = await client.get("/auth/me");
    expect(me.status).toBe(200);
    expect(me.body.data.user.email).toBe("ada@example.com");
  });

  it("rejects a duplicate e-mail", async () => {
    const client = new TestClient(app);
    const response = await client.post("/auth/register", {
      fullName: "Ada Again",
      email: "ada@example.com",
      password: "Password123",
      confirmPassword: "Password123",
      acceptTerms: true,
    });
    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(response.body.success).toBe(false);
  });

  it("enforces the password policy", async () => {
    const client = new TestClient(app);
    const response = await client.post("/auth/register", {
      fullName: "Weak Password",
      email: "weak@example.com",
      password: "password",
      confirmPassword: "password",
      acceptTerms: true,
    });
    expect(response.status).toBe(422);
  });

  it("requires the terms checkbox", async () => {
    const client = new TestClient(app);
    const response = await client.post("/auth/register", {
      fullName: "No Terms",
      email: "noterms@example.com",
      password: "Password123",
      confirmPassword: "Password123",
      acceptTerms: false,
    });
    expect(response.status).toBe(422);
  });
});

describe("POST /api/auth/login", () => {
  it("signs a registered student in and out", async () => {
    const student = await registerStudent(app);

    const logout = await student.client.post("/auth/logout");
    expect(logout.status).toBe(200);

    const me = await student.client.get("/auth/me");
    expect(me.body.data.user).toBeNull();

    const login = await student.client.post("/auth/login", {
      email: student.email,
      password: student.password,
      remember: false,
    });
    expect(login.status).toBe(200);
    expect(login.body.data.user.id).toBe(student.id);
  });

  it("rejects a wrong password without revealing whether the account exists", async () => {
    const student = await registerStudent(app);
    const client = new TestClient(app);
    const response = await client.post("/auth/login", {
      email: student.email,
      password: "TotallyWrong999",
      remember: false,
    });
    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(response.body.success).toBe(false);
    // Same shape for a non-existent account.
    const ghost = await client.post("/auth/login", {
      email: "ghost@example.com",
      password: "TotallyWrong999",
      remember: false,
    });
    expect(ghost.status).toBe(response.status);
    expect(ghost.body.error.code).toBe(response.body.error.code);
  });
});

describe("CSRF protection", () => {
  it("rejects a state-changing request without the token", async () => {
    const student = await registerStudent(app);
    // Bypass the helper: send the session cookie but no x-csrf-token header.
    const response = await student.client.agent
      .post("/api/auth/logout")
      .set("Origin", "http://localhost:3000")
      .redirects(0);
    expect(response.status).toBe(403);
  });
});

describe("POST /api/auth/forgot-password + reset", () => {
  it("always answers the same way and completes a full reset cycle", async () => {
    const student = await registerStudent(app);
    const anonymous = new TestClient(app);

    const unknown = await anonymous.post("/auth/forgot-password", { email: "nobody@example.com" });
    const known = await anonymous.post("/auth/forgot-password", { email: student.email });
    expect(unknown.status).toBe(200);
    expect(known.status).toBe(200);
    expect(unknown.body.data.message).toBe(known.body.data.message);

    // Pull the token the mailer produced (dev transport writes to storage,
    // tests read it straight from the table).
    const { query } = await import("../src/config/db");
    const tokens = await query<{ token_hash: string; user_id: number }[]>(
      "SELECT token_hash, user_id FROM password_reset_tokens WHERE user_id = ? ORDER BY id DESC LIMIT 1",
      [student.id],
    );
    expect(tokens.length).toBe(1);

    // The stored value is a hash; the raw token was handed to the mailer.
    // For the test we insert a known raw token instead.
    const { execute } = await import("../src/config/db");
    const crypto = await import("node:crypto");
    const rawToken = "reset-token-for-testing-1234567890";
    const hash = crypto.createHash("sha256").update(rawToken).digest("hex");
    await execute(
      `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at, used_at)
       VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 1 HOUR), NULL)`,
      [student.id, hash],
    );

    const reset = await anonymous.post("/auth/reset-password", {
      token: rawToken,
      password: "BrandNewPass1",
      confirmPassword: "BrandNewPass1",
    });
    expect(reset.status).toBe(200);

    const oldPassword = await anonymous.post("/auth/login", {
      email: student.email,
      password: student.password,
      remember: false,
    });
    expect(oldPassword.status).toBeGreaterThanOrEqual(400);

    const newPassword = await anonymous.post("/auth/login", {
      email: student.email,
      password: "BrandNewPass1",
      remember: false,
    });
    expect(newPassword.status).toBe(200);
  });
});
