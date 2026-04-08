/**
 * Phase 165: Restore a microsite to a previous version
 */

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import type { VersionEntry, MicrositeContent, MicrositeBranding } from "@/lib/microsite/types"

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function POST(req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { version } = await req.json()
  if (typeof version !== "number") {
    return NextResponse.json({ error: "Version number required" }, { status: 400 })
  }

  const { data: current, error: fetchError } = await supabase
    .from("partner_microsites")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single()

  if (fetchError || !current) {
    return NextResponse.json({ error: "Microsite not found" }, { status: 404 })
  }

  const history = current.version_history as VersionEntry[]
  const target = history.find((v) => v.version === version)
  if (!target) {
    return NextResponse.json({ error: "Version not found in history" }, { status: 404 })
  }

  // Save current state to history before restoring
  const currentEntry: VersionEntry = {
    version: current.version,
    content: current.content as MicrositeContent,
    branding: current.branding as MicrositeBranding,
    updated_at: current.updated_at,
  }

  const newHistory = [currentEntry, ...history].slice(0, 20)

  const { data, error } = await supabase
    .from("partner_microsites")
    .update({
      content: target.content,
      branding: target.branding,
      version: current.version + 1,
      version_history: newHistory,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, microsite: data })
}
