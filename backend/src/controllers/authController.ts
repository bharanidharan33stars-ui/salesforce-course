import type { Request, Response } from "express";
import { env } from "../config/env";
import * as authService from "../services/authService";
import * as usersRepo from "../repositories/usersRepo";
import { asyncHandler } from "../utils/helpers";
import { ok, created } from "../middleware/errorHandler";
import { ApiError } from "../utils/errors";
import { publicUser } from "../utils/serialise";

/**
 * Authentication endpoints.
 * All state lives in an HTTP-only session cookie - no token is ever exposed
 * to JavaScript, and passwords are never logged or echoed back.
 */

export const register = asyncHandler(async (req: Request, res: Response) => {
  const { fullName, email, password, acceptTerms } = req.body as {
    fullName: string;
    email: string;
    password: string;
    acceptTerms: boolean;
  };
  if (!acceptTerms) throw ApiError.badRequest("You must accept the terms and privacy policy.");

  const { userId } = await authService.registerUser({ fullName, email, password });

  // Enrolment is an explicit step in the learning flow (Register -> Sign in ->
  // Enroll -> Study): the dashboard and course page both offer an "Enroll"
  // action, and starting a lesson also enrolls as a safety net. Registration
  // itself deliberately does not enrol, so the student sees that step.

  await authService.startSession(req, userId, false);

  const user = await usersRepo.findById(userId);
  return created(res, {
    user: user ? publicUser(user) : null,
    message: "Your account was created. Check your inbox to verify your e-mail address.",
  });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password, remember } = req.body as { email: string; password: string; remember?: boolean };
  const userId = await authService.authenticate(email, password);
  await authService.startSession(req, userId, Boolean(remember));
  const user = await usersRepo.findById(userId);
  return ok(res, { user: user ? publicUser(user) : null });
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  await authService.endSession(req);
  res.clearCookie("sla.sid", { path: "/" });
  return ok(res, { message: "Signed out." });
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) return ok(res, { user: null });
  const user = await usersRepo.findById(req.user.id);
  return ok(res, {
    user: user ? publicUser(user) : null,
    csrfToken: req.session?.csrfToken ?? null,
  });
});

export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body as { email: string };
  await authService.requestPasswordReset(email);
  // Always the same answer, so the endpoint cannot be used to probe accounts.
  return ok(res, {
    message: "If an account exists for that address, a password reset link has been sent.",
  });
});

export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const { token, password } = req.body as { token: string; password: string };
  await authService.resetPassword(token, password);
  return ok(res, { message: "Your password has been changed. You can sign in now." });
});

export const verifyEmail = asyncHandler(async (req: Request, res: Response) => {
  const { token } = req.body as { token: string };
  await authService.verifyEmailToken(token);
  return ok(res, { message: "Your e-mail address has been verified. Thank you!" });
});

export const resendVerification = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  await authService.resendVerification(req.user.id);
  return ok(res, { message: "If your address still needs verification, a new link has been sent." });
});

/** Exposed so the frontend can show the correct support address. */
export const meta = asyncHandler(async (_req: Request, res: Response) => {
  return ok(res, { frontendUrl: env.FRONTEND_URL });
});
