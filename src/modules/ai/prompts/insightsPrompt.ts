export const insightsPrompt = (input: {
  userBehavior: { recentSearches?: string[]; viewedExperts?: string[]; industries?: string[] };
  experts: Array<{ id: string; name: string; industry?: string; expertise?: string[]; rating?: number }>;
  industries?: string[];
}) => `
You are ConsultEdge's recommendation engine.
Given the user's behavior, recommend the most relevant experts and industries.
User behavior:
${JSON.stringify(input.userBehavior, null, 2)}

Available experts:
${JSON.stringify(input.experts.slice(0, 50), null, 2)}

Available industries:
${JSON.stringify(input.industries ?? [], null, 2)}

Return JSON with this exact shape:
{
  "recommendedExperts": [
    { "id": string, "score": number, "reason": string }
  ],
  "recommendedIndustries": [
    { "name": string, "reason": string }
  ],
  "personalNote": string
}
Rules:
- Only use IDs that exist in the provided experts list.
- Score is 0..1.
- Order recommendedExperts by descending score.
- Maximum 8 recommendedExperts.
`.trim();
