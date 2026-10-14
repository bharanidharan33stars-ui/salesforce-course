import type { Request, Response } from "express";
import { asyncHandler } from "../utils/helpers";
import { ok, created } from "../middleware/errorHandler";
import { ApiError } from "../utils/errors";
import * as usersRepo from "../repositories/usersRepo";
import * as contentRepo from "../repositories/contentRepo";
import * as quizzesRepo from "../repositories/quizzesRepo";
import * as certificatesRepo from "../repositories/certificatesRepo";
import * as settingsRepo from "../repositories/settingsRepo";
import * as progressService from "../services/progressService";
import * as completionService from "../services/completionService";
import { formatDate } from "../utils/date";
import { env, smtpConfigured } from "../config/env";
import { publicUser } from "../utils/serialise";

/**
 * Administrator endpoints.
 * Every handler runs behind requireAdmin, which re-reads the role from MySQL
 * on each request - the browser can never grant itself admin access.
 */

function auditFrom(req: Request, action: string, entityType: string, entityId: string | number, details?: unknown) {
  return settingsRepo.audit({
    adminUserId: req.user!.id,
    action,
    entityType,
    entityId,
    details,
    ipAddress: req.ip ?? null,
  });
}

// ------------------------------------------------------------------ stats

export const dashboard = asyncHandler(async (req: Request, res: Response) => {
  const totalStudents = await usersRepo.countUsersByRole("student");

  const enrolledRows = await import("../config/db").then((m) =>
    m.query<{ count: number }[]>("SELECT COUNT(DISTINCT user_id) AS count FROM enrollments"),
  );
  const completedRows = await import("../config/db").then((m) =>
    m.query<{ count: number }[]>("SELECT COUNT(*) AS count FROM enrollments WHERE status = 'completed'"),
  );
  const activeStudents = await usersRepo.countActiveStudentsSince(7);
  const certificates = await certificatesRepo.countCertificates();
  const quizStats = await quizzesRepo.aggregateQuizStats();
  const emailIssues = await import("../config/db").then((m) =>
    m.query<{ count: number }[]>("SELECT COUNT(*) AS count FROM certificates WHERE email_status IN ('failed','retrying')"),
  );
  const recentAudit = await settingsRepo.listAuditLogs(10);

  return ok(res, {
    totalStudents,
    enrolledStudents: Number(enrolledRows[0]?.count ?? 0),
    activeStudentsLast7Days: activeStudents,
    completedCourses: Number(completedRows[0]?.count ?? 0),
    certificatesIssued: certificates,
    quiz: {
      totalAttempts: quizStats.totalAttempts,
      passedAttempts: quizStats.passedAttempts,
      passRate:
        quizStats.totalAttempts === 0
          ? 0
          : Math.round((quizStats.passedAttempts / quizStats.totalAttempts) * 100),
      studentsWithAPass: quizStats.distinctPassingStudents,
    },
    emailIssues: Number(emailIssues[0]?.count ?? 0),
    emailDeliveryMode: smtpConfigured ? "smtp" : "development",
    recentActivity: recentAudit.map((a) => ({
      id: Number(a.id),
      action: a.action,
      entityType: a.entity_type,
      entityId: a.entity_id,
      createdAt: a.created_at,
    })),
  });
});

// --------------------------------------------------------------- students

export const listStudents = asyncHandler(async (req: Request, res: Response) => {
  const { page, pageSize, search, sort } = req.query as unknown as {
    page: number;
    pageSize: number;
    search?: string;
    sort?: "newest" | "name" | "progress";
  };
  const { rows, total } = await usersRepo.listStudents({ search, page, pageSize, sort });
  return ok(res, {
    items: rows.map((r) => ({
      id: Number(r.id),
      fullName: r.full_name,
      email: r.email,
      status: r.status,
      emailVerifiedAt: r.email_verified_at,
      createdAt: r.created_at,
      enrolledAt: r.enrolled_at,
      completedAt: r.completed_at,
      certificateNumber: r.certificate_number,
    })),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  });
});

export const getStudent = asyncHandler(async (req: Request, res: Response) => {
  const studentId = Number(req.params.studentId);
  const user = await usersRepo.findById(studentId);
  if (!user) throw ApiError.notFound("Student not found.");

  const courseId = await progressService.getPrimaryCourseId();
  const progress = await progressService.getDashboard(studentId).catch(() => null);

  const attemptRows = await import("../config/db").then((m) =>
    m.query<{ id: number; quiz_id: number; score: number; passed: number; submitted_at: string | null; attempt_number: number }[]>(
      `SELECT a.id, a.quiz_id, a.score, a.passed, a.submitted_at, a.attempt_number, q.title AS quiz_title
         FROM quiz_attempts a JOIN quizzes q ON q.id = a.quiz_id
        WHERE a.user_id = ? AND a.status = 'submitted'
        ORDER BY a.submitted_at DESC LIMIT 50`,
      [studentId],
    ),
  );

  const certificate = await certificatesRepo.findCertificateByUserAndCourse(studentId, courseId);

  return ok(res, {
    user: publicUser(user),
    progress,
    quizAttempts: attemptRows.map((a) => ({
      id: Number(a.id),
      quizId: Number(a.quiz_id),
      attemptNumber: Number(a.attempt_number),
      score: Number(a.score),
      passed: a.passed === 1,
      submittedAt: a.submitted_at,
    })),
    certificate: certificate
      ? {
          id: Number(certificate.id),
          certificateNumber: certificate.certificate_number,
          verificationId: certificate.verification_id,
          issuedAt: certificate.issued_at,
          emailStatus: certificate.email_status,
          pdfStatus: certificate.pdf_status,
        }
      : null,
  });
});

export const updateStudentStatus = asyncHandler(async (req: Request, res: Response) => {
  const studentId = Number(req.params.studentId);
  const { status } = req.body as { status: "active" | "disabled" };
  const target = await usersRepo.findById(studentId);
  if (!target) throw ApiError.notFound("Student not found.");
  if (target.role === "admin" && status === "disabled") {
    throw ApiError.badRequest("Administrators cannot be disabled from this screen.");
  }
  await usersRepo.setUserStatus(studentId, status);
  if (status === "disabled") {
    await import("../config/db").then((m) =>
      m.execute(
        `DELETE FROM auth_sessions WHERE JSON_VALID(data) AND CAST(JSON_EXTRACT(data, '$.userId') AS UNSIGNED) = ?`,
        [studentId],
      ),
    );
  }
  await auditFrom(req, "student.status_changed", "user", studentId, { status });
  return ok(res, { id: studentId, status });
});

// ---------------------------------------------------------------- courses

export const listAdminCourses = asyncHandler(async (_req: Request, res: Response) => {
  const courses = await contentRepo.listAllCourses();
  const units = await contentRepo.listAllUnits();
  return ok(
    res,
    courses.map((c) => ({
      id: Number(c.id),
      title: c.title,
      slug: c.slug,
      description: c.description,
      published: c.published === 1,
      unitCount: units.filter((u) => Number(u.course_id) === Number(c.id)).length,
    })),
  );
});

export const createCourse = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as { title: string; slug: string; description: string | null; published: boolean };
  const id = await contentRepo.insertCourse(body);
  await auditFrom(req, "course.created", "course", id, { title: body.title });
  return created(res, { id, ...body });
});

export const updateCourse = asyncHandler(async (req: Request, res: Response) => {
  const id = Number(req.params.courseId);
  const existing = await contentRepo.findCourseById(id);
  if (!existing) throw ApiError.notFound("Course not found.");
  const body = req.body as { title: string; slug: string; description: string | null; published: boolean };
  await contentRepo.updateCourse(id, body);
  await auditFrom(req, "course.updated", "course", id, { published: body.published });
  return ok(res, { id, ...body });
});

// ------------------------------------------------------------------ units

export const listAdminUnits = asyncHandler(async (_req: Request, res: Response) => {
  const units = await contentRepo.listAllUnits();
  const courses = await contentRepo.listAllCourses();
  return ok(
    res,
    units.map((u) => ({
      id: Number(u.id),
      courseId: Number(u.course_id),
      courseTitle: courses.find((c) => c.id === u.course_id)?.title ?? "",
      title: u.title,
      slug: u.slug,
      description: u.description,
      sortOrder: Number(u.sort_order),
      published: u.published === 1,
    })),
  );
});

export const createUnit = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as {
    courseId: number;
    title: string;
    slug: string;
    description: string | null;
    sortOrder: number;
    published: boolean;
  };
  const course = await contentRepo.findCourseById(body.courseId);
  if (!course) throw ApiError.badRequest("The selected course does not exist.");
  const id = await contentRepo.insertUnit(body);
  await auditFrom(req, "unit.created", "unit", id, { title: body.title });
  return created(res, { id, ...body });
});

export const updateUnit = asyncHandler(async (req: Request, res: Response) => {
  const id = Number(req.params.unitId);
  const existing = await contentRepo.findUnitById(id);
  if (!existing) throw ApiError.notFound("Unit not found.");
  const body = req.body as {
    title: string;
    slug: string;
    description: string | null;
    sortOrder: number;
    published: boolean;
  };
  await contentRepo.updateUnit(id, body);
  await auditFrom(req, "unit.updated", "unit", id, { published: body.published });
  return ok(res, { id, ...body });
});

// ---------------------------------------------------------------- lessons

export const listAdminLessons = asyncHandler(async (req: Request, res: Response) => {
  const unitId = req.query.unitId ? Number(req.query.unitId) : undefined;
  const lessons = await contentRepo.listAllLessons(unitId);
  const units = await contentRepo.listAllUnits();
  return ok(
    res,
    lessons.map((l) => ({
      id: Number(l.id),
      unitId: Number(l.unit_id),
      unitTitle: units.find((u) => u.id === l.unit_id)?.title ?? "",
      title: l.title,
      slug: l.slug,
      summary: l.summary,
      contentType: l.content_type,
      isRequired: l.is_required === 1,
      sortOrder: Number(l.sort_order),
      published: l.published === 1,
    })),
  );
});

export const getAdminLesson = asyncHandler(async (req: Request, res: Response) => {
  const lessonId = Number(req.params.lessonId);
  const lesson = await contentRepo.findLessonById(lessonId);
  if (!lesson) throw ApiError.notFound("Lesson not found.");
  const unit = await contentRepo.findUnitById(Number(lesson.unit_id));
  return ok(res, {
    id: Number(lesson.id),
    unitId: Number(lesson.unit_id),
    unitTitle: unit?.title ?? "",
    title: lesson.title,
    slug: lesson.slug,
    summary: lesson.summary,
    content: lesson.content,
    contentType: lesson.content_type,
    resourceUrl: lesson.resource_url,
    isRequired: lesson.is_required === 1,
    sortOrder: Number(lesson.sort_order),
    published: lesson.published === 1,
  });
});

export const createLesson = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as Parameters<typeof contentRepo.insertLesson>[0];
  const unit = await contentRepo.findUnitById(body.unitId);
  if (!unit) throw ApiError.badRequest("The selected unit does not exist.");
  const id = await contentRepo.insertLesson(body);
  await auditFrom(req, "lesson.created", "lesson", id, { title: body.title });
  return created(res, { id, ...body });
});

export const updateLesson = asyncHandler(async (req: Request, res: Response) => {
  const id = Number(req.params.lessonId);
  const existing = await contentRepo.findLessonById(id);
  if (!existing) throw ApiError.notFound("Lesson not found.");
  const body = req.body as Omit<Parameters<typeof contentRepo.updateLesson>[1], never>;
  await contentRepo.updateLesson(id, body);
  await auditFrom(req, "lesson.updated", "lesson", id, { published: body.published });
  return ok(res, { id, ...body });
});

// ----------------------------------------------------------------- quizzes

export const listAdminQuizzes = asyncHandler(async (_req: Request, res: Response) => {
  const quizzes = await quizzesRepo.listAllQuizzes();
  return ok(
    res,
    quizzes.map((q) => ({
      id: Number(q.id),
      unitId: Number(q.unit_id),
      unitTitle: q.unit_title,
      title: q.title,
      description: q.description,
      passingPercentage: Number(q.passing_percentage),
      maxAttempts: Number(q.max_attempts),
      published: q.published === 1,
      isRequired: q.is_required === 1,
    })),
  );
});

export const createQuiz = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as Parameters<typeof quizzesRepo.insertQuiz>[0];
  const unit = await contentRepo.findUnitById(body.unitId);
  if (!unit) throw ApiError.badRequest("The selected unit does not exist.");
  const existing = await quizzesRepo.findQuizByUnit(body.unitId);
  if (existing) throw ApiError.conflict("This unit already has a quiz. Edit it instead.");
  const id = await quizzesRepo.insertQuiz(body);
  await auditFrom(req, "quiz.created", "quiz", id, { title: body.title });
  return created(res, { id, ...body });
});

export const updateQuiz = asyncHandler(async (req: Request, res: Response) => {
  const id = Number(req.params.quizId);
  const existing = await quizzesRepo.findQuizById(id);
  if (!existing) throw ApiError.notFound("Quiz not found.");
  const body = req.body as Omit<Parameters<typeof quizzesRepo.updateQuiz>[1], never> & { unitId?: number };
  await quizzesRepo.updateQuiz(id, body);
  await auditFrom(req, "quiz.updated", "quiz", id, { published: body.published });
  return ok(res, { id, ...body });
});

export const getQuizDetail = asyncHandler(async (req: Request, res: Response) => {
  const id = Number(req.params.quizId);
  const quiz = await quizzesRepo.findQuizById(id);
  if (!quiz) throw ApiError.notFound("Quiz not found.");
  const questions = await quizzesRepo.listQuestions(id);
  const options = await quizzesRepo.listOptions(questions.map((q) => Number(q.id)));
  return ok(res, {
    id: Number(quiz.id),
    unitId: Number(quiz.unit_id),
    title: quiz.title,
    description: quiz.description,
    passingPercentage: Number(quiz.passing_percentage),
    maxAttempts: Number(quiz.max_attempts),
    published: quiz.published === 1,
    isRequired: quiz.is_required === 1,
    questions: questions.map((q) => ({
      id: Number(q.id),
      questionText: q.question_text,
      questionType: q.question_type,
      explanation: q.explanation,
      sortOrder: Number(q.sort_order),
      options: options
        .filter((o) => Number(o.question_id) === Number(q.id))
        .map((o) => ({
          id: Number(o.id),
          optionText: o.option_text,
          isCorrect: o.is_correct === 1,
          sortOrder: Number(o.sort_order),
        })),
    })),
  });
});

export const createQuestion = asyncHandler(async (req: Request, res: Response) => {
  const quizId = Number(req.params.quizId);
  const quiz = await quizzesRepo.findQuizById(quizId);
  if (!quiz) throw ApiError.notFound("Quiz not found.");

  const body = req.body as {
    questionText: string;
    questionType: "multiple_choice" | "true_false" | "multiple_select";
    explanation: string | null;
    sortOrder: number;
    options: { optionText: string; isCorrect: boolean }[];
  };

  const questionId = await quizzesRepo.insertQuestion({
    quizId,
    questionText: body.questionText,
    questionType: body.questionType,
    explanation: body.explanation,
    sortOrder: body.sortOrder,
  });
  for (const [index, option] of body.options.entries()) {
    await quizzesRepo.insertOption({
      questionId,
      optionText: option.optionText,
      isCorrect: option.isCorrect,
      sortOrder: index,
    });
  }
  await auditFrom(req, "question.created", "question", questionId, { quizId });
  return created(res, { id: questionId });
});

export const updateQuestion = asyncHandler(async (req: Request, res: Response) => {
  const questionId = Number(req.params.questionId);
  const question = await quizzesRepo.findQuestionById(questionId);
  if (!question) throw ApiError.notFound("Question not found.");

  const body = req.body as {
    questionText: string;
    questionType: "multiple_choice" | "true_false" | "multiple_select";
    explanation: string | null;
    sortOrder: number;
    options: { optionText: string; isCorrect: boolean }[];
  };

  await quizzesRepo.updateQuestion(questionId, {
    questionText: body.questionText,
    questionType: body.questionType,
    explanation: body.explanation,
    sortOrder: body.sortOrder,
  });
  await quizzesRepo.deleteOptionsForQuestion(questionId);
  for (const [index, option] of body.options.entries()) {
    await quizzesRepo.insertOption({
      questionId,
      optionText: option.optionText,
      isCorrect: option.isCorrect,
      sortOrder: index,
    });
  }
  await auditFrom(req, "question.updated", "question", questionId);
  return ok(res, { id: questionId });
});

export const deleteQuestion = asyncHandler(async (req: Request, res: Response) => {
  const questionId = Number(req.params.questionId);
  const question = await quizzesRepo.findQuestionById(questionId);
  if (!question) throw ApiError.notFound("Question not found.");
  await quizzesRepo.deleteQuestion(questionId);
  await auditFrom(req, "question.deleted", "question", questionId);
  return ok(res, { deleted: true });
});

// ----------------------------------------------------------- certificates

export const listAdminCertificates = asyncHandler(async (req: Request, res: Response) => {
  const { page, pageSize, search, status } = req.query as unknown as {
    page: number;
    pageSize: number;
    search?: string;
    status?: string;
  };
  const { rows, total } = await certificatesRepo.listCertificates({ page, pageSize, search, status });
  return ok(res, {
    items: rows.map((c) => ({
      id: Number(c.id),
      certificateNumber: c.certificate_number,
      verificationId: c.verification_id,
      holderName: c.full_name,
      email: c.email,
      courseTitle: c.course_title,
      issuedAt: c.issued_at,
      issuedAtFormatted: formatDate(c.issued_at),
      pdfStatus: c.pdf_status,
      emailStatus: c.email_status,
      emailSentAt: c.email_sent_at,
      emailAttempts: Number(c.email_attempts),
    })),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    emailDeliveryMode: smtpConfigured ? "smtp" : "development",
  });
});

export const retryCertificateEmail = asyncHandler(async (req: Request, res: Response) => {
  const certificateId = Number(req.params.certificateId);
  const cert = await certificatesRepo.findCertificateById(certificateId);
  if (!cert) throw ApiError.notFound("Certificate not found.");

  const pdf = await completionService.ensurePdf(cert);
  const result = await completionService.sendCertificateEmail(
    { ...cert, email_sent_at: null },
    pdf,
  );
  await auditFrom(req, "certificate.email_retried", "certificate", certificateId, {
    sent: result.sent,
    simulated: result.simulated,
  });

  return ok(res, {
    sent: result.sent,
    simulated: result.simulated,
    reason: result.reason,
    message: result.sent
      ? result.simulated
        ? "SMTP is disabled: the e-mail was written to backend/storage/mail instead of being sent."
        : "The e-mail was accepted by the mail server."
      : `Delivery failed: ${result.reason ?? "unknown error"}`,
  });
});

export const downloadAdminCertificate = asyncHandler(async (req: Request, res: Response) => {
  const cert = await certificatesRepo.findCertificateById(Number(req.params.certificateId));
  if (!cert) throw ApiError.notFound("Certificate not found.");
  const pdf = await completionService.ensurePdf(cert);
  if (!pdf) throw ApiError.internal("The PDF could not be generated.");
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${cert.certificate_number}.pdf"`);
  res.setHeader("Cache-Control", "private, no-store");
  return res.status(200).end(pdf);
});

// --------------------------------------------------------------- settings

/** SMTP status reported by the settings endpoints (shared by get + save). */
function smtpStatus() {
  return {
    configured: smtpConfigured,
    mode: smtpConfigured ? ("smtp" as const) : ("development" as const),
    host: smtpConfigured ? env.SMTP_HOST : null,
    port: env.SMTP_PORT,
    from: env.SMTP_FROM,
  };
}

export const getSettings = asyncHandler(async (_req: Request, res: Response) => {
  const settings = await settingsRepo.getAllSettings();
  return ok(res, {
    settings,
    smtp: smtpStatus(),
  });
});

export const updateSettings = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as Record<string, string>;
  await settingsRepo.setSettings(body);
  await auditFrom(req, "settings.updated", "settings", "academy", { keys: Object.keys(body) });
  const settings = await settingsRepo.getAllSettings();
  return ok(res, { settings, smtp: smtpStatus() });
});

export const getAuditLogs = asyncHandler(async (_req: Request, res: Response) => {
  const logs = await settingsRepo.listAuditLogs(100);
  return ok(
    res,
    logs.map((a) => ({
      id: Number(a.id),
      adminUserId: a.admin_user_id,
      action: a.action,
      entityType: a.entity_type,
      entityId: a.entity_id,
      details: a.details,
      createdAt: a.created_at,
    })),
  );
});
