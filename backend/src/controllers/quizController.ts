import type { Request, Response } from "express";
import * as quizService from "../services/quizService";
import { asyncHandler } from "../utils/helpers";
import { ok } from "../middleware/errorHandler";

/** Student quiz endpoints. Answer keys never leave the server before submit. */

export const getQuiz = asyncHandler(async (req: Request, res: Response) => {
  const quiz = await quizService.getQuizForStudent(Number(req.params.quizId), req.user!.id);
  return ok(res, quiz);
});

export const submitQuiz = asyncHandler(async (req: Request, res: Response) => {
  const { answers } = req.body as { answers: quizService.SubmittedAnswer[] };
  const result = await quizService.submitQuiz(Number(req.params.quizId), req.user!.id, answers ?? []);
  return ok(res, result);
});

export const attempts = asyncHandler(async (req: Request, res: Response) => {
  const history = await quizService.listAttemptHistory(req.user!.id, Number(req.params.quizId));
  return ok(res, history);
});

export const attemptDetail = asyncHandler(async (req: Request, res: Response) => {
  const detail = await quizService.getAttemptDetail(Number(req.params.attemptId), {
    id: req.user!.id,
    role: req.user!.role,
  });
  return ok(res, detail);
});
