/**
 * GET /api/progress-report/[id]/pdf  (AI-7369)
 *
 * Streams the authenticated user's founder progress report as a downloadable
 * PDF. Built from the structured data already persisted on
 * founder_progress_reports (snapshot + report_data) via @react-pdf/renderer —
 * no headless browser, so it runs in a standard Node serverless route.
 *
 * Auth: required. A user may only download their own report.
 */

import { NextResponse } from "next/server";
import { getOptionalUserId } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import {
  renderProgressReportPdf,
  progressReportFilename,
} from "@/lib/progress-report/pdf";
import type {
  FounderProgressSnapshot,
  ProgressReportPayload,
} from "@/lib/progress-report/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const userId = await getOptionalUserId();
  if (!userId) {
    return NextResponse.json(
      { success: false, error: "Authentication required" },
      { status: 401 }
    );
  }

  const supabase = createServiceClient();
  const { data: report, error } = await supabase
    .from("founder_progress_reports")
    .select("user_id, snapshot, report_data, generation_status, created_at")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
  if (!report || (report as { user_id: string }).user_id !== userId) {
    return NextResponse.json(
      { success: false, error: "Report not found" },
      { status: 404 }
    );
  }
  if ((report as { generation_status: string }).generation_status !== "completed") {
    return NextResponse.json(
      { success: false, error: "Report is still generating" },
      { status: 409 }
    );
  }

  const snapshot = (report as { snapshot: unknown }).snapshot as FounderProgressSnapshot;
  const payload = (report as { report_data: unknown }).report_data as ProgressReportPayload;

  if (!snapshot || !payload || !Array.isArray(payload.sections)) {
    return NextResponse.json(
      { success: false, error: "Report data is incomplete" },
      { status: 422 }
    );
  }

  const generatedAt = (report as { created_at?: string }).created_at
    ? new Date((report as { created_at: string }).created_at)
    : new Date();

  let pdf: Buffer;
  try {
    pdf = await renderProgressReportPdf(snapshot, payload, { generatedAt });
  } catch (err) {
    console.error("[ProgressReport PDF] render failed:", err);
    return NextResponse.json(
      { success: false, error: "Failed to render PDF" },
      { status: 500 }
    );
  }

  const filename = progressReportFilename(snapshot, generatedAt);

  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(pdf.length),
      "Cache-Control": "private, no-store",
    },
  });
}
