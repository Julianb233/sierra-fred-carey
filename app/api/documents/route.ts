import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db/supabase-sql";
import { generateChatResponse } from "@/lib/ai/client";
import { checkTierForRequest } from "@/lib/api/tier-middleware";
import { UserTier } from "@/lib/constants";

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
    // Pro tier required for Strategy Documents
    const tierCheck = await checkTierForRequest(request, UserTier.PRO);
    if (!tierCheck.user) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }
    if (!tierCheck.allowed) {
      return NextResponse.json(
        { success: false, error: "Strategy Documents require Pro tier" },
        { status: 403 }
      );
    }

    // SECURITY: Get userId from tier check (already authenticated via checkTierForRequest)
    const userId = tierCheck.user.id;

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
    if (error instanceof Response) {
      return error;
    }
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
    // Pro tier required for Strategy Documents
    const tierCheck = await checkTierForRequest(request, UserTier.PRO);
    if (!tierCheck.user) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }
    if (!tierCheck.allowed) {
      return NextResponse.json(
        { success: false, error: "Strategy Documents require Pro tier" },
        { status: 403 }
      );
    }

    // SECURITY: Get userId from tier check (already authenticated via checkTierForRequest)
    const userId = tierCheck.user.id;

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

    // Generate document content using AI
    const content = await generateChatResponse(
      [{ role: "user", content: prompt + contextStr }],
      "You are an expert startup strategist. Generate professional, comprehensive business documents. Be specific and actionable."
    );

    // Save to database
    const result = await sql`
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

    console.log(`[Documents] Created document ${result[0].id}`);

    return NextResponse.json({
      success: true,
      document: result[0]
    }, { status: 201 });

  } catch (error) {
    console.error("[Documents POST]", error);
    return NextResponse.json(
      { success: false, error: "Failed to create document" },
      { status: 500 }
    );
  }
}
