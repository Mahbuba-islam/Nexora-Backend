export const summaryPrompt = (input: { text: string; audience?: string }) => `
You are a professional consulting analyst at ConsultEdge.
Summarize the following text for a ${input.audience || "business"} audience.
Return JSON with this exact shape:
{
  "summary": string,        // 3-5 sentence executive summary
  "keyPoints": string[],    // 3-7 bullet points
  "actionItems": string[]   // 2-5 concrete next steps
}
Text:
"""${input.text}"""
`.trim();
