import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db/neon";
import { generateTrackedResponse } from "@/lib/ai/client";
import { requireAuth } from "@/lib/auth";

type DocumentType = "gtm" | "competitive" | "financial" | "memo";

const DOCUMENT_PROMPTS: Record<DocumentType, string> = {
  gtm: `Generate a comprehensive Go-To-Market Strategy document. Include:
- Executive Summary
- Target Market Analysis
- Value Proposition
- Pricing Strategy
- Distribution Channels
- Launch Timeline
- Success Metrics

Format as professional markdown.`,

  competitive: `Generate a Competitive Analysis document. Include:
- Market Overview
- Key Competitors (at least 3)
- SWOT Analysis
- Competitive Positioning Matrix
- Differentiation Strategy
- Competitive Advantages

Format as professional markdown.`,

  financial: `Generate a Financial Model Summary document. Include:
- Revenue Model
- Cost Structure
- Unit Economics (CAC, LTV, Payback)
- 12-36 Month Projections
- Key Assumptions
- Sensitivity Analysis

Format as professional markdown.`,

  memo: `Generate an Investor Memo document. Include:
- The Opportunity
- Our Solution
- Market Size (TAM/SAM/SOM)
- Traction & Key Metrics
- Team Overview
- Use of Funds
- The Ask

Format as professional markdown.`
};

const DOCUMENT_TITLES: Record<DocumentType, string> = {
  gtm: "Go-To-Market Strategy",
  competitive: "Competitive Analysis",
  financial: "Financial Model Summary",
  memo: "Investor Memo"
};

/**
 * GET /api/documents
 * List user's documents
 *
 * SECURITY: Requires authentication - userId from server-side session
 */
export async function GET(request: NextRequest) {
  try {
    // SECURITY: Get userId from server-side session (not from client headers!)
    const userId = await requireAuth();

    const documents = await sql`
      SELECT
        id,
        title,
        type,
        status,
        created_at as "createdAt",
        updated_at as "updatedAt",
        LEFT(content, 200) as "contentPreview"
      FROM documents
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
      LIMIT 50
    `;

    return NextResponse.json({
      success: true,
      documents,
      total: documents.length
    });
  } catch (error) {
    console.error("[Documents GET]", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch documents" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/documents
 * Generate a new strategy document using AI
 *
 * SECURITY: Requires authentication - userId from server-side session
 */
export async function POST(request: NextRequest) {
  try {
    // SECURITY: Get userId from server-side session (not from client headers!)
    const userId = await requireAuth();

    const body = await request.json();
    const { type, context } = body;

    // Validate document type
    const validTypes: DocumentType[] = ["gtm", "competitive", "financial", "memo"];
    if (!type || !validTypes.includes(type)) {
      return NextResponse.json(
        { success: false, error: `Invalid document type. Must be one of: ${validTypes.join(", ")}` },
        { status: 400 }
      );
    }

    const title = DOCUMENT_TITLES[type as DocumentType];
    const prompt = DOCUMENT_PROMPTS[type as DocumentType];

    // Build context string if provided
    const contextStr = context
      ? `\n\nCompany Context:\n${JSON.stringify(context, null, 2)}`
      : "";

    console.log(`[Documents] Generating ${type} document for user ${userId}`);

    // Generate document content using AI with tracking
    const result = await generateTrackedResponse(
      [{ role: "user", content: prompt + contextStr }],
      "You are an expert startup strategist. Generate professional, comprehensive business documents. Be specific and actionable.",
      {
        userId,
        analyzer: "document_generator",
        inputData: {
          documentType: type,
          hasContext: !!context,
        },
      }
    );

    const content = result.content;
    console.log(`[Documents] Generated document (tracked: ${result.requestId}, latency: ${result.latencyMs}ms)`);

    // Save to database
    const dbResult = await sql`
      INSERT INTO documents (user_id, title, type, content, status, created_at)
      VALUES (${userId}, ${title}, ${type}, ${content}, 'completed', NOW())
      RETURNING
        id,
        title,
        type,
        content,
        status,
        created_at as "createdAt"
    `;

    console.log(`[Documents] Created document ${dbResult[0].id}`);

    return NextResponse.json({
      success: true,
      document: dbResult[0]
    }, { status: 201 });

  } catch (error) {
    console.error("[Documents POST]", error);
    return NextResponse.json(
      { success: false, error: "Failed to create document" },
      { status: 500 }
    );
  }
}
