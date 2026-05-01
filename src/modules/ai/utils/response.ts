import type { Response } from "express";

export type AIResponseMeta = {
  model: string;
  tokensUsed: number;
  latencyMs: number;
  provider?: string;
};

export const sendAIResponse = <T>(
  res: Response,
  data: T,
  meta: AIResponseMeta,
  statusCode = 200
) => {
  // Stash meta so aiLogger can record token usage / latency without
  // re-parsing the response body.
  res.locals.aiMeta = meta;
  return res.status(statusCode).json({ success: true, data, meta });
};
