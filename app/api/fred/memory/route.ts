/**
 * FRED Memory API Endpoint
 *
 * GET /api/fred/memory
 * Retrieve user's stored memories (recent episodes, facts, decisions, or semantic search).
 * Supports ?type=facts|episodes|decisions|search|all
 * Supports ?search=<text> for content-based filtering
 * Supports ?category=<cat> for fact category filtering
 *
 * POST /api/fred/memory
 * Store a new fact or episode in FRED's memory.
 *
 * DELETE /api/fred/memory
 * Remove a fact from semantic memory.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import {
  retrieveRecentEpisodes,
  searchEpisodesByEmbedding,
  storeEpisode,
  getAllUserFacts,
  getFactsByCategory,
  getFact,
  storeFact,
  deleteFact,
  getRecentDecisions,
  type SemanticCategory,
  type EpisodeEventType,
} from "@/lib/db/fred-memory";
import { generateEmbedding } from "@/lib/ai/fred-client";
import { checkRateLimitForUser, applyRateLimitHeaders } from "@/lib/api/rate-limit";

// ============================================================================
// Request Schemas
// ============================================================================

const VALID_CATEGORIES = [
  "startup_facts",
  "user_preferences",
  "market_knowledge",
  "team_info",
  "investor_info",
  "product_details",
  "metrics",
  "goals",
  "challenges",
  "decisions",
] as const;

const getMemoryQuerySchema = z.object({
  type: z.enum(["episodes", "facts", "decisions", "search", "all"]).default("facts"),
  category: z.enum(VALID_CATEGORIES).optional(),
  key: z.string().optional(),
  sessionId: z.string().uuid().optional(),
  eventType: z.enum(["conversation", "decision", "outcome", "feedback"]).optional(),
  query: z.string().optional(), // For semantic search
  search: z.string().optional(), // For text-based filtering
  limit: z.coerce.number().min(1).max(100).default(10),
});

const storeMemorySchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("fact"),
    category: z.enum(VALID_CATEGORIES),
    key: z.string().min(1).max(255),
    value: z.record(z.string(), z.unknown()),
    confidence: z.number().min(0).max(1).optional(),
    source: z.string().optional(),
    generateEmbedding: z.boolean().default(false),
  }),
  z.object({
    type: z.literal("episode"),
    sessionId: z.string().uuid(),
    eventType: z.enum(["conversation", "decision", "outcome", "feedback"]),
    content: z.record(z.string(), z.unknown()),
    importanceScore: z.number().min(0).max(1).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
    generateEmbedding: z.boolean().default(false),
  }),
]);

const deleteMemorySchema = z.object({
  category: z.enum(VALID_CATEGORIES),
  key: z.string().min(1),
});

// ============================================================================
// Helpers
// ============================================================================

/**
 * Perform a case-insensitive text search on an array of objects.
 * Serialises each item to JSON and checks for substring match.
 */
function textFilter<T>(items: T[], searchText: string): T[] {
  const q = searchText.toLowerCase();
  return items.filter((item) => JSON.stringify(item).toLowerCase().includes(q));
}

// ============================================================================
// Route Handlers
// ============================================================================

/**
 * GET - Retrieve memories
 */
export async function GET(req: NextRequest) {
  try {
    const userId = await requireAuth();

    // Check rate limit (higher limit for reads)
    const { response: rateLimitResponse, result: rateLimitResult } =
      await checkRateLimitForUser(req, userId, "pro"); // 100 req/min for memory reads
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // Parse query parameters
    const { searchParams } = new URL(req.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    const parsed = getMemoryQuerySchema.safeParse(queryParams);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid query parameters",
          details: parsed.error.issues.map((i) => ({
            field: i.path.join("."),
            message: i.message,
          })),
        },
        { status: 400 }
      );
    }

    const { type, category, key, sessionId, eventType, query, search, limit } = parsed.data;

    // Handle different retrieval types
    switch (type) {
      case "episodes": {
        let episodes = await retrieveRecentEpisodes(userId, {
          limit,
          sessionId,
          eventType: eventType as EpisodeEventType | undefined,
        });
        if (search) {
          episodes = textFilter(episodes, search);
        }
        return NextResponse.json({
          success: true,
          type: "episodes",
          data: episodes,
          count: episodes.length,
        });
      }

      case "facts": {
        // If specific key requested
        if (category && key) {
          const fact = await getFact(userId, category as SemanticCategory, key);
          return NextResponse.json({
            success: true,
            type: "fact",
            data: fact,
          });
        }
        // If category specified, get all in that category
        if (category) {
          let facts = await getFactsByCategory(userId, category as SemanticCategory);
          if (search) {
            facts = textFilter(facts, search);
          }
          return NextResponse.json({
            success: true,
            type: "facts",
            category,
            data: facts,
            count: facts.length,
          });
        }
        // Otherwise get all user facts
        let allFacts = await getAllUserFacts(userId);
        if (search) {
          allFacts = textFilter(allFacts, search);
        }
        return NextResponse.json({
          success: true,
          type: "facts",
          data: allFacts,
          count: allFacts.length,
        });
      }

      case "decisions": {
        let decisions = await getRecentDecisions(userId, { limit });
        if (search) {
          decisions = textFilter(decisions, search);
        }
        return NextResponse.json({
          success: true,
          type: "decisions",
          data: decisions,
          count: decisions.length,
        });
      }

      case "all": {
        // Return facts, episodes, and decisions together
        const [allFacts, allEpisodes, allDecisions] = await Promise.all([
          getAllUserFacts(userId),
          retrieveRecentEpisodes(userId, { limit: 50 }),
          getRecentDecisions(userId, { limit: 20 }),
        ]);

        const applySearch = search
          ? <T,>(items: T[]) => textFilter(items, search)
          : <T,>(items: T[]) => items;

        return NextResponse.json({
          success: true,
          type: "all",
          facts: {
            data: applySearch(allFacts),
            count: applySearch(allFacts).length,
          },
          episodes: {
            data: applySearch(allEpisodes),
            count: applySearch(allEpisodes).length,
          },
          decisions: {
            data: applySearch(allDecisions),
            count: applySearch(allDecisions).length,
          },
        });
      }

      case "search": {
        if (!query) {
          return NextResponse.json(
            {
              success: false,
              error: "Query parameter required for search",
            },
            { status: 400 }
          );
        }

        // Generate embedding for the query
        const embeddingResult = await generateEmbedding(query);
        const embedding = embeddingResult.embedding;

        // Search both episodes and facts
        const [episodeResults, factResults] = await Promise.all([
          searchEpisodesByEmbedding(userId, embedding, { limit }),
          import("@/lib/db/fred-memory").then((m) =>
            m.searchFactsByEmbedding(userId, embedding, {
              limit,
              category: category as SemanticCategory | undefined,
            })
          ),
        ]);

        return NextResponse.json({
          success: true,
          type: "search",
          query,
          episodes: {
            data: episodeResults,
            count: episodeResults.length,
          },
          facts: {
            data: factResults,
            count: factResults.length,
          },
        });
      }
    }
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }

    console.error("[FRED Memory API] GET Error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}

/**
 * POST - Store a new memory
 */
export async function POST(req: NextRequest) {
  try {
    const userId = await requireAuth();

    // Check rate limit
    const { response: rateLimitResponse } = await checkRateLimitForUser(req, userId, "free");
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const body = await req.json();
    const parsed = storeMemorySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request body",
          details: parsed.error.issues.map((i) => ({
            field: i.path.join("."),
            message: i.message,
          })),
        },
        { status: 400 }
      );
    }

    const data = parsed.data;

    if (data.type === "fact") {
      // Generate embedding if requested
      let embedding: number[] | undefined;
      if (data.generateEmbedding) {
        const textToEmbed = `${data.key}: ${JSON.stringify(data.value)}`;
        const embeddingResult = await generateEmbedding(textToEmbed);
        embedding = embeddingResult.embedding;
      }

      const fact = await storeFact(
        userId,
        data.category as SemanticCategory,
        data.key,
        data.value,
        {
          embedding,
          confidence: data.confidence,
          source: data.source,
        }
      );

      return NextResponse.json({
        success: true,
        type: "fact",
        data: fact,
      });
    }

    if (data.type === "episode") {
      // Generate embedding if requested
      let embedding: number[] | undefined;
      if (data.generateEmbedding) {
        const textToEmbed = JSON.stringify(data.content);
        const embeddingResult = await generateEmbedding(textToEmbed);
        embedding = embeddingResult.embedding;
      }

      const episode = await storeEpisode(
        userId,
        data.sessionId,
        data.eventType as EpisodeEventType,
        data.content,
        {
          embedding,
          importanceScore: data.importanceScore,
          metadata: data.metadata,
        }
      );

      return NextResponse.json({
        success: true,
        type: "episode",
        data: episode,
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: "Invalid memory type",
      },
      { status: 400 }
    );
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }

    console.error("[FRED Memory API] POST Error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Remove a fact from semantic memory
 */
export async function DELETE(req: NextRequest) {
  try {
    const userId = await requireAuth();

    // Check rate limit
    const { response: rateLimitResponse } = await checkRateLimitForUser(req, userId, "free");
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const body = await req.json();
    const parsed = deleteMemorySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request body",
          details: parsed.error.issues.map((i) => ({
            field: i.path.join("."),
            message: i.message,
          })),
        },
        { status: 400 }
      );
    }

    const { category, key } = parsed.data;

    await deleteFact(userId, category as SemanticCategory, key);

    return NextResponse.json({
      success: true,
      message: `Fact "${key}" deleted from category "${category}"`,
    });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }

    console.error("[FRED Memory API] DELETE Error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}
