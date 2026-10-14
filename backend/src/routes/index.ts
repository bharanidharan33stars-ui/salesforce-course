import { Router } from "express";
import * as auth from "../controllers/authController";
import * as courses from "../controllers/courseController";
import * as student from "../controllers/studentController";
import * as quizzes from "../controllers/quizController";
import * as admin from "../controllers/adminController";
import * as publicApi from "../controllers/publicController";
import { requireAdmin, requireAuth } from "../middleware/auth";
import { validate } from "../middleware/validate";
import * as schemas from "../validators/schemas";
import {
  authLimiter,
  emailRetryLimiter,
  quizSubmitLimiter,
  resetLimiter,
} from "../middleware/rateLimit";

export const apiRouter = Router();

// ---------------------------------------------------------------- health
apiRouter.get("/health", (_req, res) => {
  res.json({ success: true, data: { status: "ok", time: new Date().toISOString() } });
});

// ------------------------------------------------------- authentication
apiRouter.post(
  "/auth/register",
  authLimiter,
  validate({ body: schemas.registerSchema }),
  auth.register,
);
apiRouter.post("/auth/login", authLimiter, validate({ body: schemas.loginSchema }), auth.login);
apiRouter.post("/auth/logout", auth.logout);
apiRouter.get("/auth/me", auth.me);
apiRouter.post(
  "/auth/forgot-password",
  resetLimiter,
  validate({ body: schemas.forgotPasswordSchema }),
  auth.forgotPassword,
);
apiRouter.post(
  "/auth/reset-password",
  resetLimiter,
  validate({ body: schemas.resetPasswordSchema }),
  auth.resetPassword,
);
apiRouter.post("/auth/verify-email", validate({ body: schemas.verifyEmailSchema }), auth.verifyEmail);
apiRouter.post("/auth/resend-verification", requireAuth, auth.resendVerification);

// ------------------------------------------------------------- courses
apiRouter.get("/courses", courses.listCourses);
apiRouter.get("/courses/:courseSlug", validate({ params: schemas.courseSlugParam }), courses.getCourse);
apiRouter.get(
  "/courses/:courseSlug/units",
  validate({ params: schemas.courseSlugParam }),
  courses.getCourseUnits,
);
apiRouter.get("/units/:unitSlug", validate({ params: schemas.unitSlugParam }), courses.getUnit);
apiRouter.get(
  "/units/:unitSlug/lessons",
  validate({ params: schemas.unitSlugParam }),
  courses.getUnitLessons,
);

// ---------------------------------------------------------- enrollment
apiRouter.post("/courses/:courseId/enroll", requireAuth, student.enroll);
apiRouter.get("/student/enrollments", requireAuth, student.enrollments);

// ---------------------------------------- student dashboard + progress
apiRouter.get("/student/dashboard", requireAuth, student.dashboard);
apiRouter.get("/student/progress", requireAuth, student.progress);
// Slug-addressed lesson view (registered before /:lessonId so "unit" is not parsed as an id)
apiRouter.get(
  "/student/lessons/unit/:unitSlug/:lessonSlug",
  requireAuth,
  validate({ params: schemas.lessonSlugParam }),
  student.lessonViewBySlug,
);
apiRouter.get("/student/lessons/:lessonId", requireAuth, student.lessonView);
apiRouter.post("/student/lessons/:lessonId/start", requireAuth, student.startLesson);
apiRouter.post("/student/lessons/:lessonId/complete", requireAuth, student.completeLesson);

// -------------------------------------------------------------- quizzes
apiRouter.get("/student/quizzes/:quizId", requireAuth, quizzes.getQuiz);
apiRouter.post(
  "/student/quizzes/:quizId/submit",
  requireAuth,
  quizSubmitLimiter,
  validate({ body: schemas.quizSubmitSchema }),
  quizzes.submitQuiz,
);
apiRouter.get("/student/quizzes/:quizId/attempts", requireAuth, quizzes.attempts);
apiRouter.get("/student/quiz-attempts/:attemptId", requireAuth, quizzes.attemptDetail);

// --------------------------------------------------------- certificates
apiRouter.get("/student/certificates", requireAuth, student.myCertificates);
apiRouter.post("/student/certificates/request", requireAuth, student.requestCertificate);
apiRouter.get("/student/certificates/:certificateId", requireAuth, student.myCertificate);
apiRouter.get("/student/certificates/:certificateId/download", requireAuth, student.downloadCertificate);
apiRouter.post(
  "/student/certificates/:certificateId/resend-email",
  requireAuth,
  emailRetryLimiter,
  student.resendCertificateEmail,
);

// -------------------------------------------------------------- public
apiRouter.get("/public/certificates/:certificateId/verify", publicApi.verifyCertificate);
apiRouter.get("/public/settings", publicApi.publicSettings);

// ------------------------------------------------------------- admin
const adminRouter = Router();
adminRouter.use(requireAdmin);

adminRouter.get("/dashboard", admin.dashboard);

adminRouter.get("/students", validate({ query: schemas.paginationSchema }), admin.listStudents);
adminRouter.get("/students/:studentId", admin.getStudent);
adminRouter.patch("/students/:studentId/status", validate({ body: schemas.adminStudentActionSchema }), admin.updateStudentStatus);

adminRouter.get("/courses", admin.listAdminCourses);
adminRouter.post("/courses", validate({ body: schemas.adminCourseSchema }), admin.createCourse);
adminRouter.put("/courses/:courseId", validate({ body: schemas.adminCourseSchema }), admin.updateCourse);

adminRouter.get("/units", admin.listAdminUnits);
adminRouter.post("/units", validate({ body: schemas.adminUnitSchema }), admin.createUnit);
adminRouter.put("/units/:unitId", validate({ body: schemas.adminUnitSchema }), admin.updateUnit);

adminRouter.get("/lessons", admin.listAdminLessons);
adminRouter.get("/lessons/:lessonId", admin.getAdminLesson);
adminRouter.post("/lessons", validate({ body: schemas.adminLessonSchema }), admin.createLesson);
adminRouter.put("/lessons/:lessonId", validate({ body: schemas.adminLessonSchema }), admin.updateLesson);

adminRouter.get("/quizzes", admin.listAdminQuizzes);
adminRouter.get("/quizzes/:quizId", admin.getQuizDetail);
adminRouter.post("/quizzes", validate({ body: schemas.adminQuizSchema }), admin.createQuiz);
adminRouter.put("/quizzes/:quizId", validate({ body: schemas.adminQuizSchema }), admin.updateQuiz);
adminRouter.post("/quizzes/:quizId/questions", validate({ body: schemas.adminQuestionSchema }), admin.createQuestion);
adminRouter.put(
  "/questions/:questionId",
  validate({ body: schemas.adminQuestionSchema }),
  admin.updateQuestion,
);
adminRouter.delete("/questions/:questionId", admin.deleteQuestion);

adminRouter.get("/certificates", validate({ query: schemas.paginationSchema }), admin.listAdminCertificates);
adminRouter.post("/certificates/:certificateId/retry-email", emailRetryLimiter, admin.retryCertificateEmail);
adminRouter.get("/certificates/:certificateId/download", admin.downloadAdminCertificate);
adminRouter.get("/audit-logs", admin.getAuditLogs);

adminRouter.get("/settings", admin.getSettings);
adminRouter.put("/settings", validate({ body: schemas.adminSettingsSchema }), admin.updateSettings);

apiRouter.use("/admin", adminRouter);
