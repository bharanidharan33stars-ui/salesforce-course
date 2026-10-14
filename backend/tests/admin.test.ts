import { beforeAll, describe, expect, it } from "vitest";
import type { Express } from "express";
import { createApp } from "../src/app";
import { createAdminClient, registerStudent, type TestUser } from "./helpers/client";
import { clearTables } from "./setup";
import { seedTestCourse, type TestCourseFixture } from "./helpers/testData";

/**
 * Admin area: role enforcement, the dashboard, student management, content
 * CRUD, quiz/question editing, certificates and settings.
 */

let app: Express;
let fixture: TestCourseFixture;
let admin: TestUser;

beforeAll(async () => {
  app = createApp();
  await clearTables();
  fixture = await seedTestCourse();
  admin = await createAdminClient(app);
});

describe("Admin access control", () => {
  it("blocks anonymous callers", async () => {
    const anon = await registerStudent(app);
    await anon.client.post("/auth/logout");
    const response = await anon.client.get("/admin/dashboard");
    expect(response.status).toBe(401);
  });

  it("blocks signed-in students", async () => {
    const student = await registerStudent(app);
    const response = await student.client.get("/admin/dashboard");
    expect(response.status).toBe(403);
  });

  it("allows the administrator", async () => {
    const response = await admin.client.get("/admin/dashboard");
    expect(response.status).toBe(200);
    expect(response.body.data).toHaveProperty("totalStudents");
    expect(response.body.data).toHaveProperty("certificatesIssued");
    expect(response.body.data).toHaveProperty("quiz");
  });

  it("does not let a student reach admin mutations even with a valid CSRF token", async () => {
    const student = await registerStudent(app);
    const response = await student.client.post("/admin/courses", {
      title: "Sneaky Course",
      slug: "sneaky-course",
      description: null,
      published: true,
    });
    expect(response.status).toBe(403);
  });
});

describe("Student management", () => {
  it("paginates and searches the student list", async () => {
    await registerStudent(app, { fullName: "Margaret Hamilton" });

    const page = await admin.client.get("/admin/students?page=1&pageSize=10");
    expect(page.status).toBe(200);
    expect(page.body.data.items.length).toBeGreaterThanOrEqual(1);
    expect(page.body.data).toHaveProperty("totalPages");

    const search = await admin.client.get("/admin/students?search=Margaret");
    expect(search.body.data.items.some((item: { fullName: string }) => item.fullName.includes("Margaret"))).toBe(true);

    const noMatch = await admin.client.get("/admin/students?search=zzz-no-such-person-zzz");
    expect(noMatch.body.data.items).toHaveLength(0);
  });

  it("shows a student profile with progress and can disable the account", async () => {
    const student = await registerStudent(app);

    const detail = await admin.client.get(`/admin/students/${student.id}`);
    expect(detail.status).toBe(200);
    expect(detail.body.data.user.email).toBe(student.email);
    expect(detail.body.data.progress).toBeTruthy();

    const disable = await admin.client.patch(`/admin/students/${student.id}/status`, { status: "disabled" });
    expect(disable.status).toBe(200);
    expect(disable.body.data.status).toBe("disabled");

    // A disabled student can no longer sign in.
    const blocked = await student.client.post("/auth/login", {
      email: student.email,
      password: student.password,
      remember: false,
    });
    expect(blocked.status).toBeGreaterThanOrEqual(400);

    const enable = await admin.client.patch(`/admin/students/${student.id}/status`, { status: "active" });
    expect(enable.status).toBe(200);
  });

  it("404s on an unknown student", async () => {
    const response = await admin.client.get("/admin/students/999999");
    expect(response.status).toBe(404);
  });
});

describe("Content management", () => {
  it("creates, updates a course", async () => {
    const create = await admin.client.post("/admin/courses", {
      title: "Advanced Topics",
      slug: "advanced-topics",
      description: "Extra material.",
      published: true,
    });
    expect(create.status).toBe(201);
    const courseId = create.body.data.id;

    const update = await admin.client.put(`/admin/courses/${courseId}`, {
      title: "Advanced Topics v2",
      slug: "advanced-topics",
      description: "Updated.",
      published: false,
    });
    expect(update.status).toBe(200);

    const list = await admin.client.get("/admin/courses");
    const found = list.body.data.find((course: { id: number }) => Number(course.id) === Number(courseId));
    expect(found.title).toBe("Advanced Topics v2");
    expect(found.published).toBe(false);
  });

  it("creates a unit, lesson and quiz with questions", async () => {
    const courses = await admin.client.get("/admin/courses");
    const courseId = courses.body.data[0].id;

    const unit = await admin.client.post("/admin/units", {
      courseId,
      title: "Unit 3",
      slug: "unit-3",
      description: "Third unit.",
      sortOrder: 3,
      published: true,
    });
    expect(unit.status).toBe(201);
    const unitId = unit.body.data.id;

    const lesson = await admin.client.post("/admin/lessons", {
      unitId,
      title: "First steps",
      slug: "first-steps",
      summary: "Getting started.",
      content: "## Hello\n\nLesson body.",
      contentType: "article",
      resourceUrl: null,
      isRequired: true,
      sortOrder: 1,
      published: true,
    });
    expect(lesson.status).toBe(201);

    const quiz = await admin.client.post("/admin/quizzes", {
      unitId,
      title: "Unit 3 Quiz",
      description: "Test knowledge.",
      passingPercentage: 70,
      maxAttempts: 3,
      published: true,
      isRequired: true,
    });
    expect(quiz.status).toBe(201);
    const quizId = quiz.body.data.id;

    const question = await admin.client.post(`/admin/quizzes/${quizId}/questions`, {
      questionText: "What is 2 + 2?",
      questionType: "multiple_choice",
      explanation: "Basic arithmetic.",
      sortOrder: 1,
      options: [
        { optionText: "3", isCorrect: false },
        { optionText: "4", isCorrect: true },
        { optionText: "5", isCorrect: false },
        { optionText: "22", isCorrect: false },
      ],
    });
    expect(question.status).toBe(201);
    const questionId = question.body.data.id;

    const detail = await admin.client.get(`/admin/quizzes/${quizId}`);
    expect(detail.status).toBe(200);
    expect(detail.body.data.questions).toHaveLength(1);
    expect(detail.body.data.questions[0].options).toHaveLength(4);
    expect(detail.body.data.questions[0].options.filter((option: { isCorrect: boolean }) => option.isCorrect)).toHaveLength(1);

    const updateQuestion = await admin.client.put(`/admin/questions/${questionId}`, {
      questionText: "What is 2 + 2? (updated)",
      questionType: "multiple_choice",
      explanation: "Still arithmetic.",
      sortOrder: 1,
      options: [
        { optionText: "4", isCorrect: true },
        { optionText: "5", isCorrect: false },
      ],
    });
    expect(updateQuestion.status).toBe(200);

    const deleteQuestion = await admin.client.delete(`/admin/questions/${questionId}`);
    expect(deleteQuestion.status).toBe(200);
    const afterDelete = await admin.client.get(`/admin/quizzes/${quizId}`);
    expect(afterDelete.body.data.questions).toHaveLength(0);
  });

  it("refuses a second quiz for the same unit", async () => {
    const quizzes = await admin.client.get("/admin/quizzes");
    const existing = quizzes.body.data[0];
    const response = await admin.client.post("/admin/quizzes", {
      unitId: existing.unitId,
      title: "Duplicate quiz",
      description: null,
      passingPercentage: 70,
      maxAttempts: 3,
      published: true,
      isRequired: true,
    });
    expect(response.status).toBe(409);
  });

  it("validates admin payloads", async () => {
    const response = await admin.client.post("/admin/courses", { title: "", slug: "bad slug!" });
    expect(response.status).toBe(422);
  });
});

describe("Certificates and settings", () => {
  it("lists certificates (empty at first) with pagination metadata", async () => {
    const response = await admin.client.get("/admin/certificates?page=1&pageSize=10");
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.data.items)).toBe(true);
    expect(response.body.data.totalPages).toBeGreaterThanOrEqual(1);
  });

  it("reads and updates settings atomically", async () => {
    const before = await admin.client.get("/admin/settings");
    expect(before.status).toBe(200);
    expect(before.body.data.settings.quiz_default_passing_percentage).toBe("70");
    expect(before.body.data.smtp).toHaveProperty("mode");

    const save = await admin.client.put("/admin/settings", {
      ...before.body.data.settings,
      academy_name: "Test Academy",
    });
    expect(save.status).toBe(200);
    expect(save.body.data.settings.academy_name).toBe("Test Academy");

    const after = await admin.client.get("/admin/settings");
    expect(after.body.data.settings.academy_name).toBe("Test Academy");
  });

  it("records audit log entries for admin actions", async () => {
    const response = await admin.client.get("/admin/audit-logs");
    expect(response.status).toBe(200);
    expect(response.body.data.length).toBeGreaterThan(0);
    expect(response.body.data[0]).toHaveProperty("action");
  });
});

describe("Fixture sanity", () => {
  it("seeded the expected structure", () => {
    expect(fixture.unitIds).toHaveLength(2);
    expect(fixture.lessonIds).toHaveLength(4);
    expect(fixture.quizIds).toHaveLength(2);
  });
});
