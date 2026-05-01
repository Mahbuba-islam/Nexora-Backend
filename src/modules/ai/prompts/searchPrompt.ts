export const searchPrompt = (input: {
  query: string;
  experts: Array<{ id: string; name: string; industry?: string; expertise?: string[]; bio?: string }>;
  industries?: string[];
}) => `
You are ConsultEdge's semantic search engine.
Match the user's query against experts and industries.

User query: "${input.query}"

Experts:
${JSON.stringify(input.experts.slice(0, 80), null, 2)}

Industries:
${JSON.stringify(input.industries ?? [], null, 2)}

Return JSON with this exact shape:
{
  "experts": [
    { "id": string, "score": number, "highlight": string }
  ],
  "industries": [
    { "name": string, "score": number }
  ],
  "suggestedQueries": string[]
}
Rules:
- Only use expert IDs from the provided list.
- score is 0..1, descending order.
- Maximum 10 experts and 5 industries.
- suggestedQueries: 3 short follow-up search ideas.
`.trim();
