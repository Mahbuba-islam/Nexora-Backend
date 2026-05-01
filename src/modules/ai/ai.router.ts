import { Router } from "express";

import { validateRequest } from "../../middleware/validateRequest";
import { aiController } from "./ai.controller";
import { aiAdvancedController } from "./controllers/aiAdvanced.controller";
import { aiOpsController } from "./controllers/aiOps.controller";
import { aiValidation } from "./ai.validation";
import { aiLogger } from "./utils/aiLogger";
import { rateLimit } from "./utils/rateLimiter";
import { aiErrorHandler } from "./utils/aiErrorHandler";

const router = Router();

// Logging + metrics on all AI requests
router.use(aiLogger);

// Per-endpoint rate limits (per minute)
const recommendationsLimiter = rateLimit({ windowMs: 60_000, max: 10, keyPrefix: "ai-rec" });
const searchLimiter = rateLimit({ windowMs: 60_000, max: 15, keyPrefix: "ai-search" });
const summaryLimiter = rateLimit({ windowMs: 60_000, max: 5, keyPrefix: "ai-summary" });
const chatLimiter = rateLimit({ windowMs: 60_000, max: 20, keyPrefix: "ai-chat" });
const docLimiter = rateLimit({ windowMs: 60_000, max: 3, keyPrefix: "ai-doc" });
const supportLimiter = rateLimit({ windowMs: 60_000, max: 30, keyPrefix: "ai-support" });

/* -------------------- Ops endpoints -------------------- */
router.get("/health", aiOpsController.health);
router.get("/metrics", aiOpsController.metrics);

/* -------------------- Existing support endpoint -------------------- */
router.post(
  "/support",
  supportLimiter,
  validateRequest(aiValidation.askSupport),
  aiController.askSupport
);

/* -------------------- Phase 2 endpoints -------------------- */
router.post(
  "/recommendations",
  recommendationsLimiter,
  validateRequest(aiValidation.recommendations),
  aiAdvancedController.recommendations
);

router.post(
  "/search",
  searchLimiter,
  validateRequest(aiValidation.search),
  aiAdvancedController.search
);

router.post(
  "/summary",
  summaryLimiter,
  validateRequest(aiValidation.summary),
  aiAdvancedController.summary
);

router.post(
  "/chat",
  chatLimiter,
  validateRequest(aiValidation.chat),
  aiAdvancedController.chat
);

router.post(
  "/document-analysis",
  docLimiter,
  validateRequest(aiValidation.documentAnalysis),
  aiAdvancedController.documentAnalysis
);

// AI-scoped error normalization (503 / provider errors)
router.use(aiErrorHandler);

export const aiRoutes = router;
