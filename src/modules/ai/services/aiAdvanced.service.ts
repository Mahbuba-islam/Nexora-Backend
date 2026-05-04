/**
 * Stub aiAdvanced service for Nexora.
 * Real provider integrations (recommendations, search, summary, chat, RAG, etc.)
 * will be wired in a later phase. For now we keep the controller's import surface
 * intact so the build is green and the AI surface returns deterministic shapes.
 */

export type AIMeta = {
  model: string;
  tokensUsed: number;
  latencyMs: number;
  provider?: string;
};

type Result<T> = { data: T; meta: AIMeta };

const ok = <T>(data: T, meta: Partial<AIMeta> = {}): Result<T> => ({
  data,
  meta: {
    provider: "stub",
    model: "nexora-stub",
    tokensUsed: 0,
    latencyMs: 0,
    ...meta,
  },
});

interface RecommendationsPayload {
  userId?: string;
  productId?: string;
  categoryId?: string;
  context?: string;
  limit?: number;
}

interface IndustryCreationPayload {
  industryName: string;
  description?: string;
}

interface SearchPayload {
  query: string;
  filters?: Record<string, unknown>;
  limit?: number;
}

interface SummaryPayload {
  text: string;
  audience?: string;
}

interface ChatPayload {
  message: string;
  conversationId?: string;
  userId?: string;
}

interface DocumentAnalysisPayload {
  text: string;
  objective?: string;
}

const recommendations = async (payload: RecommendationsPayload) =>
  ok({
    products: [] as Array<{ id: string; title: string; reason: string }>,
    message: "AI recommendations are not yet wired up.",
  });

const industryCreation = async (payload: IndustryCreationPayload) =>
  ok({
    industryName: payload.industryName,
    description: payload.description ?? "",
    suggestedCategories: [] as string[],
    suggestedTags: [] as string[],
  });

const search = async (payload: SearchPayload) =>
  ok({ query: payload.query, results: [] as unknown[] });

const summary = async (payload: SummaryPayload) =>
  ok({
    audience: payload.audience ?? "general",
    summary:
      "AI summarization is not yet enabled in this build. The provided text was received successfully.",
    bullets: [] as string[],
    wordCount: payload.text.split(/\s+/).filter(Boolean).length,
  });

const chat = async (payload: ChatPayload) =>
  ok({
    conversationId: payload.conversationId ?? null,
    reply:
      "Hi! Nexora's AI shopping assistant is coming soon. We received your message: " +
      payload.message.slice(0, 200),
  });

const documentAnalysis = async (payload: DocumentAnalysisPayload) =>
  ok({
    objective: payload.objective ?? null,
    findings: [] as string[],
    risks: [] as string[],
    recommendations: [] as string[],
  });

export const aiAdvancedService = {
  recommendations,
  industryCreation,
  search,
  summary,
  chat,
  documentAnalysis,
};
