export const taskBreakdownPrompt = (input: { goal: string; context?: string }) => `
You are a senior consulting project manager.
Break the following goal into a clear, sequenced task list.
Goal: ${input.goal}
${input.context ? `Context: ${input.context}` : ""}

Return JSON with this exact shape:
{
  "tasks": [
    { "title": string, "description": string, "estimatedHours": number, "priority": "low" | "medium" | "high" }
  ],
  "milestones": string[]
}
Rules:
- 4 to 10 tasks.
- estimatedHours is a positive integer.
- Order tasks by execution sequence.
`.trim();
