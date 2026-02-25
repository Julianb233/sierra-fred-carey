/**
 * Investor CSV Upload API
 * Phase 20: Investor Targeting
 *
 * POST /api/investors/upload - Upload a CSV file of investors
 *
 * Accepts multipart/form-data with a CSV file.
 * Parses, validates, and persists investor data to the database.
 * Requires Studio tier.
 */

import { NextRequest, NextResponse } from "next/server";
import { checkTierForRequest, getUserTier } from "@/lib/api/tier-middleware";
import { UserTier } from "@/lib/constants";
import { checkRateLimit, createRateLimitResponse } from "@/lib/api/rate-limit";
import { createServiceClient } from "@/lib/supabase/server";

// Upload rate limits per tier (per day)
const UPLOAD_RATE_LIMITS: Record<number, { limit: number; windowSeconds: number }> = {
  [UserTier.FREE]: { limit: 20, windowSeconds: 86400 },
  [UserTier.PRO]: { limit: 100, windowSeconds: 86400 },
  [UserTier.STUDIO]: { limit: 500, windowSeconds: 86400 },
};
import { parseInvestorCSV } from "@/lib/investors/csv-parser";

/** Max file size: 1MB */
const MAX_FILE_SIZE = 1 * 1024 * 1024;

/**
 * GET /api/investors/upload
 * Returns the authenticated user's investor lists.
 */
export async function GET(request: NextRequest) {
  try {
    const tierCheck = await checkTierForRequest(request, UserTier.STUDIO);
    if (!tierCheck.user) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }
    if (!tierCheck.allowed) {
      return NextResponse.json(
        { success: false, error: "Studio tier required" },
        { status: 403 }
      );
    }

    const supabase = createServiceClient();
    const { data: lists, error: listsError } = await supabase
      .from("investor_lists")
      .select("id, name, source, investor_count, created_at, updated_at")
      .eq("user_id", tierCheck.user.id)
      .order("created_at", { ascending: false });

    if (listsError) {
      console.error("[InvestorUpload] Failed to fetch lists:", listsError);
      return NextResponse.json(
        { success: false, error: "Failed to fetch investor lists" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, lists: lists || [] });
  } catch (error) {
    console.error("[InvestorUpload] GET error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch investor lists" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate and check tier
    const tierCheck = await checkTierForRequest(request, UserTier.STUDIO);
    if (!tierCheck.user) {
      return NextResponse.json(
        { success: false, error: "Authentication required", code: "AUTH_REQUIRED" },
        { status: 401 }
      );
    }
    if (!tierCheck.allowed) {
      return NextResponse.json(
        { success: false, error: "Studio tier required for Investor Targeting" },
        { status: 403 }
      );
    }

    const userId = tierCheck.user.id;

    // Rate limit uploads by user tier
    const userTier = await getUserTier(userId);
    const tierConfig = UPLOAD_RATE_LIMITS[userTier] ?? UPLOAD_RATE_LIMITS[UserTier.FREE];
    const rateLimitResult = await checkRateLimit(`upload:${userId}`, tierConfig);
    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult);
    }

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const listName = (formData.get("name") as string) || "Uploaded List";

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No CSV file provided. Include a 'file' field." },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.name.endsWith(".csv") && file.type !== "text/csv") {
      return NextResponse.json(
        { success: false, error: "File must be a CSV (.csv)" },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: "File exceeds maximum size of 1MB" },
        { status: 413 }
      );
    }

    // Read file content
    const csvText = await file.text();

    // Parse CSV
    const { rows, errors } = parseInvestorCSV(csvText);

    // If too many errors relative to data, reject
    const totalDataRows = rows.length + errors.length;
    if (totalDataRows > 0 && errors.length > totalDataRows * 0.5) {
      return NextResponse.json(
        {
          success: false,
          error: "Too many parsing errors (over 50% of rows failed)",
          errors,
          parsedCount: rows.length,
          errorCount: errors.length,
        },
        { status: 400 }
      );
    }

    if (rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "No valid investor rows found in CSV",
          errors,
        },
        { status: 400 }
      );
    }

    // Persist to database
    const supabase = createServiceClient();

    // Create investor list
    const { data: list, error: listError } = await supabase
      .from("investor_lists")
      .insert({
        user_id: userId,
        name: listName,
        source: "upload",
        investor_count: rows.length,
      })
      .select("id")
      .single();

    if (listError || !list) {
      console.error("[InvestorUpload] Failed to create list:", listError);
      return NextResponse.json(
        { success: false, error: "Failed to create investor list" },
        { status: 500 }
      );
    }

    // Bulk insert investors
    const investorRecords = rows.map((row) => ({
      list_id: list.id,
      name: row.name,
      firm: row.firm || null,
      email: row.email || null,
      website: row.website || null,
      stage_focus: row.stageFocus || null,
      sector_focus: row.sectorFocus || null,
      check_size_min: row.checkSizeMin || null,
      check_size_max: row.checkSizeMax || null,
      location: row.location || null,
      notes: row.notes || null,
      raw_data: row.rawData,
    }));

    const { error: insertError } = await supabase
      .from("investors")
      .insert(investorRecords);

    if (insertError) {
      console.error("[InvestorUpload] Failed to insert investors:", insertError);
      // Clean up the list
      await supabase.from("investor_lists").delete().eq("id", list.id);
      return NextResponse.json(
        { success: false, error: "Failed to save investor records" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        listId: list.id,
        investorCount: rows.length,
        errors: errors.length > 0 ? errors : undefined,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[InvestorUpload] Unexpected error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process CSV upload" },
      { status: 500 }
    );
  }
}
