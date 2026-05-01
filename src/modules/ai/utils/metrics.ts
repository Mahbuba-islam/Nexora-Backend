/**
 * In-memory metrics store. Resets on process restart.
 * Keyed by endpoint path (e.g. "/chat", "/recommendations").
 */

type EndpointStats = {
  count: number;
  errorCount: number;
  totalLatencyMs: number;
  totalTokens: number;
  lastError: { message: string; at: string } | null;
  lastCallAt: string | null;
};

const stats = new Map<string, EndpointStats>();
const startedAt = Date.now();

const getOrCreate = (endpoint: string): EndpointStats => {
  let s = stats.get(endpoint);
  if (!s) {
    s = {
      count: 0,
      errorCount: 0,
      totalLatencyMs: 0,
      totalTokens: 0,
      lastError: null,
      lastCallAt: null,
    };
    stats.set(endpoint, s);
  }
  return s;
};

export const aiMetrics = {
  recordSuccess(endpoint: string, latencyMs: number, tokensUsed = 0) {
    const s = getOrCreate(endpoint);
    s.count += 1;
    s.totalLatencyMs += latencyMs;
    s.totalTokens += tokensUsed;
    s.lastCallAt = new Date().toISOString();
  },

  recordError(endpoint: string, latencyMs: number, message: string) {
    const s = getOrCreate(endpoint);
    s.count += 1;
    s.errorCount += 1;
    s.totalLatencyMs += latencyMs;
    s.lastError = { message, at: new Date().toISOString() };
    s.lastCallAt = new Date().toISOString();
  },

  snapshot() {
    const endpoints: Record<
      string,
      {
        count: number;
        errorCount: number;
        avgLatencyMs: number;
        totalTokens: number;
        lastError: { message: string; at: string } | null;
        lastCallAt: string | null;
      }
    > = {};
    for (const [key, s] of stats) {
      endpoints[key] = {
        count: s.count,
        errorCount: s.errorCount,
        avgLatencyMs: s.count > 0 ? Math.round(s.totalLatencyMs / s.count) : 0,
        totalTokens: s.totalTokens,
        lastError: s.lastError,
        lastCallAt: s.lastCallAt,
      };
    }
    return {
      uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
      endpoints,
    };
  },
};
