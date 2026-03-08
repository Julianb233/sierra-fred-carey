/**
 * Voice Transcript Injector
 * Phase 82: Chat/Voice Continuity
 *
 * After a voice call ends, summarizes the transcript and injects
 * the summary into chat history (episodic memory) so that text
 * chat can reference what was discussed on the call.
 */

import { generateText } from "ai"
import { getModel } from "@/lib/ai/providers"
import { getModelForTier } from "@/lib/ai/tier-routing"
import { storeEpisode } from "@/lib/db/fred-memory"

// ============================================================================
// Types
// ============================================================================

export interface TranscriptEntry {
  speaker: string
  text: string
  timestamp?: string
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Summarize a voice call transcript into 2-3 concise sentences.
 *
 * Uses the fast (free-tier) model for cost-efficient summarization.
 */
export async function summarizeTranscript(
  transcript: TranscriptEntry[]
): Promise<string> {
  if (transcript.length === 0) {
    return "Voice call with no recorded dialogue."
  }

  // Format transcript for the LLM
  const formattedTranscript = transcript
    .map((entry) => `${entry.speaker}: ${entry.text}`)
    .join("\n")

  // Truncate if very long (keep to ~4000 chars for fast model)
  const truncated = formattedTranscript.length > 4000
    ? formattedTranscript.slice(0, 3997) + "..."
    : formattedTranscript

  try {
    const providerKey = getModelForTier("free", "chat")
    const model = getModel(providerKey)

    const result = await generateText({
      model,
      system: "You are a concise summarizer. Summarize the following voice call transcript in 2-3 sentences. Focus on key decisions, advice given, and action items discussed. Be specific about what was discussed.",
      prompt: truncated,
      maxOutputTokens: 256,
      temperature: 0.3,
    })

    return result.text.trim() || "Voice call completed."
  } catch (error) {
    console.warn("[Transcript Injector] Failed to generate summary:", error)
    // Fallback: create a basic summary from transcript entries
    const speakers = [...new Set(transcript.map((e) => e.speaker))]
    return `Voice call between ${speakers.join(" and ")} with ${transcript.length} exchanges.`
  }
}

/**
 * Inject a voice call transcript summary into chat history (episodic memory).
 *
 * Stores as a special episode with channel: 'voice' so it appears
 * in the user's conversation history and can be referenced by FRED
 * in subsequent text chats.
 */
export async function injectTranscriptToChat(
  userId: string,
  transcript: TranscriptEntry[],
  summary: string
): Promise<void> {
  // Extract key points from transcript for richer context
  const keyPoints = extractKeyPoints(transcript)

  const content = keyPoints.length > 0
    ? `[Voice Call Summary] ${summary}\n\nKey points discussed:\n${keyPoints.map((p) => `- ${p}`).join("\n")}`
    : `[Voice Call Summary] ${summary}`

  // Generate a session ID for the voice call
  const sessionId = `voice-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

  await storeEpisode(userId, sessionId, "conversation", {
    role: "assistant",
    content,
    type: "voice_call_summary",
    transcriptLength: transcript.length,
    timestamp: new Date().toISOString(),
  }, {
    channel: "voice",
    importanceScore: 0.7,
    metadata: {
      source: "voice_call",
      transcriptEntries: transcript.length,
      summarizedAt: new Date().toISOString(),
    },
  })
}

// ============================================================================
// Internal Helpers
// ============================================================================

/**
 * Extract key discussion points from the transcript.
 * Looks for substantive user messages and Fred's advice.
 */
function extractKeyPoints(transcript: TranscriptEntry[]): string[] {
  const points: string[] = []

  for (const entry of transcript) {
    const text = entry.text.trim()
    // Skip very short entries (greetings, acknowledgments)
    if (text.length < 30) continue
    // Skip if it looks like a greeting or filler
    if (/^(hey|hi|hello|thanks|thank you|okay|ok|sure|yeah|yes|no|bye|goodbye)/i.test(text)) continue

    const truncated = text.length > 100 ? text.slice(0, 97) + "..." : text
    points.push(truncated)

    // Cap at 5 key points
    if (points.length >= 5) break
  }

  return points
}
