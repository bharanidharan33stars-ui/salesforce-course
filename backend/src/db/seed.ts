import readline from "node:readline/promises";
import { activeDatabaseName, env } from "../config/env";
import { execute, query, closePool } from "../config/db";
import { runMigrations } from "./migrate";
import { hashPassword } from "../services/authService";
import { logger } from "../utils/logger";
import { DEFAULT_SETTINGS } from "../repositories/settingsRepo";

import type { CourseSeed, LessonSeed, QuizQuestionSeed, UnitSeed } from "./seed-data/types";
import unit1 from "./seed-data/unit1";
import unit2 from "./seed-data/unit2";
import unit3 from "./seed-data/unit3";
import unit4 from "./seed-data/unit4";
import unit5 from "./seed-data/unit5";

/**
 * Development seed.
 *
 * Safe to run repeatedly:
 *  - the course, units and lessons are upserted by slug, so content changes
 *    made in the source files are applied on the next run;
 *  - existing quiz questions are NEVER deleted (students' attempt history
 *    references them), they are only inserted when a quiz is new.
 *
 * Usage: npm run seed
 */

const COURSE: CourseSeed = {
  title: "Salesforce CRM and Platform",
  slug: "salesforce-crm-and-platform",
  description:
    "A five-unit, hands-on introduction to the Salesforce platform: administration and data modelling, CRM functionality, Apex programming, Apex development patterns and Visualforce. Finish every required lesson and pass the five unit quizzes to earn an academy course-completion certificate.",
};

const UNITS: UnitSeed[] = [unit1, unit2, unit3, unit4, unit5];

async function seedSettings(): Promise<void> {
  const rows = await query<{ setting_key: string }[]>("SELECT setting_key FROM academy_settings");
  const existing = new Set(rows.map((r) => r.setting_key));
  const missing = Object.entries(DEFAULT_SETTINGS).filter(([key]) => !existing.has(key));
  for (const [key, value] of missing) {
    await execute("INSERT INTO academy_settings (setting_key, setting_value) VALUES (?, ?)", [key, value]);
  }
  logger.info(`settings: ${missing.length} default value(s) added`);
}

async function seedCourse(): Promise<number> {
  await execute(
    `INSERT INTO courses (title, slug, description, published) VALUES (?, ?, ?, 1)
     ON DUPLICATE KEY UPDATE title = VALUES(title), description = VALUES(description), published = 1`,
    [COURSE.title, COURSE.slug, COURSE.description],
  );
  const rows = await query<{ id: number }[]>("SELECT id FROM courses WHERE slug = ?", [COURSE.slug]);
  return Number(rows[0].id);
}

async function seedUnits(courseId: number): Promise<void> {
  for (const [index, unit] of UNITS.entries()) {
    await execute(
      `INSERT INTO course_units (course_id, title, slug, description, sort_order, published)
       VALUES (?, ?, ?, ?, ?, 1)
       ON DUPLICATE KEY UPDATE title = VALUES(title), description = VALUES(description),
                                sort_order = VALUES(sort_order), published = 1`,
      [courseId, unit.title, unit.slug, unit.description, index + 1],
    );
    const unitRows = await query<{ id: number }[]>(
      "SELECT id FROM course_units WHERE course_id = ? AND slug = ?",
      [courseId, unit.slug],
    );
    const unitId = Number(unitRows[0].id);
    await seedLessons(unitId, unit.lessons);
    await seedQuiz(unitId, unit);
  }
}

async function seedLessons(unitId: number, lessons: LessonSeed[]): Promise<void> {
  for (const [index, lesson] of lessons.entries()) {
    await execute(
      `INSERT INTO lessons
         (unit_id, title, slug, summary, content, content_type, resource_url, is_required, sort_order, published)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
       ON DUPLICATE KEY UPDATE title = VALUES(title), summary = VALUES(summary), content = VALUES(content),
                               content_type = VALUES(content_type), resource_url = VALUES(resource_url),
                               is_required = VALUES(is_required), sort_order = VALUES(sort_order), published = 1`,
      [
        unitId,
        lesson.title,
        lesson.slug,
        lesson.summary,
        lesson.content,
        lesson.contentType,
        lesson.resourceUrl ?? null,
        lesson.isRequired ? 1 : 0,
        index + 1,
      ],
    );
  }
  logger.info(`  lessons: ${lessons.length} upserted`);
}

async function seedQuiz(unitId: number, unit: UnitSeed): Promise<void> {
  await execute(
    `INSERT INTO quizzes (unit_id, title, description, passing_percentage, max_attempts, published, is_required)
     VALUES (?, ?, ?, ?, ?, 1, 1)
     ON DUPLICATE KEY UPDATE title = VALUES(title), description = VALUES(description),
                              passing_percentage = VALUES(passing_percentage), max_attempts = VALUES(max_attempts),
                              published = 1, is_required = 1`,
    [unitId, unit.quiz.title, unit.quiz.description, unit.quiz.passingPercentage, unit.quiz.maxAttempts],
  );

  const quizRows = await query<{ id: number }[]>("SELECT id FROM quizzes WHERE unit_id = ?", [unitId]);
  const quizId = Number(quizRows[0].id);

  const existing = await query<{ count: number }[]>(
    "SELECT COUNT(*) AS count FROM quiz_questions WHERE quiz_id = ?",
    [quizId],
  );
  if (Number(existing[0].count) > 0) {
    logger.info(`  quiz: already has ${existing[0].count} questions - left untouched`);
    return;
  }

  for (const [index, question] of unit.quiz.questions.entries()) {
    const questionId = await insertQuestion(quizId, question, index + 1);
    for (const [optIndex, option] of question.options.entries()) {
      await execute(
        "INSERT INTO quiz_options (question_id, option_text, is_correct, sort_order) VALUES (?, ?, ?, ?)",
        [questionId, option.text, option.correct ? 1 : 0, optIndex + 1],
      );
    }
  }
  logger.info(`  quiz: ${unit.quiz.questions.length} questions inserted`);
}

async function insertQuestion(quizId: number, question: QuizQuestionSeed, sortOrder: number): Promise<number> {
  const result = await execute(
    "INSERT INTO quiz_questions (quiz_id, question_text, question_type, explanation, sort_order) VALUES (?, ?, ?, ?, ?)",
    [quizId, question.questionText, question.questionType, question.explanation, sortOrder],
  );
  return result.insertId;
}

async function seedAdmin(): Promise<void> {
  const existing = await query<{ id: number }[]>("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
  if (existing.length > 0) {
    logger.info("admin: an administrator already exists - not creating another one");
    return;
  }

  let email = env.ADMIN_SETUP_EMAIL;
  let password = env.ADMIN_SETUP_PASSWORD;

  if (!email || !password) {
    // Interactive setup is much safer than shipping a default password.
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    email = (await rl.question("Administrator e-mail: ")).trim();
    password = await rl.question("Administrator password (min 8 chars, 1 letter + 1 number): ");
    rl.close();
  }

  if (!email || !password || password.length < 8 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    throw new Error("Administrator credentials are missing or do not meet the password policy.");
  }

  const passwordHash = await hashPassword(password);
  await execute(
    `INSERT INTO users (full_name, email, password_hash, role, status, email_verified_at)
     VALUES (?, ?, ?, 'admin', 'active', NOW())
     ON DUPLICATE KEY UPDATE role = 'admin', status = 'active'`,
    ["Academy Administrator", email.toLowerCase(), passwordHash],
  );
  logger.info(`admin: created ${email.toLowerCase()}`);
}

export async function runSeed(): Promise<void> {
  logger.info(`Seeding database "${activeDatabaseName}"...`);
  await runMigrations();
  await seedSettings();
  const courseId = await seedCourse();
  logger.info(`course: "${COURSE.title}" (id ${courseId})`);
  await seedUnits(courseId);
  await seedAdmin();
  logger.info("Seed complete.");
}

if (require.main === module) {
  runSeed()
    .then(async () => {
      await closePool();
      process.exit(0);
    })
    .catch(async (error) => {
      logger.error("Seed failed", { error: (error as Error).message });
      console.error(error);
      await closePool().catch(() => undefined);
      process.exit(1);
    });
}
