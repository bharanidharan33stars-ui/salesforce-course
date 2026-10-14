/** Types mirroring the backend API responses. */

export interface ApiErrorBody {
  success: false;
  error: { code: string; message: string; details?: unknown };
}

export interface User {
  id: number;
  fullName: string;
  email: string;
  role: "student" | "admin";
  status: "active" | "disabled";
  emailVerifiedAt: string | null;
  createdAt: string;
}

export interface CourseSummary {
  id: number;
  title: string;
  slug: string;
  description: string | null;
}

export interface LessonListItem {
  id: number;
  title: string;
  slug: string;
  summary: string | null;
  contentType: "article" | "video" | "code" | "document";
  isRequired: boolean;
  sortOrder: number;
}

export interface QuizInfo {
  id: number;
  title: string;
  passingPercentage: number;
  maxAttempts: number;
  isRequired: boolean;
}

export interface CourseUnit {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  sortOrder: number;
  lessonCount: number;
  requiredLessonCount: number;
  lessons: LessonListItem[];
  quiz: QuizInfo | null;
}

export interface CourseOverview extends CourseSummary {
  units: CourseUnit[];
  completionRequirements: string[];
}

export interface UnitDetail {
  course: CourseSummary;
  unit: { id: number; title: string; slug: string; description: string | null; sortOrder: number };
  prevUnit: { title: string; slug: string } | null;
  nextUnit: { title: string; slug: string } | null;
  lessons: LessonListItem[];
  quiz: QuizInfo | null;
}

export interface QuizProgressItem {
  quizId: number;
  unitId: number;
  unitSlug: string;
  unitTitle: string;
  passed: boolean;
  attempts: number;
  passingPercentage: number;
  isRequired: boolean;
}

export interface UnitProgress {
  unitId: number;
  title: string;
  slug: string;
  requiredTotal: number;
  requiredCompleted: number;
  quizPassed: boolean;
  complete: boolean;
}

export interface ProgressSummary {
  enrolled: boolean;
  enrolledAt: string | null;
  completedAt: string | null;
  status: string | null;
  percent: number;
  lessons: { requiredTotal: number; requiredCompleted: number; optionalTotal: number };
  quizzes: { requiredTotal: number; passed: number; items: QuizProgressItem[] };
  units: UnitProgress[];
  totals: { units: number; completedUnits: number };
  eligibleForCertificate: boolean;
}

export interface DashboardData {
  course: CourseSummary;
  progress: ProgressSummary;
  lastLesson: {
    lesson_id: number;
    lesson_title: string;
    lesson_slug: string;
    unit_slug: string;
    unit_title: string;
    last_accessed_at: string;
    status: string;
    url: string;
  } | null;
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

export interface LessonContext {
  course: CourseSummary;
  unit: { id: number; title: string; slug: string; description: string | null };
  lesson: {
    id: number;
    title: string;
    slug: string;
    summary: string | null;
    content: string | null;
    contentType: "article" | "video" | "code" | "document";
    resourceUrl: string | null;
    isRequired: 0 | 1;
    sortOrder: number;
  };
  status: "not_started" | "in_progress" | "completed";
  completedAt: string | null;
  prev: { title: string; slug: string; unitSlug: string } | null;
  next: { title: string; slug: string; unitSlug: string } | null;
  unitLessons: { id: number; title: string; slug: string; isRequired: boolean; status: string }[];
  completionRule: string;
}

export interface LessonActionResult {
  status: "in_progress" | "completed";
  completedAt: string | null;
  courseCompleted: boolean;
  certificateIssued: boolean;
}

export interface StudentQuizQuestion {
  id: number;
  questionText: string;
  questionType: "multiple_choice" | "true_false" | "multiple_select";
  options: { id: number; optionText: string }[];
}

export interface StudentQuizView {
  id: number;
  unitId: number;
  unitSlug: string;
  unitTitle: string;
  title: string;
  description: string | null;
  passingPercentage: number;
  maxAttempts: number;
  attemptsUsed: number;
  attemptsRemaining: number;
  bestScore: number;
  passed: boolean;
  questions: StudentQuizQuestion[];
}

export interface QuizResultQuestion {
  questionId: number;
  questionText: string;
  questionType: "multiple_choice" | "true_false" | "multiple_select";
  explanation: string | null;
  isCorrect: boolean;
  selectedOptionIds: number[];
  correctOptionIds: number[];
  options: { id: number; optionText: string }[];
}

export interface QuizResult {
  attemptId: number;
  attemptNumber: number;
  score: number;
  passed: boolean;
  passingPercentage: number;
  correctCount: number;
  totalQuestions: number;
  attemptsRemaining: number;
  certificateIssued: boolean;
  questions: QuizResultQuestion[];
}

export interface AttemptHistory {
  quizId: number;
  passingPercentage: number;
  maxAttempts: number;
  attempts: {
    id: number;
    attemptNumber: number;
    score: number;
    passed: boolean;
    submittedAt: string | null;
  }[];
}

export interface CertificateListItem {
  id: number;
  certificateNumber: string;
  verificationId: string;
  courseTitle: string;
  issuedAt: string;
  issuedAtFormatted: string;
  pdfStatus: string;
  emailStatus: string;
  emailSentAt: string | null;
}

export interface CertificateDetail extends Omit<CertificateListItem, "courseTitle"> {
  courseTitle: string;
  holderName: string;
  verifyUrl: string;
}

export interface PublicVerification {
  valid: boolean;
  certificateNumber: string;
  holderName: string;
  courseTitle: string;
  issuedAtFormatted: string;
  academyName: string;
  footerNote: string;
}

export interface PublicSettings {
  academyName: string;
  supportEmail: string;
  courseTitle: string;
  aiAssistantEnabled: boolean;
  emailDeliveryMode: "smtp" | "development";
  frontendUrl: string;
}

/* ------------------------------------------------------------------ admin */

export interface AdminDashboard {
  totalStudents: number;
  enrolledStudents: number;
  activeStudentsLast7Days: number;
  completedCourses: number;
  certificatesIssued: number;
  quiz: { totalAttempts: number; passedAttempts: number; passRate: number; studentsWithAPass: number };
  emailIssues: number;
  emailDeliveryMode: "smtp" | "development";
  recentActivity: { id: number; action: string; entityType: string | null; entityId: string | null; createdAt: string }[];
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface AdminStudentListItem {
  id: number;
  fullName: string;
  email: string;
  status: "active" | "disabled";
  emailVerifiedAt: string | null;
  createdAt: string;
  enrolledAt: string | null;
  completedAt: string | null;
  certificateNumber: string | null;
}

export interface AdminStudentDetail {
  user: User;
  progress: ProgressSummary | null;
  quizAttempts: {
    id: number;
    quizId: number;
    attemptNumber: number;
    score: number;
    passed: boolean;
    submittedAt: string | null;
  }[];
  certificate: {
    id: number;
    certificateNumber: string;
    verificationId: string;
    issuedAt: string;
    emailStatus: string;
    pdfStatus: string;
  } | null;
}

export interface AdminCertificateItem {
  id: number;
  certificateNumber: string;
  verificationId: string;
  holderName: string;
  email: string;
  courseTitle: string;
  issuedAt: string;
  issuedAtFormatted: string;
  pdfStatus: string;
  emailStatus: string;
  emailSentAt: string | null;
  emailAttempts: number;
}

export interface AdminLessonItem {
  id: number;
  unitId: number;
  unitTitle: string;
  title: string;
  slug: string;
  summary: string | null;
  contentType: string;
  isRequired: boolean;
  sortOrder: number;
  published: boolean;
}

export interface AdminUnitItem {
  id: number;
  courseId: number;
  courseTitle: string;
  title: string;
  slug: string;
  description: string | null;
  sortOrder: number;
  published: boolean;
}

export interface AdminQuizItem {
  id: number;
  unitId: number;
  unitTitle: string;
  title: string;
  description: string | null;
  passingPercentage: number;
  maxAttempts: number;
  published: boolean;
  isRequired: boolean;
}

export interface AdminQuizQuestion {
  id: number;
  questionText: string;
  questionType: "multiple_choice" | "true_false" | "multiple_select";
  explanation: string | null;
  sortOrder: number;
  options: { id: number; optionText: string; isCorrect: boolean; sortOrder: number }[];
}

export interface AdminSettingsResponse {
  settings: Record<string, string>;
  smtp: { configured: boolean; mode: "smtp" | "development"; host: string | null; number?: number; port: number; from: string };
}

export interface AdminCourseItem {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  published: boolean;
  unitCount: number;
}
