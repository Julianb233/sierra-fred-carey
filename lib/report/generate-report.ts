/**
 * Founder Report Generator
 *
 * Loads a user's startup_processes row, calls Claude to produce a structured
 * report payload, renders HTML, persists to founder_reports, and emails it
 * via Resend. Returns a GenerateReportResult immediately on success.
 *
 * The route handler in app/api/reports/generate/route.ts calls this.
 */

import Anthropic from "@anthropic-ai/sdk";
import { Resend } from "resend";
import { createServiceClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import {
  buildSystemPrompt,
  buildUserMessage,
  parseReportPayload,
  type FounderAnswers,
  type FounderContext,
} from "./prompt";
import { renderReportHtml, renderReportText } from "./renderer";
import {
  TIER_PRICE_CENTS,
  type GenerateReportResult,
  type ReportPayload,
} from "./types";

const CLAUDE_MODEL =
  process.env.SAHARA_REPORT_MODEL ?? "claude-sonnet-4-20250514";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://joinsahara.com";

export async function generateReport(userId: string): Promise<GenerateReportResult> {
  const startedAt = Date.now();
  const supabase = createServiceClient();

  // 1) Load the user + their startup process
  const { data: process, error: processError } = await supabase
    .from("startup_processes")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (processError) {
    logger.error("[Report] Failed to load startup_process", { userId, processError });
    return { success: false, status: "failed", error: "Failed to load process data" };
  }

  if (!process) {
    return {
      success: false,
      status: "failed",
      error: "No startup process found. Complete the 9-step flow before generating a report.",
    };
  }

  // 2) Load minimal user/profile context for naming
  const { data: profile } = await supabase
    .from("profiles")
    .select("name, company_name, stage")
    .eq("id", userId)
    .maybeSingle();

  const { data: authUser } = await supabase.auth.admin.getUserById(userId);
  const email = authUser?.user?.email ?? null;

  const founderName =
    (profile as { name?: string | null } | null)?.name ??
    email?.split("@")[0] ??
    "Founder";

  const context: FounderContext = {
    founderName,
    companyName: (profile as { company_name?: string | null } | null)?.company_name ?? null,
    stage: (profile as { stage?: string | null } | null)?.stage ?? null,
  };

  // 3) Insert pending report row
  const { data: pending, error: insertError } = await supabase
    .from("founder_reports")
    .insert({
      user_id: userId,
      process_id: (process as { id: number }).id,
      score: 0,
      verdict_headline: "Generating...",
      verdict_subline: "",
      executive_summary: "",
      report_data: {},
      html: "",
      generation_status: "generating",
      model_used: CLAUDE_MODEL,
    })
    .select("id")
    .single();

  if (insertError || !pending) {
    logger.error("[Report] Failed to insert pending report", { userId, insertError });
    return { success: false, status: "failed", error: "Failed to create report row" };
  }

  const reportId = (pending as { id: string }).id;

  // 4) Call Claude
  let payload: ReportPayload;
  try {
    payload = await callClaudeForReport(process as FounderAnswers, context);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown Claude error";
    // Pull the raw Claude output if the error carries it — the prompt parser
    // attaches it via `cause` so we can debug fence-edge failures from the DB
    // without having to reproduce the exact non-deterministic LLM run.
    const rawOutput: string | undefined =
      err instanceof Error
        ? (err as Error & { cause?: { rawOutput?: string } }).cause?.rawOutput
        : undefined;
    logger.error("[Report] Claude generation failed", {
      userId,
      reportId,
      error: msg,
      rawOutputLen: rawOutput?.length ?? 0,
    });
    await supabase
      .from("founder_reports")
      .update({
        generation_status: "failed",
        generation_error: msg,
        // Stash the raw model output so we can inspect what the parser choked
        // on without re-running an expensive generation.
        report_data: rawOutput
          ? { rawOutput: rawOutput.slice(0, 8000), errorAt: new Date().toISOString() }
          : { errorAt: new Date().toISOString() },
        generation_duration_ms: Date.now() - startedAt,
      })
      .eq("id", reportId);
    return {
      success: false,
      reportId,
      status: "failed",
      error: "AI generation failed - the team has been notified.",
    };
  }

  // 5) Render HTML
  const html = renderReportHtml(payload, {
    founderName,
    companyName: context.companyName,
    stage: context.stage,
    appUrl: APP_URL,
    reportId,
  });

  // 6) Save final row
  const recommendedTier = payload.recommendedTier;
  await supabase
    .from("founder_reports")
    .update({
      score: payload.score,
      verdict_headline: payload.verdictHeadline,
      verdict_subline: payload.verdictSubline,
      executive_summary: payload.executiveSummary,
      report_data: payload as unknown as Record<string, unknown>,
      html,
      recommended_tier: recommendedTier,
      recommended_tier_price_cents: TIER_PRICE_CENTS[recommendedTier],
      generation_status: "completed",
      generation_duration_ms: Date.now() - startedAt,
    })
    .eq("id", reportId);

  // 7) Email it (best-effort - report is still usable in dashboard if email fails)
  if (email) {
    const emailResult = await emailReport(email, founderName, payload, html);
    if (emailResult.success) {
      await supabase
        .from("founder_reports")
        .update({
          emailed_at: new Date().toISOString(),
          emailed_to: email,
          email_send_id: emailResult.id ?? null,
        })
        .eq("id", reportId);
    }
  }

  logger.info("[Report] Generated", { userId, reportId, score: payload.score });
  return { success: true, reportId, status: "completed" };
}

async function callClaudeForReport(
  answers: FounderAnswers,
  context: FounderContext
): Promise<ReportPayload> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY not set");
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const completion = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 4000,
    system: buildSystemPrompt(),
    messages: [{ role: "user", content: buildUserMessage(answers, context) }],
  });

  const textBlock = completion.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Claude returned no text block");
  }

  return parseReportPayload(textBlock.text);
}

async function emailReport(
  to: string,
  founderName: string,
  payload: ReportPayload,
  html: string
): Promise<{ success: boolean; id?: string }> {
  if (!process.env.RESEND_API_KEY) {
    logger.warn("[Report] RESEND_API_KEY missing - skipping email");
    return { success: false };
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const fromName = process.env.RESEND_FROM_NAME || "Sahara";
  const fromEmail = process.env.RESEND_FROM_EMAIL || "fred@joinsahara.com";

  try {
    const { data, error } = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to,
      subject: `${founderName}, your founder readiness report (${payload.score}/100)`,
      html,
      text: renderReportText(payload, { founderName }),
      tags: [
        { name: "type", value: "founder_report" },
        { name: "tier", value: payload.recommendedTier },
        { name: "score_bucket", value: scoreBucket(payload.score) },
      ],
    });
    if (error) {
      logger.error("[Report] Resend error", { error });
      return { success: false };
    }
    return { success: true, id: data?.id };
  } catch (err) {
    logger.error("[Report] Email send threw", { err });
    return { success: false };
  }
}

function scoreBucket(score: number): string {
  if (score >= 80) return "high";
  if (score >= 60) return "mid_high";
  if (score >= 40) return "mid";
  if (score >= 20) return "low";
  return "very_low";
}
