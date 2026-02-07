import { generateChatResponse } from "./client";
import { sql } from "@/lib/db/supabase-sql";
import { logger } from "@/lib/logger";

export interface ExtractedInsight {
  type: "breakthrough" | "warning" | "opportunity" | "pattern" | "recommendation";
  title: string;
  content: string;
  importance: number; // 1-10
  tags: string[];
}

const INSIGHT_EXTRACTION_PROMPT = `You are an insight extraction AI for a startup coaching platform. Analyze AI responses and extract key insights that would be valuable for a startup founder to remember.

For each insight found, categorize it as:
- **breakthrough**: A significant realization, validation, or "aha moment"
- **warning**: A potential risk, red flag, or concern to address
- **opportunity**: An actionable opportunity or growth area identified
- **pattern**: A recurring theme or pattern across analyses
- **recommendation**: A specific action item or suggestion

Return ONLY a JSON array of insights. Each insight should have:
- type: One of the categories above
- title: Short title (max 100 chars)
- content: Full insight description (1-3 sentences)
- importance: Number 1-10 (10 = critical, 1 = minor)
- tags: Array of relevant tags (e.g., ["market", "product", "fundraising"])

Example output:
[
  {
    "type": "warning",
    "title": "Market saturation concern",
    "content": "The AI chatbot market is highly saturated with 50+ competitors. Need a clear differentiation strategy.",
    "importance": 8,
    "tags": ["market", "competition", "strategy"]
  },
  {
    "type": "opportunity",
    "title": "Enterprise pivot potential",
    "content": "Strong interest from enterprise customers suggests B2B pivot could unlock 10x revenue growth.",
    "importance": 9,
    "tags": ["market", "revenue", "b2b"]
  }
]

If no significant insights are found, return empty array: []

IMPORTANT: Return ONLY valid JSON. No markdown, no explanations, just the JSON array.`;

/**
 * Extract insights from an AI response using GPT-4
 *
 * @param userId - User ID for insight ownership
 * @param sourceType - Type of source (e.g., 'checkin', 'document', 'pitch_deck')
 * @param sourceId - ID of the source object
 * @param aiResponse - The AI response text to analyze
 * @param context - Optional context about what was analyzed
 * @returns Array of extracted insights
 */
export async function extractInsights(
  userId: string,
  sourceType: string,
  sourceId: string,
  aiResponse: string,
  context?: string
): Promise<ExtractedInsight[]> {
  logger.log(`[Insights] Extracting insights from ${sourceType} ${sourceId}`);

  try {
    // Build context-aware user prompt
    let userPrompt = `AI Response to analyze:\n\n${aiResponse}`;

    if (context) {
      userPrompt = `Context: ${context}\n\n${userPrompt}`;
    }

    // Call AI to extract insights
    const response = await generateChatResponse(
      [{ role: "user", content: userPrompt }],
      INSIGHT_EXTRACTION_PROMPT
    );

    if (process.env.NODE_ENV === "development") {
      logger.log("[Insights] Raw extraction response:", response);
    }

    // Parse JSON response
    let insights: ExtractedInsight[];
    try {
      // Clean up response - remove markdown code blocks if present
      let cleanedResponse = response.trim();
      if (cleanedResponse.startsWith("```")) {
        cleanedResponse = cleanedResponse
          .replace(/^```json?\n?/, "")
          .replace(/\n?```$/, "")
          .trim();
      }

      insights = JSON.parse(cleanedResponse);
    } catch (parseError) {
      console.error("[Insights] Failed to parse JSON response:", parseError);
      console.error("[Insights] Response was:", response);
      // Return empty array on parse failure
      return [];
    }

    // Validate insights
    if (!Array.isArray(insights)) {
      console.error("[Insights] Response is not an array:", insights);
      return [];
    }

    // Filter and validate insights
    const validInsights = insights.filter((insight) => {
      if (!insight.type || !insight.title || !insight.content) {
        console.warn("[Insights] Invalid insight (missing fields):", insight);
        return false;
      }

      const validTypes = [
        "breakthrough",
        "warning",
        "opportunity",
        "pattern",
        "recommendation",
      ];
      if (!validTypes.includes(insight.type)) {
        console.warn("[Insights] Invalid insight type:", insight.type);
        return false;
      }

      if (
        typeof insight.importance !== "number" ||
        insight.importance < 1 ||
        insight.importance > 10
      ) {
        console.warn("[Insights] Invalid importance value:", insight.importance);
        // Fix it instead of filtering
        insight.importance = Math.max(1, Math.min(10, insight.importance || 5));
      }

      if (!Array.isArray(insight.tags)) {
        insight.tags = [];
      }

      return true;
    });

    logger.log(`[Insights] Extracted ${validInsights.length} valid insights`);
    return validInsights;
  } catch (error) {
    console.error("[Insights] Error extracting insights:", error);
    // Don't throw - return empty array on error
    return [];
  }
}

/**
 * Save extracted insights to the database
 *
 * @param userId - User ID for insight ownership
 * @param sourceType - Type of source
 * @param sourceId - ID of the source object
 * @param insights - Array of insights to save
 */
export async function saveInsights(
  userId: string,
  sourceType: string,
  sourceId: string,
  insights: ExtractedInsight[]
): Promise<void> {
  if (insights.length === 0) {
    logger.log("[Insights] No insights to save");
    return;
  }

  logger.log(`[Insights] Saving ${insights.length} insights for user ${userId}`);

  try {
    // Insert all insights in one query
    for (const insight of insights) {
      await sql`
        INSERT INTO ai_insights (
          user_id,
          source_type,
          source_id,
          insight_type,
          title,
          content,
          importance,
          tags
        )
        VALUES (
          ${userId},
          ${sourceType},
          ${sourceId},
          ${insight.type},
          ${insight.title},
          ${insight.content},
          ${insight.importance},
          ${insight.tags}
        )
      `;
    }

    logger.log(`[Insights] Successfully saved ${insights.length} insights`);
  } catch (error) {
    console.error("[Insights] Error saving insights:", error);
    throw error;
  }
}

/**
 * Extract and save insights in one call
 * Convenience function that combines extraction and saving
 *
 * @param userId - User ID for insight ownership
 * @param sourceType - Type of source
 * @param sourceId - ID of the source object
 * @param aiResponse - The AI response text to analyze
 * @param context - Optional context
 * @returns Array of extracted insights
 */
export async function extractAndSaveInsights(
  userId: string,
  sourceType: string,
  sourceId: string,
  aiResponse: string,
  context?: string
): Promise<ExtractedInsight[]> {
  logger.log(
    `[Insights] Extract and save for ${sourceType} ${sourceId}`
  );

  const insights = await extractInsights(
    userId,
    sourceType,
    sourceId,
    aiResponse,
    context
  );

  if (insights.length > 0) {
    await saveInsights(userId, sourceType, sourceId, insights);
  }

  return insights;
}

/**
 * Get insights for a user, optionally filtered
 *
 * @param userId - User ID
 * @param options - Filter options
 * @returns Array of insights with metadata
 */
export async function getUserInsights(
  userId: string,
  options?: {
    sourceType?: string;
    sourceId?: string;
    insightType?: string;
    minImportance?: number;
    limit?: number;
  }
): Promise<
  Array<
    ExtractedInsight & {
      id: string;
      sourceType: string;
      sourceId: string;
      isDismissed: boolean;
      createdAt: Date;
    }
  >
> {
  logger.log(`[Insights] Getting insights for user ${userId}`, options);

  try {
    let query = sql`
      SELECT
        id,
        source_type as "sourceType",
        source_id as "sourceId",
        insight_type as "type",
        title,
        content,
        importance,
        tags,
        is_dismissed as "isDismissed",
        created_at as "createdAt"
      FROM ai_insights
      WHERE user_id = ${userId}
    `;

    // Add filters
    if (options?.sourceType) {
      query = sql`${query} AND source_type = ${options.sourceType}`;
    }
    if (options?.sourceId) {
      query = sql`${query} AND source_id = ${options.sourceId}`;
    }
    if (options?.insightType) {
      query = sql`${query} AND insight_type = ${options.insightType}`;
    }
    if (options?.minImportance) {
      query = sql`${query} AND importance >= ${options.minImportance}`;
    }

    query = sql`${query} ORDER BY created_at DESC`;

    if (options?.limit) {
      query = sql`${query} LIMIT ${options.limit}`;
    }

    const result = await query;

    logger.log(`[Insights] Found ${result.length} insights`);
    return result as any;
  } catch (error) {
    console.error("[Insights] Error getting user insights:", error);
    return [];
  }
}

/**
 * Dismiss an insight (mark as read/not relevant)
 *
 * @param userId - User ID (for authorization)
 * @param insightId - Insight ID to dismiss
 */
export async function dismissInsight(
  userId: string,
  insightId: string
): Promise<void> {
  logger.log(`[Insights] Dismissing insight ${insightId} for user ${userId}`);

  try {
    await sql`
      UPDATE ai_insights
      SET is_dismissed = true
      WHERE id = ${insightId}
        AND user_id = ${userId}
    `;

    logger.log(`[Insights] Dismissed insight ${insightId}`);
  } catch (error) {
    console.error("[Insights] Error dismissing insight:", error);
    throw error;
  }
}
