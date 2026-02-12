/**
 * FRED SMS Handler
 * Phase 42: Multi-Channel FRED Access
 *
 * Formats FRED responses for SMS delivery (160-char segments).
 * Routes SMS conversations through the same FRED chat engine.
 * Handles SMS-specific constraints: numbered actions, concise responses.
 */

import { createFredService } from "@/lib/fred/service";
import { buildFounderContext } from "@/lib/fred/context-builder";
import { sendSMS } from "@/lib/sms/client";
import { storeEpisode } from "@/lib/db/fred-memory";

// ============================================================================
// Constants
// ============================================================================

/** Standard SMS segment length */
const SMS_SEGMENT_LENGTH = 160;

/** Max response length for SMS (3 segments) */
const MAX_SMS_LENGTH = 480;

// ============================================================================
// SMS Formatting
// ============================================================================

/**
 * Format a FRED response for SMS delivery.
 * - Strips markdown formatting
 * - Truncates to fit SMS segment limits
 * - Formats Next 3 Actions as numbered list
 */
export function formatForSMS(response: string): string {
  let formatted = response
    // Strip markdown bold/italic
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/_(.+?)_/g, "$1")
    // Strip markdown headers
    .replace(/^#{1,6}\s+/gm, "")
    // Strip bullet points, replace with dashes
    .replace(/^[\s]*[-*]\s+/gm, "- ")
    // Collapse multiple newlines
    .replace(/\n{3,}/g, "\n\n")
    // Trim whitespace
    .trim();

  // If response is too long, truncate intelligently
  if (formatted.length > MAX_SMS_LENGTH) {
    // Try to cut at a sentence boundary
    const truncated = formatted.slice(0, MAX_SMS_LENGTH - 3);
    const lastSentence = truncated.lastIndexOf(". ");
    if (lastSentence > MAX_SMS_LENGTH * 0.5) {
      formatted = truncated.slice(0, lastSentence + 1);
    } else {
      formatted = truncated + "...";
    }
  }

  return formatted;
}

/**
 * Format Next 3 Actions as a numbered SMS-friendly list.
 */
export function formatActionsForSMS(actions: string[]): string {
  const numbered = actions
    .slice(0, 3)
    .map((action, i) => `${i + 1}. ${action}`)
    .join("\n");
  return `Next Actions:\n${numbered}`;
}

/**
 * Split a long message into SMS segments for multi-part delivery.
 * Each segment stays within the 160-char limit.
 */
export function splitIntoSegments(text: string): string[] {
  if (text.length <= SMS_SEGMENT_LENGTH) {
    return [text];
  }

  const segments: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= SMS_SEGMENT_LENGTH) {
      segments.push(remaining);
      break;
    }

    // Try to split at a sentence or word boundary
    let splitIdx = remaining.lastIndexOf(". ", SMS_SEGMENT_LENGTH);
    if (splitIdx < SMS_SEGMENT_LENGTH * 0.4) {
      splitIdx = remaining.lastIndexOf(" ", SMS_SEGMENT_LENGTH);
    }
    if (splitIdx <= 0) {
      splitIdx = SMS_SEGMENT_LENGTH;
    }

    segments.push(remaining.slice(0, splitIdx + 1).trim());
    remaining = remaining.slice(splitIdx + 1).trim();
  }

  return segments;
}

// ============================================================================
// FRED SMS Processing
// ============================================================================

/**
 * Process an inbound SMS as a FRED conversation.
 * Routes through the same FRED chat engine for consistent mentor responses.
 *
 * @param userId - The authenticated user ID
 * @param phoneNumber - Sender phone number (E.164 format)
 * @param message - Inbound message text
 */
export async function processFredSMS(
  userId: string,
  phoneNumber: string,
  message: string
): Promise<void> {
  try {
    const sessionId = `sms_${userId}_${Date.now()}`;

    // Build founder context for personalized response
    const founderContext = await buildFounderContext(userId, true);

    // Create FRED service with SMS-specific instructions
    const fredService = createFredService({
      userId,
      sessionId,
      enableObservability: false,
      founderContext: `${founderContext}\n\n[SMS CHANNEL RULES]\n- Keep responses under 400 characters\n- Be direct and actionable\n- End with 1-3 numbered next actions\n- No markdown formatting\n- Use short sentences`,
    });

    // Process through FRED engine
    const result = await fredService.process({
      message,
      timestamp: new Date(),
    });

    const rawResponse = result.response.content;

    // Format for SMS delivery
    const smsResponse = formatForSMS(rawResponse);

    // Send response via SMS
    const segments = splitIntoSegments(smsResponse);
    for (const segment of segments) {
      await sendSMS(phoneNumber, segment);
    }

    // Store in episodic memory with channel tag
    try {
      await storeEpisode(userId, sessionId, "conversation", {
        role: "user",
        content: message,
        channel: "sms",
      });
      await storeEpisode(userId, sessionId, "conversation", {
        role: "assistant",
        content: rawResponse,
        channel: "sms",
      });
    } catch (err) {
      console.warn("[FRED SMS] Failed to store in memory:", err);
    }
  } catch (error) {
    console.error("[FRED SMS] Error processing message:", error);

    // Send error response via SMS
    try {
      await sendSMS(
        phoneNumber,
        "Hey, Fred here. Having some trouble processing that. Try again in a moment."
      );
    } catch {
      console.error("[FRED SMS] Failed to send error response");
    }
  }
}
