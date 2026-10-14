import { describe, expect, it } from "vitest";
import { loginSchema, signupSchema, forgotPasswordSchema, passwordPolicy } from "@/lib/validators";

describe("passwordPolicy", () => {
  it("accepts 8+ characters containing a letter and a number", () => {
    expect(passwordPolicy.safeParse("Password1").success).toBe(true);
  });

  it("rejects short, letter-only and number-only passwords", () => {
    expect(passwordPolicy.safeParse("Pass1").success).toBe(false);
    expect(passwordPolicy.safeParse("Onlyletters").success).toBe(false);
    expect(passwordPolicy.safeParse("12345678").success).toBe(false);
  });
});

describe("signupSchema", () => {
  const valid = {
    fullName: "Ada Lovelace",
    email: "ada@example.com",
    password: "Password123",
    confirmPassword: "Password123",
    acceptTerms: true as const,
  };

  it("accepts a complete, valid signup", () => {
    expect(signupSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects mismatched passwords and points at the confirm field", () => {
    const result = signupSchema.safeParse({ ...valid, confirmPassword: "Different1" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path.includes("confirmPassword"))).toBe(true);
    }
  });

  it("rejects an invalid e-mail address", () => {
    expect(signupSchema.safeParse({ ...valid, email: "not-an-email" }).success).toBe(false);
  });

  it("rejects unchecked terms", () => {
    expect(signupSchema.safeParse({ ...valid, acceptTerms: false }).success).toBe(false);
  });

  it("rejects names with digits or symbols", () => {
    expect(signupSchema.safeParse({ ...valid, fullName: "R2D2 <script>" }).success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("accepts valid credentials", () => {
    expect(
      loginSchema.safeParse({ email: "ada@example.com", password: "Password123" }).success,
    ).toBe(true);
  });

  it("requires a password", () => {
    expect(loginSchema.safeParse({ email: "ada@example.com", password: "" }).success).toBe(false);
  });

  it("defaults remember to false", () => {
    const parsed = loginSchema.parse({ email: "ada@example.com", password: "Password123" });
    expect(parsed.remember).toBe(false);
  });
});

describe("forgotPasswordSchema", () => {
  it("only needs an e-mail", () => {
    expect(forgotPasswordSchema.safeParse({ email: "ada@example.com" }).success).toBe(true);
    expect(forgotPasswordSchema.safeParse({ email: "nope" }).success).toBe(false);
  });
});
