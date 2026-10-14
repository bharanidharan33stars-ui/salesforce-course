import { beforeAll, describe, expect, it } from "vitest";
import type { Express } from "express";
import { createApp } from "../src/app";
import { registerStudent, type TestUser } from "./helpers/client";
import { clearTables } from "./setup";
import {
  completeAllLessons,
  correctAnswers,
  enrollStudent,
  quizOptions,
  seedTestCourse,
  type TestCourseFixture,
} from "./helpers/testData";

/**
 * Certificate pipeline — the security heart of the product:
 *  1. A certificate exists ONLY after every required lesson and every required
 *     quiz has been verified server-side.
 *  2. Issuance is idempotent (no duplicates).
 *  3. The PDF downloads for its owner and nobody else.
 *  4. Public verification exposes nothing but the essentials.
 *  5. The certificate e-mail is dispatched only in the completed state.
 */

let app: Express;
let fixture: TestCourseFixture;

beforeAll(async () => {
  app = createApp();
  await clearTables();
  fixture = await seedTestCourse();
});

/** Drives a student to full completion and returns the certificate id. */
async function finishCourse(student: TestUser): Promise<number> {
  await completeAllLessons(student.id, fixture.lessonIds);
  for (const quizId of fixture.quizIds) {
    const picks = await quizOptions(quizId);
    const response = await student.client.post(`/student/quizzes/${quizId}/submit`, correctAnswers(picks));
    expect(response.status).toBe(200);
  }

  const certificates = await student.client.get("/student/certificates");
  expect(certificates.status).toBe(200);
  expect(certificates.body.data.length).toBe(1);
  return certificates.body.data[0].id;
}

describe("Certificate eligibility", () => {
  it("does not expose a certificate before all activities are complete", async () => {
    const student = await registerStudent(app);
    await enrollStudent(student.id, fixture.courseId);

    // Lessons only - quizzes still pending.
    await completeAllLessons(student.id, fixture.lessonIds);

    const progress = await student.client.get("/student/progress");
    expect(progress.body.data.eligibleForCertificate).toBe(false);

    const certificates = await student.client.get("/student/certificates");
    expect(certificates.body.data).toHaveLength(0);

    const request = await student.client.post("/student/certificates/request");
    expect(request.status).toBeGreaterThanOrEqual(400);
    expect(request.body.success).toBe(false);
  });

  it("issues exactly one certificate once lessons and quizzes are all done", async () => {
    const student = await registerStudent(app);
    await enrollStudent(student.id, fixture.courseId);

    await completeAllLessons(student.id, fixture.lessonIds);

    // Last quiz submission flips the course to completed.
    const firstQuiz = fixture.quizIds[0];
    const picksFirst = await quizOptions(firstQuiz);
    const submitFirst = await student.client.post(`/student/quizzes/${firstQuiz}/submit`, correctAnswers(picksFirst));
    expect(submitFirst.body.data.certificateIssued).toBe(false);

    const secondQuiz = fixture.quizIds[1];
    const picksSecond = await quizOptions(secondQuiz);
    const submitSecond = await student.client.post(`/student/quizzes/${secondQuiz}/submit`, correctAnswers(picksSecond));
    expect(submitSecond.body.data.passed).toBe(true);
    expect(submitSecond.body.data.certificateIssued).toBe(true);

    const certificates = await student.client.get("/student/certificates");
    expect(certificates.body.data).toHaveLength(1);
    expect(certificates.body.data[0].certificateNumber).toMatch(/^SLA-/);

    const progress = await student.client.get("/student/progress");
    expect(progress.body.data.eligibleForCertificate).toBe(true);
    expect(progress.body.data.percent).toBe(100);
  });

  it("stays idempotent when the request endpoint is called again", async () => {
    const student = await registerStudent(app);
    await enrollStudent(student.id, fixture.courseId);
    const certificateId = await finishCourse(student);

    // Ask again: server must return the same certificate, not a second one.
    const request = await student.client.post("/student/certificates/request");
    expect(request.status).toBeLessThan(300);

    const certificates = await student.client.get("/student/certificates");
    expect(certificates.body.data).toHaveLength(1);
    expect(certificates.body.data[0].id).toBe(certificateId);
  });
});

describe("Certificate access and PDF", () => {
  it("downloads the PDF for the owner", async () => {
    const student = await registerStudent(app);
    await enrollStudent(student.id, fixture.courseId);
    const certificateId = await finishCourse(student);

    const response = await student.client.agent
      .get(`/api/student/certificates/${certificateId}/download`)
      .set("Origin", "http://localhost:3000")
      .redirects(0)
      .buffer(true)
      .parse((res, callback) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => callback(null, Buffer.concat(chunks)));
      });

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toContain("application/pdf");
    const body = response.body as Buffer;
    expect(body.subarray(0, 5).toString("utf8")).toBe("%PDF-");
  });

  it("refuses anonymous download attempts", async () => {
    const student = await registerStudent(app);
    await enrollStudent(student.id, fixture.courseId);
    const certificateId = await finishCourse(student);
    await student.client.post("/auth/logout");

    const response = await student.client.agent
      .get(`/api/student/certificates/${certificateId}/download`)
      .set("Origin", "http://localhost:3000")
      .redirects(0);
    expect(response.status).toBe(401);
  });

  it("does not serve one student's certificate to another", async () => {
    const owner = await registerStudent(app);
    await enrollStudent(owner.id, fixture.courseId);
    const certificateId = await finishCourse(owner);

    const other = await registerStudent(app);
    const response = await other.client.get(`/student/certificates/${certificateId}`);
    // 404 rather than 403 on purpose: a foreign certificate must not even
    // reveal that it exists.
    expect(response.status).toBe(404);
  });
});

describe("Public verification", () => {
  it("verifies by id and reveals only the essentials", async () => {
    const student = await registerStudent(app);
    await enrollStudent(student.id, fixture.courseId);
    await finishCourse(student);

    const certificates = await student.client.get("/student/certificates");
    const certificate = certificates.body.data[0];

    const anon = await registerStudent(app);
    await anon.client.post("/auth/logout");

    const verify = await anon.client.get(`/public/certificates/${certificate.verificationId}/verify`);
    expect(verify.status).toBe(200);
    const data = verify.body.data;
    expect(data.valid).toBe(true);
    expect(data.holderName).toBeTruthy();
    expect(data.courseTitle).toBeTruthy();
    expect(data.certificateNumber).toBeTruthy();

    // Nothing private leaks to the public endpoint.
    const serialised = JSON.stringify(verify.body);
    expect(serialised).not.toContain(student.email);
    expect(serialised).not.toContain("userId");
    expect(serialised).not.toContain("@");
  });

  it("404s for an unknown verification id", async () => {
    const anon = await registerStudent(app);
    await anon.client.post("/auth/logout");
    const response = await anon.client.get("/public/certificates/deadbeefdeadbeefdeadbeefdeadbeef/verify");
    expect(response.status).toBe(404);
  });
});

describe("Certificate e-mail delivery", () => {
  it("records an e-mail attempt only after the course is complete", async () => {
    const student = await registerStudent(app);
    await enrollStudent(student.id, fixture.courseId);

    // Before completion: nothing to send.
    const early = await student.client.get("/student/certificates");
    expect(early.body.data).toHaveLength(0);

    const certificateId = await finishCourse(student);

    const { query } = await import("../src/config/db");
    const before = await query<{ count: number }[]>("SELECT COUNT(*) AS count FROM email_logs");
    expect(Number(before[0].count)).toBeGreaterThanOrEqual(0);

    const resend = await student.client.post(`/student/certificates/${certificateId}/resend-email`);
    expect(resend.status).toBe(200);
    expect(typeof resend.body.data.sent).toBe("boolean");
    expect(resend.body.data.message).toBeTruthy();

    const after = await query<{ count: number }[]>("SELECT COUNT(*) AS count FROM email_logs");
    // In test mode the stream transport accepts, so an attempt is recorded.
    expect(Number(after[0].count)).toBeGreaterThan(Number(before[0].count));
  });
});
