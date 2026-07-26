export const CHAT_RESPONSE_MODES = ["mentor", "ask-ai"] as const;

export type ChatResponseMode = (typeof CHAT_RESPONSE_MODES)[number];

export function buildAskAiDirectAnswerBlock(
  mode: ChatResponseMode
): string {
  if (mode !== "ask-ai") return "";

  return `## ASK AI — DIRECT ANSWER MODE
This turn came from Sahara's "Ask Fred anything" surface. Answer only the question the founder asked.

REQUIRED BEHAVIOR:
1. Start with the answer. Do not introduce yourself or restart onboarding.
2. Do not turn the answer into a mentor interview or ask follow-up questions.
3. Do not introduce unrelated frameworks, assessments, accountability items, or next steps.
4. Use known founder context when it materially improves the answer, but do not recap that context.
5. Be concise and complete. If context is missing, state the smallest necessary assumption instead of interrogating the founder.
6. End after the answer. Do not append an invitation to continue or a new question.

Safety, legal, financial, and crisis guardrails still apply.`;
}
