import { aiProvider } from "../utils/aiProvider";
import {
  summaryPrompt,
  insightsPrompt,
  searchPrompt,
  buildChatMessages,
  documentAnalysisPrompt,
} from "../prompts";
import { sanitizeText } from "../utils/sanitize";

export type AIMeta = {
  model: string;
  provider: string;
  tokensUsed: number;
  latencyMs: number;
};

export type AIRecommendationsInput = {
  userBehavior: {
    recentSearches?: string[];
    viewedExperts?: string[];
    industries?: string[];
  };
  experts: Array<{
    id: string;
    name: string;
    industry?: string;
    expertise?: string[];
    rating?: number;
  }>;
  industries?: string[];
};

export type AIRecommendationsResult = {
  recommendedExperts: Array<{ id: string; score: number; reason: string }>;
  recommendedIndustries: Array<{ name: string; reason: string }>;
  personalNote: string;
};

const heuristicRecommendations = (
  input: AIRecommendationsInput
): AIRecommendationsResult => {
  const interests = new Set(
    [
      ...(input.userBehavior.industries ?? []),
      ...(input.userBehavior.recentSearches ?? []),
    ].map((s) => s.toLowerCase())
  );
  const scored = input.experts
    .map((e) => {
      let score = 0.4;
      if (e.industry && interests.has(e.industry.toLowerCase())) score += 0.4;
      if ((e.expertise ?? []).some((tag) => interests.has(tag.toLowerCase()))) score += 0.3;
      if (input.userBehavior.viewedExperts?.includes(e.id)) score -= 0.2;
      if (typeof e.rating === "number") score += Math.min(0.2, e.rating / 25);
      return { id: e.id, score: Math.max(0, Math.min(1, score)), reason: "heuristic" };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);

  const industries = (input.industries ?? [])
    .filter((i) => interests.has(i.toLowerCase()))
    .slice(0, 5)
    .map((name) => ({ name, reason: "Matches your recent activity" }));

  return {
    recommendedExperts: scored,
    recommendedIndustries: industries,
    personalNote: "Showing best matches based on your recent activity.",
  };
};

const recommendations = async (
  input: AIRecommendationsInput
): Promise<{ data: AIRecommendationsResult; meta: AIMeta }> => {
  try {
    const { data, meta } = await aiProvider.generateJSON<AIRecommendationsResult>({
      messages: [
        {
          role: "system",
          content:
            "You are ConsultEdge's recommendation engine. Always return strict JSON.",
        },
        { role: "user", content: insightsPrompt(input) },
      ],
      temperature: 0.3,
      maxTokens: 800,
    });

    if (!data || !Array.isArray(data.recommendedExperts)) {
      const fallback = heuristicRecommendations(input);
      return {
        data: fallback,
        meta: {
          model: meta.model,
          provider: meta.provider,
          tokensUsed: meta.tokensUsed,
          latencyMs: meta.latencyMs,
        },
      };
    }

    const validIds = new Set(input.experts.map((e) => e.id));
    data.recommendedExperts = data.recommendedExperts
      .filter((r) => validIds.has(r.id))
      .slice(0, 8);

    return {
      data,
      meta: {
        model: meta.model,
        provider: meta.provider,
        tokensUsed: meta.tokensUsed,
        latencyMs: meta.latencyMs,
      },
    };
  } catch {
    const fallback = heuristicRecommendations(input);
    return {
      data: fallback,
      meta: { model: "heuristic", provider: "fallback", tokensUsed: 0, latencyMs: 0 },
    };
  }
};

export type AISearchInput = {
  query: string;
  experts: Array<{
    id: string;
    name: string;
    industry?: string;
    expertise?: string[];
    bio?: string;
  }>;
  industries?: string[];
};

export type AISearchResult = {
  experts: Array<{ id: string; score: number; highlight: string }>;
  industries: Array<{ name: string; score: number }>;
  suggestedQueries: string[];
};

const heuristicSearch = (input: AISearchInput): AISearchResult => {
  const q = input.query.toLowerCase();
  const tokens = q.split(/\s+/).filter(Boolean);

  const experts = input.experts
    .map((e) => {
      const haystack = [
        e.name,
        e.industry ?? "",
        (e.expertise ?? []).join(" "),
        e.bio ?? "",
      ]
        .join(" ")
        .toLowerCase();
      const hits = tokens.filter((t) => haystack.includes(t)).length;
      const score = tokens.length ? hits / tokens.length : 0;
      return { id: e.id, score, highlight: e.name };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  const industries = (input.industries ?? [])
    .map((name) => ({
      name,
      score: tokens.some((t) => name.toLowerCase().includes(t)) ? 0.8 : 0,
    }))
    .filter((r) => r.score > 0)
    .slice(0, 5);

  return { experts, industries, suggestedQueries: [] };
};

const search = async (
  input: AISearchInput
): Promise<{ data: AISearchResult; meta: AIMeta }> => {
  try {
    const { data, meta } = await aiProvider.generateJSON<AISearchResult>({
      messages: [
        { role: "system", content: "You are ConsultEdge's semantic search engine. Always return strict JSON." },
        { role: "user", content: searchPrompt(input) },
      ],
      temperature: 0.2,
      maxTokens: 700,
    });

    if (!data || !Array.isArray(data.experts)) {
      return {
        data: heuristicSearch(input),
        meta: {
          model: meta.model,
          provider: meta.provider,
          tokensUsed: meta.tokensUsed,
          latencyMs: meta.latencyMs,
        },
      };
    }

    const validIds = new Set(input.experts.map((e) => e.id));
    data.experts = data.experts.filter((r) => validIds.has(r.id)).slice(0, 10);
    data.industries = (data.industries ?? []).slice(0, 5);
    data.suggestedQueries = (data.suggestedQueries ?? []).slice(0, 5);

    return {
      data,
      meta: {
        model: meta.model,
        provider: meta.provider,
        tokensUsed: meta.tokensUsed,
        latencyMs: meta.latencyMs,
      },
    };
  } catch {
    return {
      data: heuristicSearch(input),
      meta: { model: "heuristic", provider: "fallback", tokensUsed: 0, latencyMs: 0 },
    };
  }
};

export type AISummaryInput = { text: string; audience?: string };
export type AISummaryResult = {
  summary: string;
  keyPoints: string[];
  actionItems: string[];
};

const summary = async (
  input: AISummaryInput
): Promise<{ data: AISummaryResult; meta: AIMeta }> => {
  const { data, meta } = await aiProvider.generateJSON<AISummaryResult>({
    messages: [
      { role: "system", content: "You are a consulting analyst. Always return strict JSON." },
      { role: "user", content: summaryPrompt(input) },
    ],
    temperature: 0.3,
    maxTokens: 700,
  });

  const safe: AISummaryResult = {
    summary: data?.summary ?? input.text.slice(0, 280),
    keyPoints: data?.keyPoints ?? [],
    actionItems: data?.actionItems ?? [],
  };

  return {
    data: safe,
    meta: {
      model: meta.model,
      provider: meta.provider,
      tokensUsed: meta.tokensUsed,
      latencyMs: meta.latencyMs,
    },
  };
};

export type AIChatInput = {
  message: string;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
  context?: string;
};
export type AIChatResult = { reply: string };

const chat = async (
  input: AIChatInput
): Promise<{ data: AIChatResult; meta: AIMeta }> => {
  const messages = buildChatMessages(input);
  const result = await aiProvider.generate({
    messages,
    temperature: 0.5,
    maxTokens: 500,
  });

  return {
    data: { reply: result.text || "I'm here to help. Could you share a bit more detail?" },
    meta: {
      model: result.model,
      provider: result.provider,
      tokensUsed: result.tokensUsed,
      latencyMs: result.latencyMs,
    },
  };
};

export type AIDocumentAnalysisInput = { text: string; objective?: string };
export type AIDocumentAnalysisResult = {
  summary: string;
  topics: string[];
  entities: { people: string[]; organizations: string[]; locations: string[] };
  risks: string[];
  opportunities: string[];
  recommendedExperts: string[];
};

const documentAnalysis = async (
  input: AIDocumentAnalysisInput
): Promise<{ data: AIDocumentAnalysisResult; meta: AIMeta }> => {
  const cleanText = sanitizeText(input.text, 16000);
  const { data, meta } = await aiProvider.generateJSON<AIDocumentAnalysisResult>({
    messages: [
      { role: "system", content: "You are a consulting document analyst. Always return strict JSON." },
      {
        role: "user",
        content: documentAnalysisPrompt({ text: cleanText, objective: input.objective }),
      },
    ],
    temperature: 0.2,
    maxTokens: 1200,
  });

  const safe: AIDocumentAnalysisResult = {
    summary: data?.summary ?? "",
    topics: data?.topics ?? [],
    entities: {
      people: data?.entities?.people ?? [],
      organizations: data?.entities?.organizations ?? [],
      locations: data?.entities?.locations ?? [],
    },
    risks: data?.risks ?? [],
    opportunities: data?.opportunities ?? [],
    recommendedExperts: data?.recommendedExperts ?? [],
  };

  return {
    data: safe,
    meta: {
      model: meta.model,
      provider: meta.provider,
      tokensUsed: meta.tokensUsed,
      latencyMs: meta.latencyMs,
    },
  };
};

export const aiAdvancedService = {
  recommendations,
  search,
  summary,
  chat,
  documentAnalysis,
};
