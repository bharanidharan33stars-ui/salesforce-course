import { z } from "zod";
import { PASSWORD_POLICY_TEXT } from "./constants";

/**
 * Client-side mirrors of the backend rules (see backend/src/validators/schemas.ts).
 * They give instant feedback in the form, but the server always re-validates.
 */

export const passwordPolicy = z
  .string()
  .min(8, PASSWORD_POLICY_TEXT)
  .max(128, "Password is too long.")
  .refine((v) => /[A-Za-z]/.test(v), PASSWORD_POLICY_TEXT)
  .refine((v) => /[0-9]/.test(v), PASSWORD_POLICY_TEXT);

const emailField = z
  .string()
  .trim()
  .min(5, "Enter a valid e-mail address.")
  .refine((v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v), "Enter a valid e-mail address.");

const nameField = z
  .string()
  .trim()
  .min(2, "Enter your full name.")
  .max(150, "Name is too long.")
  .refine((v) => /^[A-Za-zÀ-ÿ' .-]+$/.test(v), "Only letters, spaces, hyphens and apostrophes.");

export const signupSchema = z
  .object({
    fullName: nameField,
    email: emailField,
    password: passwordPolicy,
    confirmPassword: z.string(),
    acceptTerms: z.literal(true, { message: "Please accept the terms and privacy policy." }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, "Enter your password."),
  remember: z.boolean().optional().default(false),
});

export const forgotPasswordSchema = z.object({ email: emailField });

export const resetPasswordSchema = z
  .object({
    token: z.string().min(10, "This reset link is not valid."),
    password: passwordPolicy,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
