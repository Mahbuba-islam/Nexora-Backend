import { Request, Response } from "express";
import { z } from "zod";
import status from "http-status";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponsr";
import { productQaService } from "./productQa.service";

export const askQuestionSchema = z.object({
  question: z.string().min(5).max(2000),
});

export const answerQuestionSchema = z.object({
  answer: z.string().min(2).max(4000),
});

const list = catchAsync(async (req: Request, res: Response) => {
  const result = await productQaService.listForProduct(
    req.params.productId as string,
    req.query as any
  );
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Questions fetched",
    data: result.data,
    meta: result.meta,
  });
});

const ask = catchAsync(async (req: Request, res: Response) => {
  const result = await productQaService.askQuestion(
    req.user.userId,
    req.params.productId as string,
    req.body.question
  );
  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Question posted",
    data: result,
  });
});

const answer = catchAsync(async (req: Request, res: Response) => {
  const result = await productQaService.answerQuestion(
    req.user.userId,
    req.user.role,
    req.params.questionId as string,
    req.body.answer
  );
  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Answer posted",
    data: result,
  });
});

const hideQuestion = catchAsync(async (req: Request, res: Response) => {
  const result = await productQaService.setQuestionHidden(
    req.params.questionId as string,
    true,
    { userId: req.user.userId, role: req.user.role }
  );
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Question hidden",
    data: result,
  });
});

const unhideQuestion = catchAsync(async (req: Request, res: Response) => {
  const result = await productQaService.setQuestionHidden(
    req.params.questionId as string,
    false,
    { userId: req.user.userId, role: req.user.role }
  );
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Question restored",
    data: result,
  });
});

const hideAnswer = catchAsync(async (req: Request, res: Response) => {
  const result = await productQaService.setAnswerHidden(
    req.params.answerId as string,
    true,
    { userId: req.user.userId, role: req.user.role }
  );
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Answer hidden",
    data: result,
  });
});

export const productQaController = {
  list,
  ask,
  answer,
  hideQuestion,
  unhideQuestion,
  hideAnswer,
};
