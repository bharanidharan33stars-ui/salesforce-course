/**
 * Shape of the seeded curriculum.
 *
 * The seed script (src/db/seed.ts) reads these structures and inserts them
 * into MySQL. Administrators can edit everything afterwards from /admin -
 * the seed is only the starting content.
 */

export interface LessonSeed {
  /** URL-friendly, unique inside its unit, e.g. "standard-and-custom-objects" */
  slug: string;
  title: string;
  /** One or two sentences shown in lesson lists. Max 220 characters. */
  summary: string;
  contentType: "article" | "code";
  isRequired: boolean;
  /** Markdown. Use ## for section headings, fenced ```apex blocks for code. */
  content: string;
  /** Optional https link shown as an extra resource. */
  resourceUrl?: string | null;
}

export interface QuizQuestionSeed {
  questionText: string;
  questionType: "multiple_choice" | "true_false" | "multiple_select";
  /** Shown AFTER submission, so the student understands the concept. */
  explanation: string;
  options: { text: string; correct: boolean }[];
}

export interface UnitSeed {
  slug: string;
  title: string;
  description: string;
  lessons: LessonSeed[];
  quiz: {
    title: string;
    description: string;
    passingPercentage: number;
    maxAttempts: number;
    questions: QuizQuestionSeed[];
  };
}

export interface CourseSeed {
  title: string;
  slug: string;
  description: string;
}
