/**
 * Dashboard Documents API
 * Phase 44: Document Repository
 *
 * GET /api/dashboard/documents - Aggregated document listing across all sources
 */

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export interface DocumentItem {
  id: string;
  name: string;
  type: string;
  category: "decks" | "strategy" | "reports" | "uploads";
  fileUrl: string | null;
  pageCount: number | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  canReviewWithFred: boolean;
}

interface DocumentsResponse {
  decks: DocumentItem[];
  strategyDocs: DocumentItem[];
  reports: DocumentItem[];
  uploadedFiles: DocumentItem[];
  totalCount: number;
}

export async function GET() {
  try {
    const userId = await requireAuth();
    const supabase = await createClient();

    // Fetch uploaded documents and strategy documents in parallel
    const [uploadedResult, strategyResult] = await Promise.all([
      supabase
        .from("uploaded_documents")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
      supabase
        .from("strategy_documents")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
    ]);

    if (uploadedResult.error) {
      throw new Error(
        `Failed to fetch uploaded documents: ${uploadedResult.error.message}`
      );
    }
    if (strategyResult.error) {
      throw new Error(
        `Failed to fetch strategy documents: ${strategyResult.error.message}`
      );
    }

    const uploadedDocs = uploadedResult.data || [];
    const strategyDocs = strategyResult.data || [];

    // Categorize uploaded documents
    const decks: DocumentItem[] = uploadedDocs
      .filter((doc) => doc.type === "pitch_deck")
      .map((doc) => mapUploadedDocument(doc, "decks"));

    const uploadedFiles: DocumentItem[] = uploadedDocs
      .filter((doc) => doc.type !== "pitch_deck")
      .map((doc) => mapUploadedDocument(doc, "uploads"));

    // Map strategy documents
    const strategyItems: DocumentItem[] = strategyDocs.map((doc) =>
      mapStrategyDocument(doc, "strategy")
    );

    // Reports: strategy docs with report-like types
    const reportTypes = ["market_analysis", "competitive_analysis"];
    const reports: DocumentItem[] = strategyDocs
      .filter((doc) => reportTypes.includes(doc.type))
      .map((doc) => mapStrategyDocument(doc, "reports"));

    const data: DocumentsResponse = {
      decks,
      strategyDocs: strategyItems,
      reports,
      uploadedFiles,
      totalCount: decks.length + strategyItems.length + uploadedFiles.length,
    };

    return NextResponse.json({ success: true, data });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }

    console.error("[Dashboard Documents] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch documents" },
      { status: 500 }
    );
  }
}

// Map an uploaded_documents row to DocumentItem
function mapUploadedDocument(
  row: Record<string, unknown>,
  category: "decks" | "uploads"
): DocumentItem {
  return {
    id: row.id as string,
    name: row.name as string,
    type: row.type as string,
    category,
    fileUrl: (row.file_url as string) || null,
    pageCount: (row.page_count as number) ?? null,
    status: row.status as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    canReviewWithFred: row.type === "pitch_deck",
  };
}

// Map a strategy_documents row to DocumentItem
function mapStrategyDocument(
  row: Record<string, unknown>,
  category: "strategy" | "reports"
): DocumentItem {
  return {
    id: row.id as string,
    name: (row.title as string) || (row.type as string),
    type: row.type as string,
    category,
    fileUrl: null,
    pageCount: null,
    status: "ready",
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    canReviewWithFred: true,
  };
}
