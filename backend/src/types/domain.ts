/** Shared domain row/DTO types used across repositories and services. */

export type Role = "student" | "admin";
export type UserStatus = "active" | "disabled";

export interface UserRow {
  id: number;
  full_name: string;
  email: string;
  password_hash: string;
  role: Role;
  status: UserStatus;
  email_verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CourseRow {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  published: 0 | 1;
  created_at: string;
  updated_at: string;
}

export interface UnitRow {
  id: number;
  course_id: number;
  title: string;
  slug: string;
  description: string | null;
  sort_order: number;
  published: 0 | 1;
}

export interface LessonRow {
  id: number;
  unit_id: number;
  title: string;
  slug: string;
  summary: string | null;
  content: string | null;
  content_type: "article" | "video" | "code" | "document";
  resource_url: string | null;
  is_required: 0 | 1;
  sort_order: number;
  published: 0 | 1;
}

export interface EnrollmentRow {
  id: number;
  user_id: number;
  course_id: number;
  enrolled_at: string;
  completed_at: string | null;
  status: "active" | "completed" | "cancelled";
}

export interface LessonProgressRow {
  id: number;
  user_id: number;
  lesson_id: number;
  status: "in_progress" | "completed";
  started_at: string;
  completed_at: string | null;
  last_accessed_at: string;
}

export interface QuizRow {
  id: number;
  unit_id: number;
  title: string;
  description: string | null;
  passing_percentage: number;
  max_attempts: number;
  published: 0 | 1;
  is_required: 0 | 1;
}

export type QuestionType = "multiple_choice" | "true_false" | "multiple_select";

export interface QuestionRow {
  id: number;
  quiz_id: number;
  question_text: string;
  question_type: QuestionType;
  explanation: string | null;
  sort_order: number;
}

export interface OptionRow {
  id: number;
  question_id: number;
  option_text: string;
  is_correct: 0 | 1;
  sort_order: number;
}

export interface AttemptRow {
  id: number;
  user_id: number;
  quiz_id: number;
  attempt_number: number;
  score: number;
  passed: 0 | 1;
  status: "in_progress" | "submitted";
  started_at: string;
  submitted_at: string | null;
}

export interface CertificateRow {
  id: number;
  user_id: number;
  course_id: number;
  certificate_number: string;
  verification_id: string;
  issued_at: string;
  pdf_storage_key: string | null;
  pdf_status: "pending" | "generated" | "failed";
  email_status: "pending" | "accepted" | "failed" | "retrying";
  email_sent_at: string | null;
  email_attempts: number;
}
