import { z } from "zod";

const historyItemSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(4000),
});

const askSupport = z.object({
  body: z.object({
    message: z.string().trim().min(1, "Message is required").max(4000),
    context: z
      .enum(["general", "homepage", "booking", "expert", "payment", "technical"])
      .optional(),
    history: z.array(historyItemSchema).max(12).optional(),
  }),
});

const expertItem = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(200),
  industry: z.string().max(120).optional(),
  expertise: z.array(z.string().max(80)).max(20).optional(),
  bio: z.string().max(2000).optional(),
  rating: z.number().min(0).max(5).optional(),
});

const recommendations = z.object({
  body: z.object({
    userBehavior: z
      .object({
        recentSearches: z.array(z.string().max(200)).max(20).optional(),
        viewedExperts: z.array(z.string()).max(50).optional(),
        industries: z.array(z.string().max(120)).max(20).optional(),
      })
      .default({}),
    experts: z.array(expertItem).min(1).max(200),
    industries: z.array(z.string().max(120)).max(100).optional(),
  }),
});

const search = z.object({
  body: z.object({
    query: z.string().trim().min(1).max(500),
    experts: z.array(expertItem).min(1).max(200),
    industries: z.array(z.string().max(120)).max(100).optional(),
  }),
});

const summary = z.object({
  body: z.object({
    text: z.string().trim().min(20).max(20000),
    audience: z.string().max(100).optional(),
  }),
});

const chat = z.object({
  body: z.object({
    message: z.string().trim().min(1).max(4000),
    context: z.string().max(500).optional(),
    history: z.array(historyItemSchema).max(20).optional(),
  }),
});

const documentAnalysis = z.object({
  body: z.object({
    text: z.string().trim().min(50).max(40000),
    objective: z.string().max(500).optional(),
  }),
});

export const aiValidation = {
  askSupport,
  recommendations,
  search,
  summary,
  chat,
  documentAnalysis,
};
