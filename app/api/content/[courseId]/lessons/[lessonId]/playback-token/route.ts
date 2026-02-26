import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getLesson } from "@/lib/db/content";
import { signPlaybackToken } from "@/lib/mux/tokens";
import { checkTierForRequest } from "@/lib/api/tier-middleware";
import { UserTier } from "@/lib/constants";

// Helper: map normalized tier string to UserTier enum
function tierStringToEnum(tier: string): UserTier {
  if (tier === "studio") return UserTier.STUDIO;
  if (tier === "pro") return UserTier.PRO;
  return UserTier.FREE;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ courseId: string; lessonId: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { lessonId } = await params;

  // Fetch lesson
  const lesson = await getLesson(lessonId);
  if (!lesson) {
    return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
  }

  // Check video is ready
  if (lesson.mux_status !== "ready" || !lesson.mux_playback_id) {
    return NextResponse.json({ error: "Video not ready" }, { status: 422 });
  }

  // Preview lessons skip tier check — free access for all authenticated users
  if (!lesson.is_preview) {
    // Get the course's tier requirement via module → course lookup
    const serviceSupabase = (
      await import("@/lib/supabase/server")
    ).createServiceClient();
    const { data: moduleRow } = await serviceSupabase
      .from("modules")
      .select("course_id")
      .eq("id", lesson.module_id)
      .single();

    if (moduleRow) {
      const { data: courseRow } = await serviceSupabase
        .from("courses")
        .select("tier_required")
        .eq("id", moduleRow.course_id)
        .single();

      if (courseRow) {
        const requiredTier = tierStringToEnum(courseRow.tier_required);
        if (requiredTier > UserTier.FREE) {
          const tierCheck = await checkTierForRequest(req, requiredTier);
          if (!tierCheck.allowed) {
            return NextResponse.json(
              { error: "Upgrade required", upgradeUrl: "/pricing" },
              { status: 403 }
            );
          }
        }
      }
    }
  }

  // Generate 1-hour signed playback token
  try {
    const token = await signPlaybackToken(lesson.mux_playback_id);
    return NextResponse.json({ token, playbackId: lesson.mux_playback_id });
  } catch (error) {
    console.error("[content] signPlaybackToken error:", error);
    return NextResponse.json(
      { error: "Failed to generate playback token" },
      { status: 500 }
    );
  }
}
