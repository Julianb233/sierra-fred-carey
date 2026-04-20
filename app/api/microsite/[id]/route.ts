/**
 * Phase 165: Microsite CRUD — GET, PUT, DELETE by ID
 */

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import type { MicrositeContent, MicrositeBranding, VersionEntry } from "@/lib/microsite/types"

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(_req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data, error } = await supabase
    .from("partner_microsites")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: "Microsite not found" }, { status: 404 })
  }

  return NextResponse.json({ success: true, microsite: data })
}

export async function PUT(req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Fetch current version for history
  const { data: current, error: fetchError } = await supabase
    .from("partner_microsites")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single()

  if (fetchError || !current) {
    return NextResponse.json({ error: "Microsite not found" }, { status: 404 })
  }

  const body = await req.json()
  const { title, template, branding, content, status, seo_title, seo_description } = body

  // Build version history entry from current state
  const historyEntry: VersionEntry = {
    version: current.version,
    content: current.content as MicrositeContent,
    branding: current.branding as MicrositeBranding,
    updated_at: current.updated_at,
  }

  // Keep last 20 versions
  const versionHistory = [
    historyEntry,
    ...(current.version_history as VersionEntry[]),
  ].slice(0, 20)

  const updates: Record<string, unknown> = {
    version: current.version + 1,
    version_history: versionHistory,
    updated_at: new Date().toISOString(),
  }

  if (title !== undefined) updates.title = title
  if (template !== undefined) updates.template = template
  if (branding !== undefined) updates.branding = branding
  if (content !== undefined) updates.content = content
  if (seo_title !== undefined) updates.seo_title = seo_title
  if (seo_description !== undefined) updates.seo_description = seo_description

  if (status !== undefined) {
    updates.status = status
    if (status === "published" && !current.published_at) {
      updates.published_at = new Date().toISOString()
    }
  }

  const { data, error } = await supabase
    .from("partner_microsites")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, microsite: data })
}

export async function DELETE(_req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { error } = await supabase
    .from("partner_microsites")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
