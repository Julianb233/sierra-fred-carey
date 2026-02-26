import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { upsertProgress } from "@/lib/db/content";
import { z } from "zod";

const ProgressSchema = z.object({
  lessonId: z.string().uuid(),
  watchedPct: z.number().int().min(0).max(100),
  completed: z.boolean().default(false),
});

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = ProgressSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    await upsertProgress({
      userId: user.id,
      lessonId: parsed.data.lessonId,
      watchedPct: parsed.data.watchedPct,
      completed: parsed.data.completed,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[content] upsertProgress error:", error);
    return NextResponse.json(
      { error: "Failed to save progress" },
      { status: 500 }
    );
  }
}
