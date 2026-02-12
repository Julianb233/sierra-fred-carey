/**
 * Shared Conversation Context Layer
 * Phase 42: Multi-Channel FRED Access
 *
 * Provides unified conversation context across all channels (chat, voice, SMS).
 * FRED knows what was discussed regardless of the channel used.
 * Each conversation entry is tagged with its channel for cross-channel awareness.
 */

import { createServiceClient } from "@/lib/supabase/server";

// ============================================================================
// Types
// ============================================================================

/** Supported communication channels */
export type Channel = "chat" | "voice" | "sms";

export interface ChannelConversationEntry {
  id: string;
  channel: Channel;
  sessionId: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export interface ChannelSummary {
  channel: Channel;
  lastInteraction: string | null;
  messageCount: number;
}

export interface ConversationContext {
  /** Recent conversation entries across all channels */
  recentEntries: ChannelConversationEntry[];
  /** Summary of activity per channel */
  channelSummaries: ChannelSummary[];
  /** Total conversation count across all channels */
  totalConversations: number;
  /** Most recently used channel */
  lastChannel: Channel | null;
}

// ============================================================================
// Channel Context Functions
// ============================================================================

/**
 * Get recent conversation context across all channels for a user.
 * Returns the last N entries with channel tags so FRED can reference
 * previous discussions regardless of channel.
 *
 * @param userId - The user ID
 * @param limit - Max entries to return (default: 20)
 */
export async function getConversationContext(
  userId: string,
  limit = 20
): Promise<ConversationContext> {
  const supabase = createServiceClient();

  // Fetch recent episodic memory entries across all channels
  const { data: entries } = await supabase
    .from("fred_episodic_memory")
    .select("id, session_id, episode_type, content, created_at")
    .eq("user_id", userId)
    .eq("episode_type", "conversation")
    .order("created_at", { ascending: false })
    .limit(limit);

  const recentEntries: ChannelConversationEntry[] = (entries || []).map(
    (entry) => {
      const content = entry.content as Record<string, unknown>;
      return {
        id: entry.id,
        channel: (content?.channel as Channel) || "chat",
        sessionId: entry.session_id,
        role: (content?.role as "user" | "assistant") || "user",
        content: (content?.content as string) || "",
        createdAt: entry.created_at,
        metadata: content,
      };
    }
  );

  // Compute channel summaries
  const channelMap = new Map<Channel, { count: number; lastAt: string | null }>();
  for (const ch of ["chat", "voice", "sms"] as Channel[]) {
    channelMap.set(ch, { count: 0, lastAt: null });
  }

  for (const entry of recentEntries) {
    const existing = channelMap.get(entry.channel)!;
    existing.count++;
    if (!existing.lastAt || entry.createdAt > existing.lastAt) {
      existing.lastAt = entry.createdAt;
    }
  }

  const channelSummaries: ChannelSummary[] = Array.from(
    channelMap.entries()
  ).map(([channel, data]) => ({
    channel,
    lastInteraction: data.lastAt,
    messageCount: data.count,
  }));

  // Determine last channel used
  let lastChannel: Channel | null = null;
  let lastTime: string | null = null;
  for (const summary of channelSummaries) {
    if (
      summary.lastInteraction &&
      (!lastTime || summary.lastInteraction > lastTime)
    ) {
      lastChannel = summary.channel;
      lastTime = summary.lastInteraction;
    }
  }

  return {
    recentEntries: recentEntries.reverse(), // chronological order
    channelSummaries,
    totalConversations: recentEntries.length,
    lastChannel,
  };
}

/**
 * Build a cross-channel context prompt block for FRED's system prompt.
 * Summarizes recent activity across channels so FRED can reference it.
 */
export function buildChannelContextBlock(
  context: ConversationContext
): string {
  if (context.totalConversations === 0) {
    return "";
  }

  const parts: string[] = [
    "[CROSS-CHANNEL CONTEXT]",
    `The founder has interacted across these channels:`,
  ];

  for (const summary of context.channelSummaries) {
    if (summary.messageCount > 0) {
      const label =
        summary.channel === "chat"
          ? "In-app chat"
          : summary.channel === "voice"
          ? "Voice call"
          : "SMS text";
      parts.push(
        `- ${label}: ${summary.messageCount} recent messages (last: ${
          summary.lastInteraction
            ? new Date(summary.lastInteraction).toLocaleDateString()
            : "N/A"
        })`
      );
    }
  }

  // Include last few cross-channel topics for continuity
  const recentTopics = context.recentEntries
    .filter((e) => e.role === "user" && e.content.length > 10)
    .slice(-5)
    .map((e) => {
      const channelLabel =
        e.channel === "voice" ? "[voice]" : e.channel === "sms" ? "[sms]" : "[chat]";
      return `${channelLabel} "${e.content.slice(0, 80)}${e.content.length > 80 ? "..." : ""}"`;
    });

  if (recentTopics.length > 0) {
    parts.push("\nRecent topics across channels:");
    parts.push(...recentTopics.map((t) => `- ${t}`));
  }

  parts.push(
    "\nReference these when relevant -- e.g., 'When we talked on the phone, you mentioned...' or 'In your text earlier, you asked about...'"
  );

  return parts.join("\n");
}

/**
 * Store a conversation entry with channel tagging.
 * Wraps the existing storeEpisode with channel metadata.
 */
export async function storeChannelEntry(
  userId: string,
  sessionId: string,
  channel: Channel,
  role: "user" | "assistant",
  content: string,
  extraMetadata?: Record<string, unknown>
): Promise<void> {
  const supabase = createServiceClient();

  await supabase.from("fred_episodic_memory").insert({
    user_id: userId,
    session_id: sessionId,
    episode_type: "conversation",
    content: {
      role,
      content,
      channel,
      ...extraMetadata,
    },
  });
}
