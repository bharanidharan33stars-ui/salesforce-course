import type { Request, Response } from "express";
import { env } from "../config/env";
import * as progressService from "../services/progressService";
import * as completionService from "../services/completionService";
import * as certificatesRepo from "../repositories/certificatesRepo";
import * as progressRepo from "../repositories/progressRepo";
import * as settingsRepo from "../repositories/settingsRepo";
import { certificateStorage } from "../services/storage";
import { certificateEmail, sendMail } from "../services/mailer";
import { asyncHandler } from "../utils/helpers";
import { ok, created } from "../middleware/errorHandler";
import { ApiError } from "../utils/errors";
import { formatDate } from "../utils/date";
import { logger } from "../utils/logger";

/** Everything a signed-in student can do with their own learning data. */

export const dashboard = asyncHandler(async (req: Request, res: Response) => {
  const data = await progressService.getDashboard(req.user!.id);
  return ok(res, data);
});

export const enrollments = asyncHandler(async (req: Request, res: Response) => {
  const rows = await progressRepo.listEnrollments(req.user!.id);
  return ok(
    res,
    rows.map((r) => ({
      id: Number(r.id),
      courseId: Number(r.course_id),
      enrolledAt: r.enrolled_at,
      completedAt: r.completed_at,
      status: r.status,
    })),
  );
});

export const enroll = asyncHandler(async (req: Request, res: Response) => {
  const courseId = Number(req.params.courseId);
  const createdNew = await progressService.ensureEnrolled(req.user!.id, courseId);
  return created(res, { enrolled: true, created: createdNew });
});

export const lessonView = asyncHandler(async (req: Request, res: Response) => {
  const lessonId = Number(req.params.lessonId);
  const lesson = await import("../repositories/contentRepo").then((m) => m.findLessonById(lessonId));
  if (!lesson || lesson.published !== 1) throw ApiError.notFound("Lesson not found.");
  const unit = await import("../repositories/contentRepo").then((m) => m.findUnitById(Number(lesson.unit_id)));
  if (!unit) throw ApiError.notFound("Lesson not found.");
  const context = await progressService.getLessonContext(
    req.user!.id,
    unit.slug,
    lesson.slug,
  );
  return ok(res, context);
});

/** Same payload, addressed by the URL-friendly unit + lesson slugs. */
export const lessonViewBySlug = asyncHandler(async (req: Request, res: Response) => {
  const context = await progressService.getLessonContext(
    req.user!.id,
    req.params.unitSlug,
    req.params.lessonSlug,
  );
  return ok(res, context);
});

export const startLesson = asyncHandler(async (req: Request, res: Response) => {
  const result = await progressService.startLesson(req.user!.id, Number(req.params.lessonId));
  return ok(res, result);
});

export const completeLesson = asyncHandler(async (req: Request, res: Response) => {
  const result = await progressService.completeLesson(req.user!.id, Number(req.params.lessonId));
  return ok(res, result);
});

export const progress = asyncHandler(async (req: Request, res: Response) => {
  const summary = await completionService.computeProgress(req.user!.id, await progressService.getPrimaryCourseId());
  return ok(res, summary);
});

// ------------------------------------------------------------ certificates

export const myCertificates = asyncHandler(async (req: Request, res: Response) => {
  const rows = await certificatesRepo.listCertificates({ page: 1, pageSize: 50 });
  const mine = rows.rows.filter((r) => Number(r.user_id) === req.user!.id);
  return ok(
    res,
    mine.map((c) => ({
      id: Number(c.id),
      certificateNumber: c.certificate_number,
      verificationId: c.verification_id,
      courseTitle: c.course_title,
      issuedAt: c.issued_at,
      issuedAtFormatted: formatDate(c.issued_at),
      pdfStatus: c.pdf_status,
      emailStatus: c.email_status,
      emailSentAt: c.email_sent_at,
    })),
  );
});

export const myCertificate = asyncHandler(async (req: Request, res: Response) => {
  const cert = await certificatesRepo.findCertificateById(Number(req.params.certificateId));
  if (!cert) throw ApiError.notFound("Certificate not found.");
  if (Number(cert.user_id) !== req.user!.id && req.user!.role !== "admin") {
    throw ApiError.notFound("Certificate not found.");
  }
  return ok(res, {
    id: Number(cert.id),
    certificateNumber: cert.certificate_number,
    verificationId: cert.verification_id,
    courseTitle: cert.course_title,
    holderName: cert.full_name,
    issuedAt: cert.issued_at,
    issuedAtFormatted: formatDate(cert.issued_at),
    pdfStatus: cert.pdf_status,
    emailStatus: cert.email_status,
    emailSentAt: cert.email_sent_at,
    verifyUrl: `${env.FRONTEND_URL}/verify-certificate/${cert.verification_id}`,
  });
});

export const downloadCertificate = asyncHandler(async (req: Request, res: Response) => {
  const cert = await certificatesRepo.findCertificateById(Number(req.params.certificateId));
  if (!cert) throw ApiError.notFound("Certificate not found.");
  if (Number(cert.user_id) !== req.user!.id && req.user!.role !== "admin") {
    throw ApiError.notFound("Certificate not found.");
  }

  const pdf = await completionService.ensurePdf(cert);
  if (!pdf) {
    throw ApiError.internal(
      "The PDF could not be generated yet. It can be retried from your dashboard.",
    );
  }

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Length", pdf.length);
  res.setHeader("Content-Disposition", `attachment; filename="${cert.certificate_number}.pdf"`);
  // Private document: never cacheable by shared proxies.
  res.setHeader("Cache-Control", "private, no-store");
  return res.status(200).end(pdf);
});

export const resendCertificateEmail = asyncHandler(async (req: Request, res: Response) => {
  const cert = await certificatesRepo.findCertificateById(Number(req.params.certificateId));
  if (!cert) throw ApiError.notFound("Certificate not found.");
  if (Number(cert.user_id) !== req.user!.id) throw ApiError.notFound("Certificate not found.");

  const setting = await settingsRepo.getSetting("require_email_verification_for_certificate");
  if (setting === "true" && !cert.email_verified_at) {
    throw ApiError.forbidden("Verify your e-mail address before requesting certificate e-mails.");
  }

  const pdf = await completionService.ensurePdf(cert);
  const message = certificateEmail({
    name: cert.full_name,
    courseTitle: cert.course_title,
    certificateNumber: cert.certificate_number,
    completionDate: formatDate(cert.issued_at),
    dashboardUrl: `${env.FRONTEND_URL}/dashboard`,
    verifyUrl: `${env.FRONTEND_URL}/verify-certificate/${cert.verification_id}`,
  });
  message.to = cert.email;
  if (pdf) {
    message.attachments = [
      { filename: `${cert.certificate_number}.pdf`, content: pdf, contentType: "application/pdf" },
    ];
  }

  const logId = await certificatesRepo.insertEmailLog({
    userId: cert.user_id,
    certificateId: cert.id,
    emailType: "certificate_resend",
    recipientEmail: cert.email,
    status: "pending",
  });

  const result = await sendMail(message);
  const attempts = cert.email_attempts + 1;

  if (result.accepted) {
    await certificatesRepo.updateEmailLog(logId, { status: "accepted", errorMessage: null });
    await certificatesRepo.updateCertificateEmail(cert.id, {
      status: "accepted",
      sentAt: new Date().toISOString().slice(0, 19).replace("T", " "),
      attempts,
    });
    return ok(res, {
      sent: true,
      simulated: result.simulated,
      message: result.simulated
        ? "SMTP is not configured, so the e-mail was written to the server's mail folder instead of being sent."
        : "The certificate e-mail was accepted by the mail server.",
    });
  }

  await certificatesRepo.updateEmailLog(logId, { status: "failed", errorMessage: result.error ?? "failed" });
  await certificatesRepo.updateCertificateEmail(cert.id, {
    status: attempts >= 3 ? "failed" : "retrying",
    sentAt: null,
    attempts,
  });
  logger.warn("Certificate e-mail retry failed", { certificateId: cert.id, error: result.error });
  return ok(res, {
    sent: false,
    message: `The e-mail could not be delivered: ${result.error ?? "unknown error"}. The certificate is still available for download.`,
  });
});

export { certificateStorage };

export const requestCertificate = asyncHandler(async (req: Request, res: Response) => {
  // Manual "check now" - safe because issuance is re-verified server-side.
  const result = await completionService.issueCertificateIfEligible(
    req.user!.id,
    await progressService.getPrimaryCourseId(),
  );
  if (!result) {
    throw ApiError.badRequest("Complete every required lesson and pass every required quiz first.");
  }
  return created(res, {
    id: Number(result.certificate.id),
    certificateNumber: result.certificate.certificate_number,
    created: result.created,
  });
});
