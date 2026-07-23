import { runAgent } from "../base-agent";
import type { AgentResult, AgentTask } from "../types";
import { FABE_OPS_SYSTEM_PROMPT } from "./prompts";
import { fabeOpsTools } from "./tools";

export async function runFabeOpsAgent(task: AgentTask): Promise<AgentResult> {
  return runAgent(
    {
      agentType: "fabe_ops",
      systemPrompt: FABE_OPS_SYSTEM_PROMPT,
      tools: fabeOpsTools,
      maxSteps: 8,
    },
    task
  );
}
