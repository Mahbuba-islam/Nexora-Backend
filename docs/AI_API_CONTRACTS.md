# ConsultEdge AI Module — API Contracts

Base URL: `/api/v1/ai`

All endpoints return the standard envelope:

```json
{ "success": true, "data": { ... }, "meta": { "model": "...", "provider": "openai|gemini|fallback|heuristic", "tokensUsed": 0, "latencyMs": 0 } }
```

## Standard error responses

### 429 Rate limit
```json
{ "success": false, "message": "Rate limit exceeded", "retryAfter": 42 }
```
Headers: `Retry-After`, `X-RateLimit-Limit`, `X-RateLimit-Remaining`.

### 503 Provider unavailable
```json
{ "success": false, "message": "AI provider unavailable", "detail": "GEMINI_API_KEY missing" }
```

### 400 Validation error (Zod)
```json
{
  "success": false,
  "message": "Validation Error",
  "errorSources": [{ "path": "body.message", "message": "Required" }]
}
```

## Rate limits (per minute, per IP/user)

| Endpoint | Limit |
|---|---|
| `POST /chat` | 20 |
| `POST /search` | 15 |
| `POST /recommendations` | 10 |
| `POST /summary` | 5 |
| `POST /document-analysis` | 3 |
| `POST /support` | 30 |
| `GET /health`, `GET /metrics` | unlimited |

---

## 1. POST /api/v1/ai/recommendations

### Request
```json
{
  "userBehavior": {
    "recentSearches": ["finance expert", "growth marketing"],
    "viewedExperts": ["exp_123"],
    "industries": ["Fintech"]
  },
  "experts": [
    { "id": "exp_123", "name": "Aisha Khan", "industry": "Fintech", "expertise": ["payments", "risk"], "rating": 4.8 }
  ],
  "industries": ["Fintech", "SaaS"]
}
```

### Response 200
```json
{
  "success": true,
  "data": {
    "recommendedExperts": [
      { "id": "exp_123", "score": 0.92, "reason": "Matches your fintech searches" }
    ],
    "recommendedIndustries": [
      { "name": "Fintech", "reason": "You searched fintech twice this week" }
    ],
    "personalNote": "Showing fintech experts you haven't met yet."
  },
  "meta": { "model": "gemini-2.0-flash", "provider": "gemini", "tokensUsed": 412, "latencyMs": 980 }
}
```

### TypeScript
```ts
export interface RecommendationsRequest {
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
}

export interface RecommendationsResponse {
  success: true;
  data: {
    recommendedExperts: Array<{ id: string; score: number; reason: string }>;
    recommendedIndustries: Array<{ name: string; reason: string }>;
    personalNote: string;
  };
  meta: AIMeta;
}
```

---

## 2. POST /api/v1/ai/search

### Request
```json
{
  "query": "fintech advisor with payments background",
  "experts": [
    { "id": "exp_123", "name": "Aisha Khan", "industry": "Fintech", "expertise": ["payments"], "bio": "10y at Stripe" }
  ],
  "industries": ["Fintech", "SaaS"]
}
```

### Response 200
```json
{
  "success": true,
  "data": {
    "experts": [{ "id": "exp_123", "score": 0.94, "highlight": "Payments at Stripe" }],
    "industries": [{ "name": "Fintech", "score": 0.9 }],
    "suggestedQueries": ["payments compliance", "stripe alternatives", "PSP integration"]
  },
  "meta": { "model": "gemini-2.0-flash", "provider": "gemini", "tokensUsed": 320, "latencyMs": 740 }
}
```

### TypeScript
```ts
export interface SearchRequest {
  query: string;
  experts: Array<{
    id: string;
    name: string;
    industry?: string;
    expertise?: string[];
    bio?: string;
  }>;
  industries?: string[];
}

export interface SearchResponse {
  success: true;
  data: {
    experts: Array<{ id: string; score: number; highlight: string }>;
    industries: Array<{ name: string; score: number }>;
    suggestedQueries: string[];
  };
  meta: AIMeta;
}
```

---

## 3. POST /api/v1/ai/summary

### Request
```json
{
  "text": "Q1 board meeting notes... (long text)",
  "audience": "executive"
}
```

### Response 200
```json
{
  "success": true,
  "data": {
    "summary": "Revenue grew 18% QoQ driven by enterprise expansion...",
    "keyPoints": ["Net new ARR up 22%", "Churn down to 1.4%", "Hiring frozen in EMEA"],
    "actionItems": ["Approve EMEA hiring exception", "Schedule churn deep-dive"]
  },
  "meta": { "model": "gpt-4o-mini", "provider": "openai", "tokensUsed": 612, "latencyMs": 1320 }
}
```

### TypeScript
```ts
export interface SummaryRequest {
  text: string;            // 20..20000 chars
  audience?: string;
}

export interface SummaryResponse {
  success: true;
  data: {
    summary: string;
    keyPoints: string[];
    actionItems: string[];
  };
  meta: AIMeta;
}
```

---

## 4. POST /api/v1/ai/chat

### Request
```json
{
  "message": "How do I book a 30-minute call with a marketing expert?",
  "context": "homepage",
  "history": [
    { "role": "user", "content": "Hi" },
    { "role": "assistant", "content": "Hello! How can I help?" }
  ]
}
```

### Response 200
```json
{
  "success": true,
  "data": { "reply": "Open the marketing category, pick an expert, then choose a 30-min slot from their schedule." },
  "meta": { "model": "gemini-2.0-flash", "provider": "gemini", "tokensUsed": 148, "latencyMs": 510 }
}
```

### TypeScript
```ts
export interface ChatRequest {
  message: string;
  context?: string;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
}

export interface ChatResponse {
  success: true;
  data: { reply: string };
  meta: AIMeta;
}
```

---

## 5. POST /api/v1/ai/document-analysis

### Request
```json
{
  "text": "Investor update: ... (long text up to 40,000 chars)",
  "objective": "Identify funding risks"
}
```

### Response 200
```json
{
  "success": true,
  "data": {
    "summary": "Investor update covers Q1 results and Series B plans.",
    "topics": ["Series B", "Burn rate", "Hiring"],
    "entities": {
      "people": ["Aisha Khan"],
      "organizations": ["Stripe", "ConsultEdge"],
      "locations": ["Singapore"]
    },
    "risks": ["Runway dips below 12 months by Q3"],
    "opportunities": ["Cross-sell to Stripe partner network"],
    "recommendedExperts": ["fintech", "fundraising", "growth marketing"]
  },
  "meta": { "model": "gpt-4o-mini", "provider": "openai", "tokensUsed": 1840, "latencyMs": 2980 }
}
```

### TypeScript
```ts
export interface DocumentAnalysisRequest {
  text: string;            // 50..40000 chars
  objective?: string;
}

export interface DocumentAnalysisResponse {
  success: true;
  data: {
    summary: string;
    topics: string[];
    entities: { people: string[]; organizations: string[]; locations: string[] };
    risks: string[];
    opportunities: string[];
    recommendedExperts: string[];
  };
  meta: AIMeta;
}
```

---

## 6. POST /api/v1/ai/support

### Request
```json
{
  "message": "My payment failed but I was charged.",
  "context": "payment",
  "history": []
}
```

### Response 200
```json
{
  "success": true,
  "message": "AI support response generated successfully",
  "data": {
    "reply": "Sorry to hear that. Please check your dashboard...",
    "suggestedActions": ["Check booking status", "Retry payment", "Contact admin support"],
    "escalatedToHuman": true,
    "provider": "openai",
    "model": "gpt-4o-mini",
    "timestamp": "2026-04-30T10:00:00.000Z"
  }
}
```

> Note: `/support` predates Phase 2 and uses the legacy `sendResponse` envelope (no `meta` block). Frontend should branch on `data.provider` / `data.model` here.

### TypeScript
```ts
export interface SupportRequest {
  message: string;
  context?: "general" | "homepage" | "booking" | "expert" | "payment" | "technical";
  history?: Array<{ role: "user" | "assistant"; content: string }>;
}

export interface SupportResponse {
  success: true;
  message: string;
  data: {
    reply: string;
    suggestedActions: string[];
    escalatedToHuman: boolean;
    provider: "openai" | "fallback";
    model: string;
    timestamp: string;
  };
}
```

---

## 7. GET /api/v1/ai/health

### Response 200 (provider reachable)
```json
{
  "success": true,
  "data": { "provider": "gemini", "status": "ok", "latencyMs": 412, "model": "gemini-2.0-flash" }
}
```

### Response 503 (no key configured)
```json
{ "success": false, "data": { "provider": "none", "status": "unconfigured", "latencyMs": 0 } }
```

### Response 503 (provider down)
```json
{ "success": false, "data": { "provider": "gemini", "status": "down", "latencyMs": 4801, "error": "Gemini request failed: 500 ..." } }
```

```ts
export interface HealthResponse {
  success: boolean;
  data: {
    provider: "openai" | "gemini" | "none";
    status: "ok" | "down" | "unconfigured";
    latencyMs: number;
    model?: string;
    error?: string;
  };
}
```

---

## 8. GET /api/v1/ai/metrics

### Response 200
```json
{
  "success": true,
  "data": {
    "uptimeSeconds": 18342,
    "endpoints": {
      "/chat": {
        "count": 142,
        "errorCount": 2,
        "avgLatencyMs": 612,
        "totalTokens": 18420,
        "lastError": { "message": "HTTP 503", "at": "2026-04-30T09:55:12.000Z" },
        "lastCallAt": "2026-04-30T10:00:01.000Z"
      },
      "/recommendations": {
        "count": 38, "errorCount": 0, "avgLatencyMs": 980, "totalTokens": 15600,
        "lastError": null, "lastCallAt": "2026-04-30T09:58:30.000Z"
      }
    }
  }
}
```

```ts
export interface MetricsResponse {
  success: true;
  data: {
    uptimeSeconds: number;
    endpoints: Record<string, {
      count: number;
      errorCount: number;
      avgLatencyMs: number;
      totalTokens: number;
      lastError: { message: string; at: string } | null;
      lastCallAt: string | null;
    }>;
  };
}
```

---

## Shared types

```ts
export interface AIMeta {
  model: string;
  provider: "openai" | "gemini" | "fallback" | "heuristic";
  tokensUsed: number;
  latencyMs: number;
}

export interface AIErrorRateLimit {
  success: false;
  message: "Rate limit exceeded";
  retryAfter: number;       // seconds
}

export interface AIErrorUnavailable {
  success: false;
  message: "AI provider unavailable";
  detail?: string;
}

export interface AIErrorValidation {
  success: false;
  message: string;
  errorSources: Array<{ path: string; message: string }>;
}
```

---

## Provider behavior

- `AI_PROVIDER` env selects primary (`gemini` or `openai`).
- If primary fails AND the other key is configured, the request is automatically retried once on the alternate provider. The successful provider is returned in `meta.provider`.
- If neither key is configured, endpoints return **503 `AI provider unavailable`**.
- `/recommendations` and `/search` additionally fall back to a deterministic heuristic (with `meta.provider = "heuristic"`) so the frontend always gets a valid payload shape.
