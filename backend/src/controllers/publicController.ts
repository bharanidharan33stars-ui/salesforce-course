import type { Request, Response } from "express";
import * as certificatesRepo from "../repositories/certificatesRepo";
import * as settingsRepo from "../repositories/settingsRepo";
import { asyncHandler } from "../utils/helpers";
import { ok } from "../middleware/errorHandler";
import { ApiError } from "../utils/errors";
import { formatDate } from "../utils/date";
import { env, smtpConfigured } from "../config/env";

/**
 * Public endpoints. They must never expose more than the verification
 * essentials: who passed, which course, when, and the certificate number.
 */

export const verifyCertificate = asyncHandler(async (req: Request, res: Response) => {
  const verificationId = String(req.params.certificateId ?? "");
  const cert = await certificatesRepo.findByVerificationId(verificationId);
  if (!cert) throw ApiError.notFound("No certificate matches this verification ID.");

  const settings = await settingsRepo.getAllSettings();

  return ok(res, {
    valid: true,
    certificateNumber: cert.certificate_number,
    holderName: cert.full_name,
    courseTitle: cert.course_title,
    issuedAtFormatted: formatDate(cert.issued_at),
    academyName: settings.academy_name,
    footerNote: settings.certificate_footer_note,
    // No e-mail address, no user id, no internal storage details.
  });
});

export const publicSettings = asyncHandler(async (_req: Request, res: Response) => {
  const settings = await settingsRepo.getAllSettings();
  return ok(res, {
    academyName: settings.academy_name,
    supportEmail: settings.support_email,
    courseTitle: settings.course_title,
    aiAssistantEnabled: settings.ai_assistant_enabled === "true",
    emailDeliveryMode: smtpConfigured ? "smtp" : "development",
    frontendUrl: env.FRONTEND_URL,
  });
});
