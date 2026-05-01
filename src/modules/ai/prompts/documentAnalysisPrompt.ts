export const documentAnalysisPrompt = (input: {
  text: string;
  objective?: string;
}) => `
You are a senior consulting analyst.
Analyze the following document${input.objective ? ` with this objective: ${input.objective}` : ""}.

Document:
"""${input.text}"""

Return JSON with this exact shape:
{
  "summary": string,
  "topics": string[],
  "entities": { "people": string[], "organizations": string[], "locations": string[] },
  "risks": string[],
  "opportunities": string[],
  "recommendedExperts": string[]   // industry/expertise tags only, not names
}
Rules:
- Be factual; do not invent entities not present in the document.
- Each list has 0-7 items.
`.trim();
