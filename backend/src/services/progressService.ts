import { env } from "../config/env";
import * as contentRepo from "../repositories/contentRepo";
import * as progressRepo from "../repositories/progressRepo";
import * as certificatesRepo from "../repositories/certificatesRepo";
import * as settingsRepo from "../repositories/settingsRepo";
import { computeProgress, issueCertificateIfEligible, type ProgressSummary } from "./completionService";
import { ApiError } from "../utils/errors";
import type { LessonRow, UnitRow } from "../types/domain";
import { formatDate } from "../utils/date";

/** Student-facing learning operations: enrollment, lessons and the dashboard. */

/** The academy currently teaches a single course; it is course id 1 after seeding. */
export async function getPrimaryCourseId(): Promise<number> {
  const courses = await contentRepo.listPublishedCourses();
  if (courses.length === 0) throw ApiError.notFound("No published course is available yet.");
  return Number(courses[0].id);
}

export async function ensureEnrolled(userId: number, courseId: number): Promise<boolean> {
  const existing = await progressRepo.findEnrollment(userId, courseId);
  if (existing) return false;
  await progressRepo.createEnrollment(userId, courseId);
  return true;
}

export interface DashboardData {
  course: { id: number; title: string; slug: string; description: string | null };
  progress: ProgressSummary;
  lastLesson: (progressRepo.LastAccessedLesson & { url: string }) | null;
  continueUrl: string;
  certificate: {
    id: number;
    certificateNumber: string;
    verificationId: string;
    issuedAt: string;
    pdfStatus: string;
    emailStatus: string;
    downloadUrl: string;
  } | null;
  emailDeliveryNote: string;
}

export async function getDashboard(userId: number): Promise<DashboardData> {
  const courseId = await getPrimaryCourseId();
  const course = await contentRepo.findCourseById(courseId);
  if (!course) throw ApiError.notFound("Course not found.");

  // No implicit enrolment here: `progress.enrolled` must reflect the student's
  // own "Enroll" action so the dashboard can show the enrolment call to action.
  const progress = await computeProgress(userId, courseId);
  if (!progress) throw ApiError.notFound("Course not found.");

  const last = await progressRepo.findLastAccessedLesson(userId, courseId);
  const certificateRow = await certificatesRepo.findCertificateByUserAndCourse(userId, courseId);
  const certificate = certificateRow ? await certificatesRepo.findCertificateById(certificateRow.id) : null;

  const units = await contentRepo.listPublishedUnits(courseId);
  const firstLesson = units.length > 0 ? (await contentRepo.listPublishedLessons(units[0].id))[0] : null;
  const continueUrl =
    last && last.status !== "completed"
      ? `/learn/${last.unit_slug}/${last.lesson_slug}`
      : firstLesson
        ? `/learn/${units[0].slug}/${firstLesson.slug}`
        : `/course/${course.slug}`;

  return {
    course: { id: Number(course.id), title: course.title, slug: course.slug, description: course.description },
    progress,
    lastLesson: last
      ? { ...last, url: `/learn/${last.unit_slug}/${last.lesson_slug}` }
      : null,
    continueUrl,
    certificate: certificate
      ? {
          id: Number(certificate.id),
          certificateNumber: certificate.certificate_number,
          verificationId: certificate.verification_id,
          issuedAt: certificate.issued_at,
          pdfStatus: certificate.pdf_status,
          emailStatus: certificate.email_status,
          downloadUrl: `/api/student/certificates/${certificate.id}/download`,
        }
      : null,
    emailDeliveryNote:
      certificate && certificate.email_status === "accepted"
        ? "Your certificate e-mail was accepted by the mail server."
        : certificate && certificate.email_status === "failed"
          ? "The certificate e-mail could not be delivered. You can retry it from your dashboard."
          : certificate && certificate.email_status === "retrying"
            ? "The certificate e-mail is waiting for another delivery attempt."
            : certificate
              ? "Your certificate e-mail is queued. If SMTP is not configured yet, it is saved to the server instead."
              : "",
  };
}

export interface LessonContext {
  course: { id: number; title: string; slug: string };
  unit: { id: number; title: string; slug: string; description: string | null };
  lesson: LessonRow;
  status: "not_started" | "in_progress" | "completed";
  completedAt: string | null;
  prev: { title: string; slug: string; unitSlug: string } | null;
  next: { title: string; slug: string; unitSlug: string } | null;
  unitLessons: { id: number; title: string; slug: string; isRequired: boolean; status: string }[];
  completionRule: string;
}

export async function getLessonContext(
  userId: number | null,
  unitSlug: string,
  lessonSlug: string,
): Promise<LessonContext> {
  const unit = await contentRepo.findUnitBySlug(unitSlug);
  if (!unit || unit.published !== 1) throw ApiError.notFound("Unit not found.");
  const course = await contentRepo.findCourseById(Number(unit.course_id));
  if (!course || course.published !== 1) throw ApiError.notFound("Course not found.");

  const lesson = await contentRepo.findPublishedLessonBySlug(Number(unit.id), lessonSlug);
  if (!lesson) throw ApiError.notFound("Lesson not found.");

  const siblings = await contentRepo.listPublishedLessons(Number(unit.id));
  const index = siblings.findIndex((l) => l.id === lesson.id);

  const prevSibling = index > 0 ? siblings[index - 1] : null;
  let nextSibling = index >= 0 && index < siblings.length - 1 ? siblings[index + 1] : null;
  let nextUnitSlug = unit.slug;

  if (!nextSibling) {
    const nextUnit = await contentRepo.findNextUnitFirstLesson(unit);
    if (nextUnit) {
      nextSibling = nextUnit.lesson;
      nextUnitSlug = nextUnit.unit.slug;
    }
  }

  let status: LessonContext["status"] = "not_started";
  let completedAt: string | null = null;

  if (userId) {
    const row = await progressRepo.findLessonProgress(userId, Number(lesson.id));
    if (row) {
      status = row.status === "completed" ? "completed" : "in_progress";
      completedAt = row.completed_at;
    }
  }

  const statuses = await Promise.all(
    siblings.map(async (s) => {
      if (!userId) return { id: Number(s.id), status: "not_started" as const };
      const p = await progressRepo.findLessonProgress(userId, Number(s.id));
      return { id: Number(s.id), status: p?.status ?? ("not_started" as const) };
    }),
  );

  const unitStatuses = siblings.map((s) => ({
    id: Number(s.id),
    title: s.title,
    slug: s.slug,
    isRequired: s.is_required === 1,
    status: statuses.find((item) => item.id === Number(s.id))?.status ?? "not_started",
  }));

  return {
    course: { id: Number(course.id), title: course.title, slug: course.slug },
    unit: { id: Number(unit.id), title: unit.title, slug: unit.slug, description: unit.description },
    lesson,
    status,
    completedAt,
    prev: prevSibling ? { title: prevSibling.title, slug: prevSibling.slug, unitSlug: unit.slug } : null,
    next: nextSibling ? { title: nextSibling.title, slug: nextSibling.slug, unitSlug: nextUnitSlug } : null,
    unitLessons: unitStatuses,
    completionRule: (await settingsRepo.getSetting("lesson_completion_rule")) || "manual",
  };
}

export interface LessonActionResult {
  status: "in_progress" | "completed";
  completedAt: string | null;
  courseCompleted: boolean;
  certificateIssued: boolean;
}

export async function startLesson(userId: number, lessonId: number): Promise<LessonActionResult> {
  const lesson = await contentRepo.findLessonById(lessonId);
  if (!lesson || lesson.published !== 1) throw ApiError.notFound("Lesson not found.");

  const unit = await contentRepo.findUnitById(Number(lesson.unit_id));
  if (!unit || unit.published !== 1) throw ApiError.notFound("Lesson not found.");
  await ensureEnrolled(userId, Number(unit.course_id));

  await progressRepo.startLesson(userId, lessonId);

  // Auto-completion is an explicit academy setting (off by default): a lesson
  // is only marked complete because the student asked for it.
  const rule = await settingsRepo.getSetting("lesson_completion_rule");
  if (rule === "auto") {
    return completeLesson(userId, lessonId);
  }

  const row = await progressRepo.findLessonProgress(userId, lessonId);
  return {
    status: row?.status ?? "in_progress",
    completedAt: row?.completed_at ?? null,
    courseCompleted: false,
    certificateIssued: false,
  };
}

export async function completeLesson(userId: number, lessonId: number): Promise<LessonActionResult> {
  const lesson = await contentRepo.findLessonById(lessonId);
  if (!lesson || lesson.published !== 1) throw ApiError.notFound("Lesson not found.");

  const unit = await contentRepo.findUnitById(Number(lesson.unit_id));
  if (!unit || unit.published !== 1) throw ApiError.notFound("Lesson not found.");

  await ensureEnrolled(userId, Number(unit.course_id));
  await progressRepo.touchLesson(userId, lessonId);
  await progressRepo.completeLesson(userId, lessonId);

  const issuance = await issueCertificateIfEligible(userId, Number(unit.course_id));
  const row = await progressRepo.findLessonProgress(userId, lessonId);

  return {
    status: row?.status ?? "completed",
    completedAt: row?.completed_at ?? null,
    courseCompleted: Boolean(issuance),
    certificateIssued: Boolean(issuance?.created),
  };
}

/** Public course overview payload used by /course and unit pages. */
export async function getCourseOverview(courseSlug: string) {
  const course = await contentRepo.findPublishedCourseBySlug(courseSlug);
  if (!course) throw ApiError.notFound("Course not found.");

  const units = await contentRepo.listPublishedUnits(Number(course.id));
  const lessons = await contentRepo.listLessonsByUnits(units.map((u) => Number(u.id)));

  const quizRows = await import("../repositories/quizzesRepo").then((m) => m.listPublishedQuizzes(Number(course.id)));
  const quizByUnit = new Map(quizRows.map((q) => [Number(q.unit_id), q]));

  return {
    id: Number(course.id),
    title: course.title,
    slug: course.slug,
    description: course.description,
    units: units.map((u: UnitRow) => {
      const unitLessons = lessons.filter((l) => Number(l.unit_id) === Number(u.id));
      const quiz = quizByUnit.get(Number(u.id));
      return {
        id: Number(u.id),
        title: u.title,
        slug: u.slug,
        description: u.description,
        sortOrder: Number(u.sort_order),
        lessonCount: unitLessons.length,
        requiredLessonCount: unitLessons.filter((l) => l.is_required === 1).length,
        lessons: unitLessons.map((l) => ({
          id: Number(l.id),
          title: l.title,
          slug: l.slug,
          summary: l.summary,
          contentType: l.content_type,
          isRequired: l.is_required === 1,
          sortOrder: Number(l.sort_order),
        })),
        quiz: quiz
          ? {
              id: Number(quiz.id),
              title: quiz.title,
              passingPercentage: Number(quiz.passing_percentage),
              maxAttempts: Number(quiz.max_attempts),
              isRequired: quiz.is_required === 1,
            }
          : null,
      };
    }),
    appUrl: env.FRONTEND_URL,
    completionRequirements: [
      "Complete every required lesson in all published units.",
      "Pass every required unit quiz (70% by default, configurable by the academy).",
    ],
  };
}

export function formatIssuedDate(value: string): string {
  return formatDate(value);
}
