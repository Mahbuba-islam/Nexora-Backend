export const CHAT_SYSTEM_PROMPT = `You are ConsultEdge AI Assistant.
You help users discover experts, plan consultations, and understand the platform.
Rules:
- Be concise, friendly, and practical.
- Never invent expert names, prices, or availability.
- For refunds, billing disputes, or account security, recommend admin/human support.
- Keep replies suitable for a chat widget (1-4 short paragraphs).`;

export const buildChatMessages = (input: {
  message: string;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
  context?: string;
}) => {
  const history = (input.history ?? []).map((h) => ({ role: h.role, content: h.content }));
  return [
    { role: "system" as const, content: CHAT_SYSTEM_PROMPT },
    ...history,
    {
      role: "user" as const,
      content: input.context
        ? `Context: ${input.context}\nUser message: ${input.message}`
        : input.message,
    },
  ];
};
