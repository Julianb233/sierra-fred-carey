/**
 * Chat-to-Voice Context Bridge
 * Phase 82: Chat/Voice Continuity
 *
 * Fetches recent chat messages and formats them for voice agent preamble injection.
 * Uses the lower-level chat-context-loader for data access, then formats
 * the result into a structured preamble block for the voice agent.
 */

import {
  loadChatContextForVoice,
  formatChatForPreamble,
  type ChatMessage,
} from "@/lib/voice/chat-context-loader"
import { storeChannelEntry } from "@/lib/channels/conversation-context"

// ============================================================================
// Types
// ============================================================================

export interface ChatVoiceContext {
  /** Formatted preamble block to inject into voice agent system prompt */
  preambleBlock: string
  /** Short description of the last discussed topic (for UI display) */
  lastTopic: string | null
}

export interface VoiceTranscriptEntry {
  speaker: "user" | "fred"
  text: string
  timestamp: string
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Fetch recent chat context for a user and format it for voice agent injection.
 *
 * Returns a preamble block (string to append to the voice system prompt) and
 * the last discussed topic (for the "Last discussed: ..." UI indicator).
 *
 * Non-blocking: catches all errors and returns empty context on failure.
 */
export async function getChatContextForVoice(
  userId: string
): Promise<ChatVoiceContext> {
  try {
    const context = await loadChatContextForVoice(userId, 10)

    const preambleBlock = formatChatForPreamble(context)
    const lastTopic = context.lastTopic

    return { preambleBlock, lastTopic }
  } catch (err) {
    console.warn("[Chat-Voice Bridge] Failed to load chat context:", err)
    return { preambleBlock: "", lastTopic: null }
  }
}

/**
 * Inject a voice call transcript into chat history via the conversation context layer.
 *
 * Stores each transcript entry as an episodic memory record with channel='voice',
 * then appends a summary entry so that subsequent text chats see what was discussed.
 *
 * Non-throwing: logs warnings on failure, never propagates errors.
 */
export async function injectVoiceTranscriptToChat(
  userId: string,
  roomName: string,
  transcript: VoiceTranscriptEntry[]
): Promise<void> {
  try {
    const sessionId = `voice-${roomName}`

    // Store individual transcript entries
    for (const entry of transcript) {
      const role = entry.speaker === "fred" ? "assistant" : "user"
      await storeChannelEntry(userId, sessionId, "voice", role, entry.text, {
        roomName,
        voiceTimestamp: entry.timestamp,
      })
    }

    // Build a brief summary from user and assistant messages
    const userMessages = transcript
      .filter((e) => e.speaker === "user")
      .map((e) => e.text)
      .join(" ")
    const userSummary =
      userMessages.slice(0, 200) + (userMessages.length > 200 ? "..." : "")

    const assistantMessages = transcript
      .filter((e) => e.speaker === "fred")
      .map((e) => e.text)
      .join(" ")
    const assistantSummary =
      assistantMessages.slice(0, 200) +
      (assistantMessages.length > 200 ? "..." : "")

    const summaryContent = `[Voice Call Summary] You called and discussed: ${userSummary}. FRED covered: ${assistantSummary}`

    await storeChannelEntry(
      userId,
      sessionId,
      "voice",
      "assistant",
      summaryContent,
      {
        type: "voice_summary",
        roomName,
      }
    )
  } catch (err) {
    console.warn("[Chat-Voice Bridge] Failed to inject voice transcript:", err)
  }
}

/**
 * Extract the last discussed topic from a list of chat messages.
 * Returns the first sentence (or first 80 chars) of the most recent user message.
 * Returns null if no user messages exist.
 */
export function getLastDiscussedTopic(
  messages: ChatMessage[]
): string | null {
  // Find the most recent user message
  const lastUserMsg = [...messages].reverse().find((m) => m.role === "user")
  if (!lastUserMsg || !lastUserMsg.content) return null

  const content = lastUserMsg.content.trim()

  // Take the first sentence (split on period, question mark, or exclamation)
  const sentenceMatch = content.match(/^[^.!?]+[.!?]/)
  if (sentenceMatch && sentenceMatch[0].length <= 100) {
    return sentenceMatch[0].trim()
  }

  // Fall back to first 80 characters
  if (content.length <= 80) return content
  return content.slice(0, 77) + "..."
}
