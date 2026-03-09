/**
 * Chat Context Loader for Voice Agent
 * Phase 82: Chat/Voice Continuity
 *
 * Loads recent chat messages from episodic memory so the voice agent
 * can include them in its preamble, creating seamless continuity
 * between text chat and voice calls.
 */

import { createServiceClient } from "@/lib/supabase/server"

// ============================================================================
// Types
// ============================================================================

export interface ChatMessage {
  role: "user" | "assistant"
  content: string
  timestamp: string
}

export interface ChatContextForVoice {
  messages: ChatMessage[]
  lastTopic: string | null
  summary: string
}

// ============================================================================
// Constants
// ============================================================================

/** Max approximate tokens for voice preamble context (keeps voice prompt lean) */
const MAX_PREAMBLE_CHARS = 2000 // ~500 tokens

/** Default number of recent messages to load */
const DEFAULT_MESSAGE_LIMIT = 10

// ============================================================================
// Public API
// ============================================================================

/**
 * Load recent chat messages for a user to provide voice agent context.
 *
 * Queries fred_episodic_memory for the user's most recent conversation
 * episodes and formats them for voice preamble injection.
 */
export async function loadChatContextForVoice(
  userId: string,
  limit: number = DEFAULT_MESSAGE_LIMIT
): Promise<ChatContextForVoice> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from("fred_episodic_memory")
    .select("content, created_at, event_type")
    .eq("user_id", userId)
    .eq("event_type", "conversation")
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) {
    console.warn("[Voice Context] Failed to load chat context:", error.message)
    return { messages: [], lastTopic: null, summary: "" }
  }

  if (!data || data.length === 0) {
    return { messages: [], lastTopic: null, summary: "" }
  }

  // Reverse to chronological order (oldest first)
  const rows = data.reverse()

  const messages: ChatMessage[] = rows
    .filter((row) => row.content && typeof row.content === "object")
    .map((row) => {
      const content = row.content as Record<string, unknown>
      return {
        role: (content.role as "user" | "assistant") || "user",
        content: (content.content as string) || "",
        timestamp: row.created_at as string,
      }
    })
    .filter((msg) => msg.content.length > 0)

  const lastTopic = extractLastTopic(messages)
  const summary = buildBriefSummary(messages)

  return { messages, lastTopic, summary }
}

/**
 * Format loaded chat context into a concise preamble string
 * suitable for injecting into the voice agent's system prompt.
 *
 * Truncates to ~500 tokens to avoid bloating the voice prompt.
 */
export function formatChatForPreamble(context: ChatContextForVoice, founderContext?: string): string {
  if (context.messages.length === 0 && !founderContext) {
    return ""
  }

  const lines: string[] = []

  // Prepend founder context from Phase 79 structured memory
  if (founderContext && founderContext.length > 0) {
    lines.push("About this founder:")
    lines.push(founderContext)
    lines.push("")
  }

  if (context.messages.length === 0) {
    return lines.join("\n")
  }

  lines.push("Recent chat context (the user chatted with you in text before this call):")

  for (const msg of context.messages) {
    const speaker = msg.role === "user" ? "User" : "You (Fred)"
    // Truncate individual messages to keep preamble compact
    const truncatedContent = msg.content.length > 200
      ? msg.content.slice(0, 197) + "..."
      : msg.content
    lines.push(`- ${speaker}: ${truncatedContent}`)
  }

  if (context.lastTopic) {
    lines.push(`\nLast topic discussed: ${context.lastTopic}`)
  }

  lines.push("\nPick up naturally from where the text conversation left off. Don't repeat what was already covered unless asked.")

  let result = lines.join("\n")

  // Enforce max length to stay under ~500 tokens
  if (result.length > MAX_PREAMBLE_CHARS) {
    result = result.slice(0, MAX_PREAMBLE_CHARS - 3) + "..."
  }

  return result
}

// ============================================================================
// Internal Helpers
// ============================================================================

/**
 * Extract the "last topic" from the most recent user message.
 * Uses a simple heuristic: first sentence or first 80 characters.
 */
function extractLastTopic(messages: ChatMessage[]): string | null {
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

/**
 * Build a brief summary of the conversation for metadata.
 */
function buildBriefSummary(messages: ChatMessage[]): string {
  if (messages.length === 0) return ""

  const topics = messages
    .filter((m) => m.role === "user")
    .slice(-3)
    .map((m) => {
      const content = m.content.trim()
      return content.length > 60 ? content.slice(0, 57) + "..." : content
    })

  if (topics.length === 0) return ""
  return `Recent topics: ${topics.join("; ")}`
}
