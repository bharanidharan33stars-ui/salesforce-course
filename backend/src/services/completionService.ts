import { withTransaction } from "../config/db";
import { env } from "../config/env";
import * as contentRepo from "../repositories/contentRepo";
import * as progressRepo from "../repositories/progressRepo";
import * as quizzesRepo from "../repositories/quizzesRepo";
import * as certificatesRepo from "../repositories/certificatesRepo";
import * as settingsRepo from "../repositories/settingsRepo";
import { renderCertificatePdf } from "./certificatePdf";
import { certificateStorage } from "./storage";
import { certificateEmail, sendMail } from "./mailer";
import { certificateNumber, randomVerificationId } from "../utils/tokens";
import { isDuplicateKeyError } from "../utils/errors";
import { logger } from "../utils/logger";
import { formatDate } from "../utils/date";

/**
 * Course progress + completion engine.
 *
 * Progress definition (used identically by the dashboard and the certificate
 * checks, so the two can never disagree):
 *
 *   percent = (completed required lessons + passed required quizzes)
 *           / (required lessons          + required quizzes)  * 100
 *
 * A student "completes the course" when every required lesson is completed and
 * every required quiz has at least one passing attempt.
 */

export interface ProgressSummary {
  enrolled: boolean;
  enrolledAt: string | null;
  completedAt: string | null;
  status: string | null;
  percent: number;
  lessons: { requiredTotal: number; requiredCompleted: number; optionalTotal: number };
  quizzes: {
    requiredTotal: number;
    passed: number;
    items: {
      quizId: number;
      unitId: number;
      unitSlug: string;
      unitTitle: string;
      passed: boolean;
      attempts: number;
      passingPercentage: number;
      isRequired: boolean;
    }[];
  };
  units: {
    unitId: number;
    title: string;
    slug: string;
    requiredTotal: number;
    requiredCompleted: number;
    quizPassed: boolean;
    complete: boolean;
  }[];
  totals: { units: number; completedUnits: number };
  eligibleForCertificate: boolean;
}

export async function computeProgress(
  userId: number,
  courseId: number,
): Promise<ProgressSummary | null> {
  const course = await contentRepo.findCourseById(courseId);
  if (!course || !course.published) return null;

  const enrollment = await progressRepo.findEnrollment(userId, courseId);
  const units = await contentRepo.listPublishedUnits(courseId);
  const lessons = await contentRepo.listLessonsByUnits(units.map((u) => u.id));
  const quizSummary = await quizzesRepo.listQuizPassSummary(userId, courseId);

  const requiredLessons = lessons.filter((l) => l.is_required === 1);
  const optionalLessons = lessons.filter((l) => l.is_required === 0);

  const completedIds = await progressRepo.listCompletedLessonIds(
    userId,
    lessons.map((l) => l.id),
  );
  const completedSet = new Set(completedIds);
  const requiredCompleted = requiredLessons.filter((l) => completedSet.has(l.id)).length;

  const requiredQuizzes = quizSummary.filter((q) => q.is_required === 1);
  const passedQuizzes = quizSummary.filter((q) => Number(q.passed) === 1).length;
  const requiredQuizzesPassed = requiredQuizzes.filter((q) => Number(q.passed) === 1).length;

  const totalItems = requiredLessons.length + requiredQuizzes.length;
  const completedItems = requiredCompleted + requiredQuizzesPassed;
  const percent = totalItems === 0 ? 0 : Math.round((completedItems / totalItems) * 100);

  const quizByUnit = new Map(quizSummary.map((q) => [Number(q.unit_id), q]));

  const unitRows = units.map((unit) => {
    const unitLessons = lessons.filter((l) => l.unit_id === unit.id);
    const unitRequired = unitLessons.filter((l) => l.is_required === 1);
    const unitCompleted = unitRequired.filter((l) => completedSet.has(l.id)).length;
    const quiz = quizByUnit.get(Number(unit.id));
    const quizPassed = quiz ? Number(quiz.passed) === 1 : true; // a unit without a quiz counts as satisfied
    return {
      unitId: Number(unit.id),
      title: unit.title,
      slug: unit.slug,
      requiredTotal: unitRequired.length,
      requiredCompleted: unitCompleted,
      quizPassed,
      complete: unitRequired.length === unitCompleted && quizPassed,
    };
  });

  const completedUnits = unitRows.filter((u) => u.complete).length;
  const eligible =
    Boolean(enrollment) &&
    requiredLessons.length === requiredCompleted &&
    requiredQuizzes.length === requiredQuizzesPassed;

  return {
    enrolled: Boolean(enrollment),
    enrolledAt: enrollment?.enrolled_at ?? null,
    completedAt: enrollment?.completed_at ?? null,
    status: enrollment?.status ?? null,
    percent,
    lessons: {
      requiredTotal: requiredLessons.length,
      requiredCompleted,
      optionalTotal: optionalLessons.length,
    },
    quizzes: {
      requiredTotal: requiredQuizzes.length,
      passed: requiredQuizzesPassed,
      items: quizSummary.map((q) => ({
        quizId: Number(q.quiz_id),
        unitId: Number(q.unit_id),
        unitSlug: q.unit_slug,
        unitTitle: q.unit_title,
        passed: Number(q.passed) === 1,
        attempts: Number(q.attempts),
        passingPercentage: Number(q.passing_percentage),
        isRequired: q.is_required === 1,
      })),
    },
    units: unitRows,
    totals: { units: units.length, completedUnits },
    eligibleForCertificate: eligible,
  };
}

export interface IssuanceResult {
  certificate: certificatesRepo.CertificateWithUser;
  created: boolean;
}

/**
 * Called after a quiz pass or a lesson completion. Idempotent: repeating it
 * (page refresh, double submit, multiple tabs) never creates a second
 * certificate, because of the UNIQUE(user_id, course_id) constraint.
 */
export async function issueCertificateIfEligible(
  userId: number,
  courseId: number,
): Promise<IssuanceResult | null> {
  const existing = await certificatesRepo.findCertificateByUserAndCourse(userId, courseId);
  if (existing) {
    const full = await certificatesRepo.findCertificateById(existing.id);
    return full ? { certificate: full, created: false } : null;
  }

  const progress = await computeProgress(userId, courseId);
  if (!progress || !progress.eligibleForCertificate) return null;

  let certificateId: number;
  try {
    certificateId = await withTransaction(async (conn) => {
      // 1. stamp the enrollment as completed (inside the transaction)
      await conn.execute(
        "UPDATE enrollments SET status = 'completed', completed_at = COALESCE(completed_at, NOW()) WHERE user_id = ? AND course_id = ?",
        [userId, courseId],
      );
      // 2. create the certificate; the unique key is the real safety net
      const [result] = await conn.execute(
        `INSERT INTO certificates (user_id, course_id, certificate_number, verification_id)
         VALUES (?, ?, ?, ?)`,
        [userId, courseId, certificateNumber(env.NODE_ENV === "production" ? new Date().getFullYear() : new Date().getFullYear()), randomVerificationId()],
      );
      return (result as { insertId: number }).insertId;
    });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      // Another request won the race - reuse its certificate.
      const winner = await certificatesRepo.findCertificateByUserAndCourse(userId, courseId);
      if (!winner) throw error;
      const full = await certificatesRepo.findCertificateById(winner.id);
      return full ? { certificate: full, created: false } : null;
    }
    throw error;
  }

  const certificate = await certificatesRepo.findCertificateById(certificateId);
  if (!certificate) return null;

  // PDF + e-mail happen after commit; failures are retried from the dashboard.
  void generateAndDeliver(certificateId).catch((error) => {
    logger.error("Post-issuance processing failed", { certificateId, error: (error as Error).message });
  });

  return { certificate, created: true };
}

/** Generates the PDF (if missing) and attempts the notification e-mail. */
export async function generateAndDeliver(certificateId: number): Promise<void> {
  const certificate = await certificatesRepo.findCertificateById(certificateId);
  if (!certificate) return;

  const pdfBuffer = await ensurePdf(certificate);
  await sendCertificateEmail(certificate, pdfBuffer);
}

export async function ensurePdf(
  certificate: certificatesRepo.CertificateWithUser,
): Promise<Buffer | null> {
  const key = `cert_${certificate.id}_${certificate.verification_id}.pdf`;

  if (certificate.pdf_status === "generated" && certificate.pdf_storage_key) {
    const existing = await certificateStorage.read(certificate.pdf_storage_key);
    if (existing) return existing;
  }

  try {
    const settings = await settingsRepo.getAllSettings();
    const buffer = await renderCertificatePdf({
      studentName: certificate.full_name,
      courseTitle: certificate.course_title,
      completionDate: formatDate(certificate.issued_at),
      certificateNumber: certificate.certificate_number,
      academyName: settings.academy_name || "Salesforce Learning Academy",
      signer: settings.certificate_signer || "The Salesforce Learning Academy Team",
      footerNote:
        settings.certificate_footer_note ||
        "Academy-issued course-completion certificate. This is not an official Salesforce certification.",
      verificationUrl: `${env.FRONTEND_URL}/verify-certificate/${certificate.verification_id}`,
    });
    await certificateStorage.save(key, buffer);
    await certificatesRepo.updateCertificatePdf(certificate.id, { storageKey: key, status: "generated" });
    return buffer;
  } catch (error) {
    logger.error("Certificate PDF generation failed", {
      certificateId: certificate.id,
      error: (error as Error).message,
    });
    await certificatesRepo.updateCertificatePdf(certificate.id, {
      storageKey: null,
      status: "failed",
    });
    return null;
  }
}

export async function sendCertificateEmail(
  certificate: certificatesRepo.CertificateWithUser,
  pdfBuffer: Buffer | null,
): Promise<{ sent: boolean; simulated: boolean; reason?: string }> {
  if (certificate.email_sent_at) {
    return { sent: false, simulated: false, reason: "already sent" };
  }

  const requireVerified = await settingsRepo.getSetting("require_email_verification_for_certificate");
  if (requireVerified === "true" && !certificate.email_verified_at) {
    await certificatesRepo.updateCertificateEmail(certificate.id, {
      status: "pending",
      sentAt: null,
      attempts: certificate.email_attempts,
    });
    return { sent: false, simulated: false, reason: "awaiting e-mail verification" };
  }

  await certificatesRepo.updateCertificateEmail(certificate.id, {
    status: certificate.email_attempts > 0 ? "retrying" : "pending",
    sentAt: null,
    attempts: certificate.email_attempts,
  });

  const logId = await certificatesRepo.insertEmailLog({
    userId: certificate.user_id,
    certificateId: certificate.id,
    emailType: "certificate_issued",
    recipientEmail: certificate.email,
    status: "pending",
  });

  const message = certificateEmail({
    name: certificate.full_name,
    courseTitle: certificate.course_title,
    certificateNumber: certificate.certificate_number,
    completionDate: formatDate(certificate.issued_at),
    dashboardUrl: `${env.FRONTEND_URL}/dashboard`,
    verifyUrl: `${env.FRONTEND_URL}/verify-certificate/${certificate.verification_id}`,
  });
  message.to = certificate.email;

  if (pdfBuffer) {
    message.attachments = [
      {
        filename: `${certificate.certificate_number}.pdf`,
        content: pdfBuffer,
        contentType: "application/pdf",
      },
    ];
  }

  const result = await sendMail(message);
  const attempts = certificate.email_attempts + 1;

  if (result.accepted) {
    await certificatesRepo.updateEmailLog(logId, { status: "accepted", errorMessage: null });
    await certificatesRepo.updateCertificateEmail(certificate.id, {
      status: "accepted",
      sentAt: new Date().toISOString().slice(0, 19).replace("T", " "),
      attempts,
    });
    return { sent: true, simulated: result.simulated };
  }

  await certificatesRepo.updateEmailLog(logId, { status: "failed", errorMessage: result.error ?? "delivery failed" });
  await certificatesRepo.updateCertificateEmail(certificate.id, {
    status: attempts >= 3 ? "failed" : "retrying",
    sentAt: null,
    attempts,
  });
  return { sent: false, simulated: false, reason: result.error };
}
