import { envVars } from "../../../config/env";
import AppError from "../../../errorHelpers/AppError";
import status from "http-status";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type GenerateOptions = {
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  /** When true and the provider supports it, asks the model for JSON output. */
  jsonMode?: boolean;
};

export type GenerateResult = {
  text: string;
  model: string;
  provider: "openai" | "gemini";
  tokensUsed: number;
  latencyMs: number;
  raw?: unknown;
};

const resolveProvider = (): "openai" | "gemini" => {
  const explicit = envVars.AI_PROVIDER;
  if (explicit === "openai" && envVars.OPENAI_API_KEY) return "openai";
  if (explicit === "gemini" && envVars.GEMINI_API_KEY) return "gemini";
  if (envVars.OPENAI_API_KEY) return "openai";
  if (envVars.GEMINI_API_KEY) return "gemini";
  throw new AppError(
    status.SERVICE_UNAVAILABLE,
    "No AI provider configured. Set AI_PROVIDER and the corresponding API key."
  );
};

const callOpenAI = async (opts: GenerateOptions): Promise<GenerateResult> => {
  if (!envVars.OPENAI_API_KEY) {
    throw new AppError(status.SERVICE_UNAVAILABLE, "OPENAI_API_KEY missing");
  }
  const model = envVars.OPENAI_MODEL || "gpt-4o-mini";
  const startedAt = Date.now();

  const body: Record<string, unknown> = {
    model,
    temperature: opts.temperature ?? 0.4,
    max_tokens: opts.maxTokens ?? 600,
    messages: opts.messages.map((m) => ({ role: m.role, content: m.content })),
  };
  if (opts.jsonMode) {
    body.response_format = { type: "json_object" };
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${envVars.OPENAI_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new AppError(
      status.BAD_GATEWAY,
      `OpenAI request failed: ${response.status} ${errText.slice(0, 300)}`
    );
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: { total_tokens?: number };
  };
  const text = data.choices?.[0]?.message?.content?.trim() ?? "";
  return {
    text,
    model,
    provider: "openai",
    tokensUsed: data.usage?.total_tokens ?? 0,
    latencyMs: Date.now() - startedAt,
    raw: data,
  };
};

const callGemini = async (opts: GenerateOptions): Promise<GenerateResult> => {
  if (!envVars.GEMINI_API_KEY) {
    throw new AppError(status.SERVICE_UNAVAILABLE, "GEMINI_API_KEY missing");
  }
  const model = envVars.GEMINI_MODEL || "gemini-2.0-flash";
  const startedAt = Date.now();

  // Gemini uses a different shape: separate systemInstruction and contents[].
  const systemMessages = opts.messages.filter((m) => m.role === "system");
  const turnMessages = opts.messages.filter((m) => m.role !== "system");

  const body: Record<string, unknown> = {
    contents: turnMessages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    })),
    generationConfig: {
      temperature: opts.temperature ?? 0.4,
      maxOutputTokens: opts.maxTokens ?? 600,
      ...(opts.jsonMode ? { responseMimeType: "application/json" } : {}),
    },
  };
  if (systemMessages.length > 0) {
    body.systemInstruction = {
      role: "system",
      parts: [{ text: systemMessages.map((m) => m.content).join("\n\n") }],
    };
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model
  )}:generateContent?key=${encodeURIComponent(envVars.GEMINI_API_KEY)}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new AppError(
      status.BAD_GATEWAY,
      `Gemini request failed: ${response.status} ${errText.slice(0, 300)}`
    );
  }

  const data = (await response.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
    }>;
    usageMetadata?: { totalTokenCount?: number };
  };

  const text =
    data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("").trim() ?? "";

  return {
    text,
    model,
    provider: "gemini",
    tokensUsed: data.usageMetadata?.totalTokenCount ?? 0,
    latencyMs: Date.now() - startedAt,
    raw: data,
  };
};

export const aiProvider = {
  /** Generate a chat completion using the configured provider, with one fallback. */
  async generate(opts: GenerateOptions): Promise<GenerateResult> {
    const primary = resolveProvider();
    const hasOpenAI = !!envVars.OPENAI_API_KEY;
    const hasGemini = !!envVars.GEMINI_API_KEY;
    const fallback: "openai" | "gemini" | null =
      primary === "gemini" && hasOpenAI
        ? "openai"
        : primary === "openai" && hasGemini
          ? "gemini"
          : null;

    try {
      return primary === "openai" ? await callOpenAI(opts) : await callGemini(opts);
    } catch (err) {
      if (!fallback) throw err;
      // eslint-disable-next-line no-console
      console.warn(
        `[ai] primary provider "${primary}" failed; retrying with "${fallback}"`,
        err instanceof Error ? err.message : err
      );
      return fallback === "openai" ? callOpenAI(opts) : callGemini(opts);
    }
  },

  /**
   * Generate and parse JSON output. Falls back to wrapping plain text if the
   * provider returns a non-JSON response.
   */
  async generateJSON<T = unknown>(
    opts: GenerateOptions
  ): Promise<{ data: T | null; meta: GenerateResult }> {
    const result = await this.generate({ ...opts, jsonMode: true });
    let parsed: T | null = null;
    try {
      // Some models wrap JSON in ``` fences.
      const cleaned = result.text
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/```$/i, "")
        .trim();
      parsed = JSON.parse(cleaned) as T;
    } catch {
      parsed = null;
    }
    return { data: parsed, meta: result };
  },

  getActiveProvider: resolveProvider,

  /** Non-throwing introspection of which providers have keys configured. */
  getConfiguredProviders(): Array<"openai" | "gemini"> {
    const list: Array<"openai" | "gemini"> = [];
    if (envVars.OPENAI_API_KEY) list.push("openai");
    if (envVars.GEMINI_API_KEY) list.push("gemini");
    return list;
  },

  /** Lightweight reachability probe used by GET /ai/health. */
  async ping(): Promise<{
    provider: "openai" | "gemini" | "none";
    status: "ok" | "down" | "unconfigured";
    latencyMs: number;
    model?: string;
    error?: string;
  }> {
    const configured = this.getConfiguredProviders();
    if (configured.length === 0) {
      return { provider: "none", status: "unconfigured", latencyMs: 0 };
    }
    const startedAt = Date.now();
    try {
      const result = await this.generate({
        messages: [
          { role: "system", content: "You are a health probe. Reply with the single word: ok." },
          { role: "user", content: "ping" },
        ],
        temperature: 0,
        maxTokens: 5,
      });
      return {
        provider: result.provider,
        status: "ok",
        latencyMs: Date.now() - startedAt,
        model: result.model,
      };
    } catch (err) {
      return {
        provider: configured[0],
        status: "down",
        latencyMs: Date.now() - startedAt,
        error: err instanceof Error ? err.message : "unknown error",
      };
    }
  },
};
