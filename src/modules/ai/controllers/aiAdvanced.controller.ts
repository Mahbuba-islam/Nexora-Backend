import type { Request, Response } from "express";
import { catchAsync } from "../../../shared/catchAsync";
import { aiAdvancedService } from "../services/aiAdvanced.service";
import { sendAIResponse } from "../utils/response";
import { sanitizeObject, sanitizeText } from "../utils/sanitize";

const recommendations = catchAsync(async (req: Request, res: Response) => {
  const payload = sanitizeObject(req.body) as Parameters<
    typeof aiAdvancedService.recommendations
  >[0];
  const { data, meta } = await aiAdvancedService.recommendations(payload);
  sendAIResponse(res, data, meta);
});

const search = catchAsync(async (req: Request, res: Response) => {
  const payload = sanitizeObject(req.body) as Parameters<typeof aiAdvancedService.search>[0];
  payload.query = sanitizeText(payload.query, 500);
  const { data, meta } = await aiAdvancedService.search(payload);
  sendAIResponse(res, data, meta);
});

const summary = catchAsync(async (req: Request, res: Response) => {
  const payload = req.body as Parameters<typeof aiAdvancedService.summary>[0];
  const { data, meta } = await aiAdvancedService.summary({
    text: sanitizeText(payload.text, 16000),
    audience: payload.audience ? sanitizeText(payload.audience, 100) : undefined,
  });
  sendAIResponse(res, data, meta);
});

const chat = catchAsync(async (req: Request, res: Response) => {
  const payload = sanitizeObject(req.body) as Parameters<typeof aiAdvancedService.chat>[0];
  payload.message = sanitizeText(payload.message, 4000);
  const { data, meta } = await aiAdvancedService.chat(payload);
  sendAIResponse(res, data, meta);
});

const documentAnalysis = catchAsync(async (req: Request, res: Response) => {
  const payload = req.body as Parameters<typeof aiAdvancedService.documentAnalysis>[0];
  const { data, meta } = await aiAdvancedService.documentAnalysis({
    text: sanitizeText(payload.text, 32000),
    objective: payload.objective ? sanitizeText(payload.objective, 500) : undefined,
  });
  sendAIResponse(res, data, meta);
});

export const aiAdvancedController = {
  recommendations,
  search,
  summary,
  chat,
  documentAnalysis,
};
