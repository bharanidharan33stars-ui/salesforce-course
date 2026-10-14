import type { Request, Response } from "express";
import * as contentRepo from "../repositories/contentRepo";
import * as progressService from "../services/progressService";
import { asyncHandler } from "../utils/helpers";
import { ok } from "../middleware/errorHandler";
import { ApiError } from "../utils/errors";

/** Read-only curriculum endpoints (public - no session required). */

export const listCourses = asyncHandler(async (_req: Request, res: Response) => {
  const courses = await contentRepo.listPublishedCourses();
  return ok(
    res,
    courses.map((c) => ({
      id: Number(c.id),
      title: c.title,
      slug: c.slug,
      description: c.description,
    })),
  );
});

export const getCourse = asyncHandler(async (req: Request, res: Response) => {
  const course = await progressService.getCourseOverview(req.params.courseSlug);
  return ok(res, course);
});

export const getCourseUnits = asyncHandler(async (req: Request, res: Response) => {
  const course = await progressService.getCourseOverview(req.params.courseSlug);
  return ok(res, course.units);
});

export const getUnit = asyncHandler(async (req: Request, res: Response) => {
  const unit = await contentRepo.findUnitBySlug(req.params.unitSlug);
  if (!unit || unit.published !== 1) throw ApiError.notFound("Unit not found.");
  const course = await contentRepo.findCourseById(Number(unit.course_id));
  if (!course || course.published !== 1) throw ApiError.notFound("Unit not found.");

  const lessons = await contentRepo.listPublishedLessons(Number(unit.id));
  const quiz = await import("../repositories/quizzesRepo").then((m) =>
    m.findPublishedQuizForUnit(Number(unit.id)),
  );

  const units = await contentRepo.listPublishedUnits(Number(course.id));
  const index = units.findIndex((u) => u.id === unit.id);

  return ok(res, {
    course: { id: Number(course.id), title: course.title, slug: course.slug },
    unit: {
      id: Number(unit.id),
      title: unit.title,
      slug: unit.slug,
      description: unit.description,
      sortOrder: Number(unit.sort_order),
    },
    prevUnit: index > 0 ? { title: units[index - 1].title, slug: units[index - 1].slug } : null,
    nextUnit:
      index >= 0 && index < units.length - 1
        ? { title: units[index + 1].title, slug: units[index + 1].slug }
        : null,
    lessons: lessons.map((l) => ({
      id: Number(l.id),
      title: l.title,
      slug: l.slug,
      summary: l.summary,
      contentType: l.content_type,
      isRequired: l.is_required === 1,
      sortOrder: Number(l.sort_order),
    })),
    quiz: quiz
      ? {
          id: Number(quiz.id),
          title: quiz.title,
          passingPercentage: Number(quiz.passing_percentage),
          maxAttempts: Number(quiz.max_attempts),
          isRequired: quiz.is_required === 1,
        }
      : null,
  });
});

export const getUnitLessons = asyncHandler(async (req: Request, res: Response) => {
  const unit = await contentRepo.findUnitBySlug(req.params.unitSlug);
  if (!unit || unit.published !== 1) throw ApiError.notFound("Unit not found.");
  const lessons = await contentRepo.listPublishedLessons(Number(unit.id));
  return ok(
    res,
    lessons.map((l) => ({
      id: Number(l.id),
      title: l.title,
      slug: l.slug,
      summary: l.summary,
      contentType: l.content_type,
      isRequired: l.is_required === 1,
      sortOrder: Number(l.sort_order),
    })),
  );
});
