/**
 * Phase 165: Microsite CRUD — GET (list) & POST (create)
 */

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { DEFAULT_BRANDING, DEFAULT_CONTENT } from "@/lib/microsite/types"

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data, error } = await supabase
    .from("partner_microsites")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, microsites: data })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json()
  const { title, template = "modern", branding, content } = body

  if (!title || typeof title !== "string" || title.trim().length === 0) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 })
  }

  // Generate slug from title
  const baseSlug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60)

  // Check for slug uniqueness for this user
  const { data: existing } = await supabase
    .from("partner_microsites")
    .select("slug")
    .eq("user_id", user.id)
    .like("slug", `${baseSlug}%`)

  const slug = existing && existing.length > 0
    ? `${baseSlug}-${existing.length}`
    : baseSlug

  const { data, error } = await supabase
    .from("partner_microsites")
    .insert({
      user_id: user.id,
      title: title.trim(),
      slug,
      template,
      branding: { ...DEFAULT_BRANDING, ...branding },
      content: { ...DEFAULT_CONTENT, ...content },
      status: "draft",
      version: 1,
      version_history: [],
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, microsite: data }, { status: 201 })
}
