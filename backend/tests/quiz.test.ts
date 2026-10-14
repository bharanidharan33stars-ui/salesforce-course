import { beforeAll, describe, expect, it } from "vitest";
import type { Express } from "express";
import { createApp } from "../src/app";
import { registerStudent, type TestUser } from "./helpers/client";
import { clearTables } from "./setup";
import {
  correctAnswers,
  enrollStudent,
  quizOptions,
  seedTestCourse,
  wrongAnswers,
  type TestCourseFixture,
} from "./helpers/testData";

/**
 * Quiz pipeline: no answer keys before submission, server-side scoring,
 * pass/fail enforcement, attempt limits and history.
 */

let app: Express;
let fixture: TestCourseFixture;

beforeAll(async () => {
  app = createApp();
  await clearTables();
  fixture = await seedTestCourse();
});

async function studentReady(): Promise<TestUser> {
  const student = await registerStudent(app);
  await enrollStudent(student.id, fixture.courseId);
  return student;
}

describe("GET /api/student/quizzes/:quizId", () => {
  it("returns questions without any correctness flags", async () => {
    const student = await studentReady();
    const response = await student.client.get(`/student/quizzes/${fixture.quizIds[0]}`);
    expect(response.status).toBe(200);

    const body = response.body.data;
    expect(body.questions).toHaveLength(2);
    expect(body.passingPercentage).toBe(70);
    expect(body.attemptsUsed).toBe(0);
    expect(body.attemptsRemaining).toBe(3);
    expect(body.passed).toBe(false);

    const serialised = JSON.stringify(body);
    expect(serialised).not.toContain("isCorrect");
    expect(serialised).not.toContain("is_correct");
    expect(serialised).not.toContain("correctOption");
    expect(body.questions[0].options[0]).not.toHaveProperty("isCorrect");
  });

  it("requires a signed-in student", async () => {
    const anon = await registerStudent(app);
    await anon.client.post("/auth/logout");
    const response = await anon.client.get(`/student/quizzes/${fixture.quizIds[0]}`);
    expect(response.status).toBe(401);
  });
});

describe("POST /api/student/quizzes/:quizId/submit", () => {
  it("scores a perfect submission as passed", async () => {
    const student = await studentReady();
    const quizId = fixture.quizIds[0];
    const picks = await quizOptions(quizId);

    const response = await student.client.post(`/student/quizzes/${quizId}/submit`, correctAnswers(picks));
    expect(response.status).toBe(200);

    const result = response.body.data;
    expect(result.score).toBe(100);
    expect(result.passed).toBe(true);
    expect(result.correctCount).toBe(2);
    expect(result.totalQuestions).toBe(2);
    expect(result.attemptsRemaining).toBe(2);
    expect(result.questions).toHaveLength(2);
    // Explanations only appear after submission.
    expect(result.questions[0].explanation).toBeTruthy();
    expect(result.questions[0].correctOptionIds).toHaveLength(1);
  });

  it("scores a fully wrong submission as failed but reveals the key afterwards", async () => {
    const student = await studentReady();
    const quizId = fixture.quizIds[1];
    const picks = await quizOptions(quizId);

    const response = await student.client.post(`/student/quizzes/${quizId}/submit`, wrongAnswers(picks));
    expect(response.status).toBe(200);
    const result = response.body.data;
    expect(result.score).toBe(0);
    expect(result.passed).toBe(false);
    expect(result.attemptsRemaining).toBe(2);
    expect(result.questions[0].isCorrect).toBe(false);
  });

  it("rejects an unknown option id instead of silently scoring it", async () => {
    const student = await studentReady();
    const quizId = fixture.quizIds[0];
    const picks = await quizOptions(quizId);
    const payload = {
      answers: [{ questionId: picks[0].questionId, optionIds: [999_999] }],
    };
    const response = await student.client.post(`/student/quizzes/${quizId}/submit`, payload);
    expect(response.status).toBeGreaterThanOrEqual(400);
  });

  it("rejects an empty submission", async () => {
    const student = await studentReady();
    const response = await student.client.post(`/student/quizzes/${fixture.quizIds[0]}/submit`, { answers: [] });
    expect(response.status).toBe(422);
  });

  it("enforces the attempt limit", async () => {
    const student = await studentReady();
    const quizId = fixture.quizIds[1];
    const picks = await quizOptions(quizId);

    // Attempts 1 and 2 fail on purpose.
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const response = await student.client.post(`/student/quizzes/${quizId}/submit`, wrongAnswers(picks));
      expect(response.status).toBe(200);
      expect(response.body.data.passed).toBe(false);
    }

    // Third attempt: pass.
    const finalTry = await student.client.post(`/student/quizzes/${quizId}/submit`, correctAnswers(picks));
    expect(finalTry.status).toBe(200);
    expect(finalTry.body.data.passed).toBe(true);

    // No attempts left; a fourth submission must be refused.
    const overflow = await student.client.post(`/student/quizzes/${quizId}/submit`, correctAnswers(picks));
    expect(overflow.status).toBeGreaterThanOrEqual(400);
  });

  it("keeps attempt history and best score", async () => {
    const student = await studentReady();
    const quizId = fixture.quizIds[0];
    const picks = await quizOptions(quizId);

    await student.client.post(`/student/quizzes/${quizId}/submit`, wrongAnswers(picks));
    await student.client.post(`/student/quizzes/${quizId}/submit`, correctAnswers(picks));

    const history = await student.client.get(`/student/quizzes/${quizId}/attempts`);
    expect(history.status).toBe(200);
    expect(history.body.data.attempts).toHaveLength(2);

    const detail = await student.client.get(`/student/quiz-attempts/${history.body.data.attempts[0].id}`);
    expect(detail.status).toBe(200);
    expect(detail.body.data.questions).toHaveLength(2);

    const quizView = await student.client.get(`/student/quizzes/${quizId}`);
    expect(quizView.body.data.bestScore).toBe(100);
    expect(quizView.body.data.passed).toBe(true);
    expect(quizView.body.data.attemptsUsed).toBe(2);
  });

  it("does not let one student read another student's attempt", async () => {
    const owner = await studentReady();
    const picks = await quizOptions(fixture.quizIds[0]);
    const submit = await owner.client.post(`/student/quizzes/${fixture.quizIds[0]}/submit`, correctAnswers(picks));
    const attemptId = submit.body.data.attemptId;

    const other = await studentReady();
    const response = await other.client.get(`/student/quiz-attempts/${attemptId}`);
    expect(response.status).toBe(403);
  });
});
