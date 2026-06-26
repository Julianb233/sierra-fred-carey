/**
 * Founder Progress Report Generator (AI-7489)
 *
 * Orchestrates: aggregate snapshot -> Claude narration -> render HTML ->
 * persist to founder_progress_reports -> email via Resend (best-effort).
 *
 * Reused by both the on-demand API route and the weekly cron. The cron passes
 * trigger="scheduled" and the last report's created_at as periodStart so the
 * narration can speak to "since your last report".
 */

import Anthropic from "@anthropic-ai/sdk";
import { Resend } from "resend";
import { createServiceClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { buildProgressSnapshot } from "./aggregate";
import {
  buildSystemPrompt,
  buildUserMessage,
  parseProgressPayload,
} from "./prompt";
import {
  renderProgressReportHtml,
  renderProgressReportText,
} from "./renderer";
import {
  TIER_PRICE_CENTS,
  type FounderProgressSnapshot,
  type GenerateProgressReportResult,
  type ProgressReportPayload,
} from "./types";

const CLAUDE_MODEL =
  process.env.SAHARA_PROGRESS_REPORT_MODEL ??
  process.env.SAHARA_REPORT_MODEL ??
  "claude-sonnet-4-20250514";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://joinsahara.com";

export interface GenerateProgressReportOptions {
  /** "manual" (user clicked) or "scheduled" (weekly cron). */
  trigger?: "manual" | "scheduled";
  /** Override the email recipient (cron supplies it to avoid an admin lookup). */
  email?: string | null;
}

export async function generateProgressReport(
  userId: string,
  options: GenerateProgressReportOptions = {}
): Promise<GenerateProgressReportResult> {
  const startedAt = Date.now();
  const trigger = options.trigger ?? "manual";
  const supabase = createServiceClient();

  // 1) Resolve naming + email context
  const { data: profile } = await supabase
    .from("profiles")
    .select("name, company_name, email")
    .eq("id", userId)
    .maybeSingle();

  let email = options.email ?? null;
  if (email === null) {
    email =
      (profile as { email?: string | null } | null)?.email ?? null;
    if (!email) {
      const { data: authUser } = await supabase.auth.admin.getUserById(userId);
      email = authUser?.user?.email ?? null;
    }
  }

  const founderName =
    (profile as { name?: string | null } | null)?.name ??
    email?.split("@")[0] ??
    "Founder";
  const companyName =
    (profile as { company_name?: string | null } | null)?.company_name ?? null;

  // 2) Period start = previous report's created_at (for deltas)
  const { data: lastReport } = await supabase
    .from("founder_progress_reports")
    .select("created_at")
    .eq("user_id", userId)
    .eq("generation_status", "completed")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const periodStart =
    (lastReport as { created_at?: string } | null)?.created_at ?? null;

  // 3) Build deterministic snapshot
  let snapshot: FounderProgressSnapshot;
  try {
    snapshot = await buildProgressSnapshot(supabase, userId, {
      founderName,
      companyName,
      periodStart,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "snapshot failed";
    logger.error("[ProgressReport] Snapshot failed", { userId, error: msg });
    return { success: false, status: "failed", error: "Failed to load progress data" };
  }

  // 4) Insert pending row
  const { data: pending, error: insertError } = await supabase
    .from("founder_progress_reports")
    .insert({
      user_id: userId,
      overall_percentage: snapshot.overallPercentage,
      current_stage: snapshot.currentStage,
      steps_completed: snapshot.stepsCompleted,
      steps_total: snapshot.stepsTotal,
      headline: "Generating...",
      subline: "",
      snapshot: snapshot as unknown as Record<string, unknown>,
      report_data: {},
      html: "",
      generation_status: "generating",
      model_used: CLAUDE_MODEL,
      trigger_source: trigger,
      period_start: periodStart,
      period_end: snapshot.periodEnd,
    })
    .select("id")
    .single();

  if (insertError || !pending) {
    logger.error("[ProgressReport] Failed to insert pending row", {
      userId,
      insertError,
    });
    return { success: false, status: "failed", error: "Failed to create report row" };
  }
  const reportId = (pending as { id: string }).id;

  // 5) Narrate with Claude
  let payload: ProgressReportPayload;
  try {
    payload = await callClaude(snapshot);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown Claude error";
    const rawOutput: string | undefined =
      err instanceof Error
        ? (err as Error & { cause?: { rawOutput?: string } }).cause?.rawOutput
        : undefined;
    logger.error("[ProgressReport] Claude generation failed", {
      userId,
      reportId,
      error: msg,
    });
    await supabase
      .from("founder_progress_reports")
      .update({
        generation_status: "failed",
        generation_error: msg,
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

  // 6) Render
  const html = renderProgressReportHtml(snapshot, payload, {
    appUrl: APP_URL,
    reportId,
  });

  // 7) Save final
  await supabase
    .from("founder_progress_reports")
    .update({
      overall_percentage: payload.overallPercentage,
      headline: payload.headline,
      subline: payload.subline,
      report_data: payload as unknown as Record<string, unknown>,
      html,
      recommended_tier: payload.recommendedTier,
      recommended_tier_price_cents: TIER_PRICE_CENTS[payload.recommendedTier],
      generation_status: "completed",
      generation_duration_ms: Date.now() - startedAt,
    })
    .eq("id", reportId);

  // 8) Email (best-effort)
  if (email) {
    const emailResult = await emailReport(email, snapshot, payload, html);
    if (emailResult.success) {
      await supabase
        .from("founder_progress_reports")
        .update({
          emailed_at: new Date().toISOString(),
          emailed_to: email,
          email_send_id: emailResult.id ?? null,
        })
        .eq("id", reportId);
    }
  }

  logger.info("[ProgressReport] Generated", {
    userId,
    reportId,
    overallPercentage: payload.overallPercentage,
    trigger,
  });
  return {
    success: true,
    reportId,
    status: "completed",
    overallPercentage: payload.overallPercentage,
  };
}

async function callClaude(
  snapshot: FounderProgressSnapshot
): Promise<ProgressReportPayload> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY not set");
  }
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const completion = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 3000,
    system: buildSystemPrompt(),
    messages: [{ role: "user", content: buildUserMessage(snapshot) }],
  });

  const textBlock = completion.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Claude returned no text block");
  }
  const payload = parseProgressPayload(textBlock.text);
  // The LLM occasionally drifts on the echoed percentage; trust the snapshot.
  payload.overallPercentage = snapshot.overallPercentage;
  return payload;
}

async function emailReport(
  to: string,
  snapshot: FounderProgressSnapshot,
  payload: ProgressReportPayload,
  html: string
): Promise<{ success: boolean; id?: string }> {
  if (!process.env.RESEND_API_KEY) {
    logger.warn("[ProgressReport] RESEND_API_KEY missing - skipping email");
    return { success: false };
  }
  const resend = new Resend(process.env.RESEND_API_KEY);
  const fromName = process.env.RESEND_FROM_NAME || "Sahara";
  const fromEmail = process.env.RESEND_FROM_EMAIL || "fred@joinsahara.com";

  try {
    const { data, error } = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to,
      subject: `${snapshot.founderName}, your founder progress report (${payload.overallPercentage}% complete)`,
      html,
      text: renderProgressReportText(snapshot, payload),
      tags: [
        { name: "type", value: "founder_progress_report" },
        { name: "tier", value: payload.recommendedTier },
        { name: "stage", value: snapshot.currentStage },
      ],
    });
    if (error) {
      logger.error("[ProgressReport] Resend error", { error });
      return { success: false };
    }
    return { success: true, id: data?.id };
  } catch (err) {
    logger.error("[ProgressReport] Email send threw", { err });
    return { success: false };
  }
}
