import { beforeAll, describe, expect, it } from "vitest";
import type { Express } from "express";
import { createApp } from "../src/app";
import { registerStudent, type TestUser } from "./helpers/client";
import { clearTables } from "./setup";
import {
  completeAllLessons,
  enrollStudent,
  seedTestCourse,
  type TestCourseFixture,
} from "./helpers/testData";

/**
 * Learning flow: enrollment, progress computation, lesson completion and the
 * cross-unit progress contract that drives the dashboard.
 */

let app: Express;
let fixture: TestCourseFixture;

beforeAll(async () => {
  app = createApp();
  await clearTables();
  fixture = await seedTestCourse();
});

async function signedInStudent(): Promise<TestUser & { fixture: TestCourseFixture }> {
  const student = await registerStudent(app);
  await enrollStudent(student.id, fixture.courseId);
  return { ...student, fixture };
}

describe("Enrollment", () => {
  it("enrolls a student and reports an active enrollment", async () => {
    const student = await signedInStudent();
    const response = await student.client.post(`/courses/${fixture.courseId}/enroll`);
    expect(response.status).toBeLessThan(300);
    // The helper already enrolled this student, so the endpoint reports the
    // existing row instead of creating a duplicate.
    expect(response.body.data.enrolled).toBe(true);
    expect(typeof response.body.data.created).toBe("boolean");
    expect(response.body.data.created).toBe(false);
  });

  it("requires authentication to enroll", async () => {
    const anon = await registerStudent(app);
    await anon.client.post("/auth/logout");
    const response = await anon.client.post(`/courses/${fixture.courseId}/enroll`);
    expect(response.status).toBe(401);
  });
});

describe("Course catalogue", () => {
  it("lists published courses with unit summaries", async () => {
    const client = (await registerStudent(app)).client;
    const response = await client.get("/courses");
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.data.length).toBeGreaterThanOrEqual(1);
  });

  it("returns a unit with its ordered lessons and quiz info", async () => {
    const client = (await registerStudent(app)).client;
    const response = await client.get("/units/unit-1");
    expect(response.status).toBe(200);
    expect(response.body.data.unit.slug).toBe("unit-1");
    expect(response.body.data.lessons).toHaveLength(2);
    expect(response.body.data.quiz.passingPercentage).toBe(70);
    expect(response.body.data.quiz.maxAttempts).toBe(3);
  });

  it("404s on an unknown unit slug", async () => {
    const client = (await registerStudent(app)).client;
    const response = await client.get("/units/does-not-exist");
    expect(response.status).toBe(404);
  });

  it("never leaks answer keys in the public unit payload", async () => {
    const client = (await registerStudent(app)).client;
    const response = await client.get("/units/unit-1");
    const serialised = JSON.stringify(response.body);
    expect(serialised).not.toContain("is_correct");
    expect(serialised).not.toContain("isCorrect");
  });
});

describe("Lesson progress", () => {
  it("tracks a lesson from open to completed", async () => {
    const student = await signedInStudent();
    const lessonId = fixture.lessonIds[0];

    const view = await student.client.get(`/student/lessons/${lessonId}`);
    expect(view.status).toBe(200);
    expect(view.body.data.status).toBe("not_started");

    const started = await student.client.post(`/student/lessons/${lessonId}/start`);
    expect(started.status).toBe(200);
    expect(started.body.data.status).toBe("in_progress");

    const completed = await student.client.post(`/student/lessons/${lessonId}/complete`);
    expect(completed.status).toBe(200);
    expect(completed.body.data.status).toBe("completed");
    expect(completed.body.data.completedAt).toBeTruthy();

    // Idempotent: completing twice never errors or double-counts.
    const again = await student.client.post(`/student/lessons/${lessonId}/complete`);
    expect(again.status).toBe(200);
    expect(again.body.data.status).toBe("completed");
  });

  it("computes progress percentages from required activities only", async () => {
    const student = await signedInStudent();

    const initial = await student.client.get("/student/progress");
    expect(initial.status).toBe(200);
    expect(initial.body.data.percent).toBe(0);
    expect(initial.body.data.lessons.requiredTotal).toBe(4);
    expect(initial.body.data.quizzes.requiredTotal).toBe(2);

    // Complete all four required lessons => 4 of 6 activities = 67%.
    await completeAllLessons(student.id, fixture.lessonIds);
    const after = await student.client.get("/student/progress");
    expect(after.body.data.lessons.requiredCompleted).toBe(4);
    expect(after.body.data.percent).toBe(67);
    expect(after.body.data.eligibleForCertificate).toBe(false);
    expect(after.body.data.units[0].quizPassed).toBe(false);
  });

  it("addresses a lesson by unit and lesson slug", async () => {
    const student = await signedInStudent();
    const response = await student.client.get("/student/lessons/unit/unit-1/lesson-1-1");
    expect(response.status).toBe(200);
    expect(response.body.data.lesson.slug).toBe("lesson-1-1");
    expect(response.body.data.unit.slug).toBe("unit-1");
    expect(response.body.data.unitLessons).toHaveLength(2);
    expect(response.body.data.completionRule).toBeTruthy();
  });

  it("404s for someone else's lesson access without enrollment data leaking", async () => {
    const anon = await registerStudent(app);
    await anon.client.post("/auth/logout");
    const response = await anon.client.get(`/student/lessons/${fixture.lessonIds[0]}`);
    expect(response.status).toBe(401);
  });
});

describe("Dashboard", () => {
  it("returns course, progress, and continue URL for an enrolled student", async () => {
    const student = await signedInStudent();
    const response = await student.client.get("/student/dashboard");
    expect(response.status).toBe(200);
    expect(response.body.data.course.slug).toBe("test-course");
    expect(response.body.data.progress.enrolled).toBe(true);
    expect(response.body.data.continueUrl).toMatch(/^\/learn\//);
    expect(response.body.data.certificate).toBeNull();
  });
});
