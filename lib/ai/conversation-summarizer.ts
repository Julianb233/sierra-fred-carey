/**
 * Conversation Summarizer (AI-3522)
 *
 * Internal AI routine that automatically summarizes a founder's recent
 * conversation history so the system can (a) prioritize who needs attention
 * and (b) surface free -> paid upsell opportunities.
 *
 * Source of conversations: `fred_episodic_memory` rows with
 * event_type = "conversation" (FRED's episodic memory). We pull the recent
 * window, render a lightweight transcript, ask the AI for a structured JSON
 * summary, validate it, and persist to `conversation_summaries`.
 *
 * Mirrors the resilience pattern of lib/ai/insight-extractor.ts: never throws
 * into the caller's hot path — returns a safe default on parse/AI failure and
 * fails soft on persistence.
 */

import { generateChatResponse } from "./client";
import { retrieveRecentEpisodes } from "@/lib/db/fred-memory";
import { sql } from "@/lib/db/supabase-sql";
import { logger } from "@/lib/logger";

export type ConversationSentiment =
  | "positive"
  | "neutral"
  | "frustrated"
  | "at_risk";

export interface ConversationSummary {
  /** One-line headline a human PM can scan. */
  headline: string;
  /** 2-5 recurring themes across the window. */
  keyThemes: string[];
  /** What the founder is actively working on right now. */
  currentFocus: string;
  /** Concrete blockers / open questions. */
  blockers: string[];
  /** Overall emotional read — drives prioritization + tone. */
  sentiment: ConversationSentiment;
  /** 1-10. Higher = needs attention sooner (for prioritization queues). */
  priorityScore: number;
  /** Signals that feed the upsell engine. */
  engagementSignals: {
    /** Capabilities the founder showed interest in (may map to paid tiers). */
    featureInterest: string[];
    /** Pain points raised. */
    painPoints: string[];
    /** Moments where the product clearly delivered value. */
    valueMoments: string[];
  };
  /** AI's first-pass read on upsell potential (refined by the upsell engine). */
  upsell: {
    opportunity: boolean;
    rationale: string;
    /** Phrases/asks that hint at higher-tier features. */
    triggers: string[];
    confidence: number; // 0..1
  };
  /** Number of conversation episodes the summary was built from. */
  sourceEpisodes: number;
}

const EMPTY_SUMMARY: ConversationSummary = {
  headline: "No recent conversation activity",
  keyThemes: [],
  currentFocus: "",
  blockers: [],
  sentiment: "neutral",
  priorityScore: 1,
  engagementSignals: { featureInterest: [], painPoints: [], valueMoments: [] },
  upsell: { opportunity: false, rationale: "", triggers: [], confidence: 0 },
  sourceEpisodes: 0,
};

const SUMMARY_PROMPT = `You are a conversation-analysis AI for "Sahara", an AI Founder OS that coaches startup founders. You analyze a founder's recent chat history with the AI mentor (FRED) and produce a structured summary used internally to (1) prioritize which founders need attention and (2) identify upsell opportunities from the Free tier to paid tiers (Builder, Pro, Studio).

Paid-tier capabilities to watch for as upsell signals:
- Builder: saved profile/memory, strategy outputs (lean plans, roadmaps), priority responses
- Pro: full Investor Lens, investor readiness score, pitch deck teardown, executive summaries, 30/60/90 plans, deep memory
- Studio: investor targeting/outreach, Boardy investor matching, weekly SMS check-ins, AI Operator Team (Founder/Fundraise/Growth/Inbox Ops agents)

Return ONLY valid JSON (no markdown, no prose) with EXACTLY this shape:
{
  "headline": "string (<=120 chars, scannable)",
  "keyThemes": ["string", ...],            // 2-5 items
  "currentFocus": "string",                 // what they're working on now
  "blockers": ["string", ...],              // concrete blockers/open questions
  "sentiment": "positive" | "neutral" | "frustrated" | "at_risk",
  "priorityScore": 1-10,                     // 10 = needs attention urgently
  "engagementSignals": {
    "featureInterest": ["string", ...],     // capabilities they wanted; use the feature names above when they fit
    "painPoints": ["string", ...],
    "valueMoments": ["string", ...]
  },
  "upsell": {
    "opportunity": true | false,
    "rationale": "string (why upgrading helps THIS founder, 1-2 sentences)",
    "triggers": ["string", ...],            // exact asks that hint at higher-tier features
    "confidence": 0.0-1.0
  }
}

Rules:
- Base everything on the transcript only. Do not invent facts.
- If a free founder repeatedly asks for investor/pitch/deck help, that's a strong Pro upsell trigger.
- If they want accountability, automation, or "do it for me", that's a Studio trigger.
- "at_risk" = signs of churn/disengagement/major frustration; raise priorityScore accordingly.
- If the transcript is empty or trivial, set opportunity=false, confidence=0, priorityScore<=2.`;

/** Render episodic conversation rows into a compact transcript for the model. */
function renderTranscript(
  episodes: Array<{ content: Record<string, unknown>; createdAt: Date }>
): string {
  const lines: string[] = [];
  // Oldest-first reads more naturally for the model.
  for (const ep of [...episodes].reverse()) {
    const c = ep.content || {};
    const userMsg =
      (c.userMessage as string) ??
      (c.user as string) ??
      (c.message as string) ??
      (c.input as string) ??
      "";
    const assistantMsg =
      (c.assistantMessage as string) ??
      (c.assistant as string) ??
      (c.response as string) ??
      (c.output as string) ??
      "";
    const summary = (c.summary as string) ?? (c.text as string) ?? "";

    if (userMsg) lines.push(`Founder: ${String(userMsg).slice(0, 800)}`);
    if (assistantMsg) lines.push(`FRED: ${String(assistantMsg).slice(0, 800)}`);
    if (!userMsg && !assistantMsg && summary) {
      lines.push(`Note: ${String(summary).slice(0, 800)}`);
    }
  }
  return lines.join("\n");
}

function stripCodeFence(raw: string): string {
  let s = raw.trim();
  if (s.startsWith("```")) {
    s = s.replace(/^```json?\n?/i, "").replace(/\n?```$/, "").trim();
  }
  return s;
}

/** Coerce a raw parsed object into a valid, bounded ConversationSummary. */
export function normalizeSummary(
  raw: unknown,
  sourceEpisodes: number
): ConversationSummary {
  const o = (raw ?? {}) as Record<string, unknown>;
  const asArray = (v: unknown): string[] =>
    Array.isArray(v) ? v.map((x) => String(x)).filter(Boolean) : [];

  const validSentiments: ConversationSentiment[] = [
    "positive",
    "neutral",
    "frustrated",
    "at_risk",
  ];
  const sentiment = validSentiments.includes(o.sentiment as ConversationSentiment)
    ? (o.sentiment as ConversationSentiment)
    : "neutral";

  const priorityRaw = Number(o.priorityScore);
  const priorityScore = Number.isFinite(priorityRaw)
    ? Math.max(1, Math.min(10, Math.round(priorityRaw)))
    : 3;

  const sig = (o.engagementSignals ?? {}) as Record<string, unknown>;
  const ups = (o.upsell ?? {}) as Record<string, unknown>;
  const confRaw = Number(ups.confidence);
  const confidence = Number.isFinite(confRaw)
    ? Math.max(0, Math.min(1, confRaw))
    : 0;

  return {
    headline: String(o.headline ?? "").slice(0, 200) || EMPTY_SUMMARY.headline,
    keyThemes: asArray(o.keyThemes).slice(0, 5),
    currentFocus: String(o.currentFocus ?? ""),
    blockers: asArray(o.blockers).slice(0, 8),
    sentiment,
    priorityScore,
    engagementSignals: {
      featureInterest: asArray(sig.featureInterest).slice(0, 10),
      painPoints: asArray(sig.painPoints).slice(0, 10),
      valueMoments: asArray(sig.valueMoments).slice(0, 10),
    },
    upsell: {
      opportunity: Boolean(ups.opportunity),
      rationale: String(ups.rationale ?? ""),
      triggers: asArray(ups.triggers).slice(0, 10),
      confidence,
    },
    sourceEpisodes,
  };
}

/**
 * Summarize a user's recent conversations into a structured summary.
 * Never throws — returns EMPTY_SUMMARY (or a best-effort summary) on failure.
 *
 * @param userId  The founder to summarize.
 * @param options.limit  Max conversation episodes to pull (default 20).
 */
export async function summarizeUserConversations(
  userId: string,
  options: { limit?: number } = {}
): Promise<ConversationSummary> {
  const limit = options.limit ?? 20;
  logger.log(`[ConvSummary] Summarizing up to ${limit} episodes for ${userId}`);

  let episodes: Array<{ content: Record<string, unknown>; createdAt: Date }> = [];
  try {
    episodes = await retrieveRecentEpisodes(userId, {
      limit,
      eventType: "conversation",
    });
  } catch (error) {
    console.error("[ConvSummary] Failed to load episodes:", error);
    return { ...EMPTY_SUMMARY };
  }

  if (episodes.length === 0) {
    return { ...EMPTY_SUMMARY };
  }

  const transcript = renderTranscript(episodes);
  if (transcript.trim().length === 0) {
    return { ...EMPTY_SUMMARY, sourceEpisodes: episodes.length };
  }

  let response: string;
  try {
    response = await generateChatResponse(
      [{ role: "user", content: `Recent conversation transcript:\n\n${transcript}` }],
      SUMMARY_PROMPT
    );
  } catch (error) {
    console.error("[ConvSummary] AI generation failed:", error);
    return { ...EMPTY_SUMMARY, sourceEpisodes: episodes.length };
  }

  try {
    const parsed = JSON.parse(stripCodeFence(response));
    return normalizeSummary(parsed, episodes.length);
  } catch (error) {
    console.error("[ConvSummary] Failed to parse summary JSON:", error);
    console.error("[ConvSummary] Response was:", response);
    return { ...EMPTY_SUMMARY, sourceEpisodes: episodes.length };
  }
}

/**
 * Persist a summary to `conversation_summaries`. Fail-soft: logs and returns
 * null on error so a summarization run never breaks the caller.
 *
 * @returns the inserted row id, or null on failure.
 */
export async function saveSummary(
  userId: string,
  summary: ConversationSummary,
  upsell?: {
    recommend: boolean;
    targetTier: number | null;
    urgency: string;
    confidence: number;
  }
): Promise<string | null> {
  try {
    const result = await sql`
      INSERT INTO conversation_summaries (
        user_id,
        headline,
        key_themes,
        current_focus,
        blockers,
        sentiment,
        priority_score,
        engagement_signals,
        upsell,
        source_episodes,
        upsell_recommended,
        upsell_target_tier,
        upsell_urgency,
        upsell_confidence
      )
      VALUES (
        ${userId},
        ${summary.headline},
        ${JSON.stringify(summary.keyThemes)},
        ${summary.currentFocus},
        ${JSON.stringify(summary.blockers)},
        ${summary.sentiment},
        ${summary.priorityScore},
        ${JSON.stringify(summary.engagementSignals)},
        ${JSON.stringify(summary.upsell)},
        ${summary.sourceEpisodes},
        ${upsell?.recommend ?? null},
        ${upsell?.targetTier ?? null},
        ${upsell?.urgency ?? null},
        ${upsell?.confidence ?? null}
      )
      RETURNING id
    `;
    const id = result[0]?.id as string;
    logger.log(`[ConvSummary] Saved summary ${id} for user ${userId}`);
    return id ?? null;
  } catch (error) {
    console.error("[ConvSummary] Failed to save summary:", error);
    return null;
  }
}

/** Fetch the most recent stored summary for a user, or null. */
export async function getLatestSummary(
  userId: string
): Promise<(ConversationSummary & { id: string; createdAt: string }) | null> {
  try {
    const rows = await sql`
      SELECT * FROM conversation_summaries
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
      LIMIT 1
    `;
    if (rows.length === 0) return null;
    const r = rows[0] as Record<string, unknown>;
    const parse = <T>(v: unknown, fallback: T): T => {
      if (v == null) return fallback;
      if (typeof v === "object") return v as T;
      try {
        return JSON.parse(String(v)) as T;
      } catch {
        return fallback;
      }
    };
    return {
      id: String(r.id),
      createdAt: String(r.created_at),
      headline: String(r.headline ?? ""),
      keyThemes: parse<string[]>(r.key_themes, []),
      currentFocus: String(r.current_focus ?? ""),
      blockers: parse<string[]>(r.blockers, []),
      sentiment: (r.sentiment as ConversationSentiment) ?? "neutral",
      priorityScore: Number(r.priority_score ?? 1),
      engagementSignals: parse(r.engagement_signals, {
        featureInterest: [],
        painPoints: [],
        valueMoments: [],
      }),
      upsell: parse(r.upsell, {
        opportunity: false,
        rationale: "",
        triggers: [],
        confidence: 0,
      }),
      sourceEpisodes: Number(r.source_episodes ?? 0),
    };
  } catch (error) {
    console.error("[ConvSummary] Failed to fetch latest summary:", error);
    return null;
  }
}
