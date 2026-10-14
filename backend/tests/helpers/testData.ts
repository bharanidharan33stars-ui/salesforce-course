/**
 * Fixtures shared by the API integration suite.
 *
 * Tables are truncated (in dependency order) between test files so each file
 * sees a predictable database without depending on seed data.
 */

export const TRUNCATE_TABLES = [
  "quiz_responses",
  "quiz_attempts",
  "lesson_progress",
  "certificates",
  "email_logs",
  "password_reset_tokens",
  "email_verification_tokens",
  "auth_sessions",
  "admin_audit_logs",
  "quiz_options",
  "quiz_questions",
  "quizzes",
  "lessons",
  "course_units",
  "enrollments",
  "courses",
  "users",
  "academy_settings",
];

export interface TestCourseFixture {
  courseId: number;
  unitIds: number[];
  lessonIds: number[];
  quizIds: number[];
}

/**
 * Inserts a compact but complete course:
 *   1 course -> 2 units -> 2 required lessons each -> 1 quiz per unit.
 * Both quizzes have 2 single-choice questions (1 correct option each).
 */
export async function seedTestCourse(): Promise<TestCourseFixture> {
  const { execute, query } = await import("../../src/config/db");

  await execute(
    `INSERT INTO courses (title, slug, description, published)
     VALUES ('Test Course', 'test-course', 'Fixture course', 1)`,
  );
  const courseRows = await query<{ id: number }[]>("SELECT id FROM courses WHERE slug = 'test-course'");
  const courseId = Number(courseRows[0].id);

  const unitIds: number[] = [];
  const lessonIds: number[] = [];
  const quizIds: number[] = [];

  for (let unitIndex = 1; unitIndex <= 2; unitIndex += 1) {
    await execute(
      `INSERT INTO course_units (course_id, title, slug, description, sort_order, published)
       VALUES (?, ?, ?, ?, ?, 1)`,
      [courseId, `Unit ${unitIndex}`, `unit-${unitIndex}`, `Unit ${unitIndex} description`, unitIndex],
    );
    const unitRows = await query<{ id: number }[]>(
      "SELECT id FROM course_units WHERE course_id = ? AND slug = ?",
      [courseId, `unit-${unitIndex}`],
    );
    const unitId = Number(unitRows[0].id);
    unitIds.push(unitId);

    for (let lessonIndex = 1; lessonIndex <= 2; lessonIndex += 1) {
      await execute(
        `INSERT INTO lessons (unit_id, title, slug, summary, content, content_type, is_required, sort_order, published)
         VALUES (?, ?, ?, ?, ?, 'article', 1, ?, 1)`,
        [
          unitId,
          `Lesson ${unitIndex}.${lessonIndex}`,
          `lesson-${unitIndex}-${lessonIndex}`,
          `Summary for lesson ${unitIndex}.${lessonIndex}`,
          `## Section\n\nReal teaching content for lesson ${unitIndex}.${lessonIndex}.`,
          lessonIndex,
        ],
      );
      const lessonRows = await query<{ id: number }[]>(
        "SELECT id FROM lessons WHERE unit_id = ? AND slug = ?",
        [unitId, `lesson-${unitIndex}-${lessonIndex}`],
      );
      lessonIds.push(Number(lessonRows[0].id));
    }

    await execute(
      `INSERT INTO quizzes (unit_id, title, description, passing_percentage, max_attempts, published, is_required)
       VALUES (?, ?, ?, 70, 3, 1, 1)`,
      [unitId, `Quiz ${unitIndex}`, `Quiz ${unitIndex} description`],
    );
    const quizRows = await query<{ id: number }[]>("SELECT id FROM quizzes WHERE unit_id = ?", [unitId]);
    const quizId = Number(quizRows[0].id);
    quizIds.push(quizId);

    for (let questionIndex = 1; questionIndex <= 2; questionIndex += 1) {
      const result = await execute(
        `INSERT INTO quiz_questions (quiz_id, question_text, question_type, explanation, sort_order)
         VALUES (?, ?, 'multiple_choice', ?, ?)`,
        [
          quizId,
          `Question ${questionIndex}?`,
          `Question ${questionIndex} is about lesson content.`,
          questionIndex,
        ],
      );
      const questionId = result.insertId;
      // Option A is correct for Q1, option B for Q2 (keeps assertions simple).
      await execute(
        "INSERT INTO quiz_options (question_id, option_text, is_correct, sort_order) VALUES (?, 'Option A', ?, 1)",
        [questionId, questionIndex === 1 ? 1 : 0],
      );
      await execute(
        "INSERT INTO quiz_options (question_id, option_text, is_correct, sort_order) VALUES (?, 'Option B', ?, 2)",
        [questionId, questionIndex === 1 ? 0 : 1],
      );
    }
  }

  return { courseId, unitIds, lessonIds, quizIds };
}

/** Signs a student in and enrolls them in the fixture course. */
export async function enrollStudent(userId: number, courseId: number): Promise<void> {
  const { execute } = await import("../../src/config/db");
  await execute(
    "INSERT INTO enrollments (user_id, course_id, status) VALUES (?, ?, 'active')",
    [userId, courseId],
  );
}

/** Marks every required lesson of the fixture course as completed. */
export async function completeAllLessons(userId: number, lessonIds: number[]): Promise<void> {
  const { execute } = await import("../../src/config/db");
  for (const lessonId of lessonIds) {
    await execute(
      `INSERT INTO lesson_progress (user_id, lesson_id, status, started_at, completed_at, last_accessed_at)
       VALUES (?, ?, 'completed', NOW(), NOW(), NOW())
       ON DUPLICATE KEY UPDATE status = 'completed', completed_at = COALESCE(completed_at, NOW())`,
      [userId, lessonId],
    );
  }
}

/** Returns the option ids of a quiz ordered so callers can pick correct/incorrect. */
export async function quizOptions(quizId: number): Promise<{ questionId: number; correctOptionId: number; wrongOptionId: number }[]> {
  const { query } = await import("../../src/config/db");
  const questions = await query<{ id: number }[]>("SELECT id FROM quiz_questions WHERE quiz_id = ? ORDER BY sort_order", [quizId]);
  const out: { questionId: number; correctOptionId: number; wrongOptionId: number }[] = [];

  for (const question of questions) {
    const options = await query<{ id: number; is_correct: number }[]>(
      "SELECT id, is_correct FROM quiz_options WHERE question_id = ? ORDER BY sort_order",
      [Number(question.id)],
    );
    const correct = options.find((option) => option.is_correct === 1);
    const wrong = options.find((option) => option.is_correct === 0);
    if (correct && wrong) {
      out.push({ questionId: Number(question.id), correctOptionId: Number(correct.id), wrongOptionId: Number(wrong.id) });
    }
  }
  return out;
}

/** Builds a submit payload answering every question correctly. */
export function correctAnswers(picks: { questionId: number; correctOptionId: number }[]) {
  return { answers: picks.map((pick) => ({ questionId: pick.questionId, optionIds: [pick.correctOptionId] })) };
}

/** Builds a submit payload answering every question incorrectly. */
export function wrongAnswers(picks: { questionId: number; wrongOptionId: number }[]) {
  return { answers: picks.map((pick) => ({ questionId: pick.questionId, optionIds: [pick.wrongOptionId] })) };
}
