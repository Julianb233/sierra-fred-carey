/**
 * Sync Linear Status Cron Endpoint
 * Migrated from trigger/sync-linear-status.ts
 *
 * Runs every 4 hours to:
 * 1. Query feedback_insights where status = "actioned" and linear_issue_id is set
 * 2. Check each Linear issue's current state via GraphQL
 * 3. If completed, update insight status to "resolved"
 * 4. Send WhatsApp resolution notification
 *
 * GET /api/cron/sync-linear-status
 *
 * Authorization: Bearer {CRON_SECRET}
 *
 * Vercel Cron: path=/api/cron/sync-linear-status schedule="0 *​/4 * * *"
 */

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { sendResolutionNotification } from "@/lib/feedback/whatsapp-reply"
import { timingSafeEqual } from "crypto"

export const dynamic = "force-dynamic"
export const maxDuration = 120 // 2 minutes

const LOG_PREFIX = "[Cron: Sync Linear Status]"
const WHATSAPP_GROUP_NAME = "Sahara Founders"

function isAuthorized(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) {
    console.error(`${LOG_PREFIX} CRON_SECRET not configured`)
    return false
  }
  if (!authHeader) return false

  const token = authHeader.replace("Bearer ", "")

  try {
    const a = Buffer.from(token)
    const b = Buffer.from(cronSecret)
    if (a.length !== b.length) return false
    return timingSafeEqual(a, b)
  } catch {
    return false
  }
}

export async function GET(request: NextRequest) {
  console.log(`${LOG_PREFIX} Starting scheduled sync`)

  try {
    // 1. Verify authorization
    if (!isAuthorized(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // 2. Check LINEAR_API_KEY
    const apiKey = process.env.LINEAR_API_KEY
    if (!apiKey) {
      console.error(`${LOG_PREFIX} LINEAR_API_KEY not configured`)
      return NextResponse.json(
        { success: false, synced: 0, resolved: 0, errors: ["LINEAR_API_KEY not configured"] },
        { status: 500 }
      )
    }

    // 3. Create Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 4. Fetch actioned insights with Linear issue IDs
    const { data: insights, error } = await supabase
      .from("feedback_insights")
      .select("id, title, linear_issue_id")
      .eq("status", "actioned")
      .not("linear_issue_id", "is", null)

    if (error) {
      console.error(`${LOG_PREFIX} Failed to fetch insights: ${error.message}`)
      return NextResponse.json(
        { success: false, synced: 0, resolved: 0, errors: [error.message] },
        { status: 500 }
      )
    }

    if (!insights || insights.length === 0) {
      console.log(`${LOG_PREFIX} No actioned insights to sync`)
      return NextResponse.json({ success: true, synced: 0, resolved: 0, errors: [] })
    }

    console.log(`${LOG_PREFIX} Checking ${insights.length} actioned insights`)

    let resolved = 0
    const errors: string[] = []

    for (const insight of insights) {
      try {
        // Fetch Linear issue status by ID
        const response = await fetch("https://api.linear.app/graphql", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: apiKey,
          },
          body: JSON.stringify({
            query: `query {
              issue(id: "${insight.linear_issue_id}") {
                id
                identifier
                title
                state { type }
              }
            }`,
          }),
        })

        const data = await response.json()
        const issue = data.data?.issue

        if (!issue) {
          // Try searching by identifier instead (linear_issue_id might be "AA-123" format)
          const searchRes = await fetch("https://api.linear.app/graphql", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: apiKey,
            },
            body: JSON.stringify({
              query: `query {
                issueSearch(query: "${insight.linear_issue_id}", first: 1) {
                  nodes {
                    id
                    identifier
                    title
                    state { type }
                  }
                }
              }`,
            }),
          })

          const searchData = await searchRes.json()
          const found = searchData.data?.issueSearch?.nodes?.[0]

          if (!found) {
            console.warn(`${LOG_PREFIX} Linear issue not found: ${insight.linear_issue_id}`)
            continue
          }

          if (found.state?.type === "completed") {
            await supabase
              .from("feedback_insights")
              .update({
                status: "resolved",
                resolved_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq("id", insight.id)

            await sendResolutionNotification(
              WHATSAPP_GROUP_NAME,
              insight.title || found.title,
              found.identifier
            )

            resolved++
            console.log(`${LOG_PREFIX} Resolved: ${found.identifier} - ${insight.title}`)
          }

          continue
        }

        if (issue.state?.type === "completed") {
          await supabase
            .from("feedback_insights")
            .update({
              status: "resolved",
              resolved_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", insight.id)

          await sendResolutionNotification(
            WHATSAPP_GROUP_NAME,
            insight.title || issue.title,
            issue.identifier
          )

          resolved++
          console.log(`${LOG_PREFIX} Resolved: ${issue.identifier} - ${insight.title}`)
        }
      } catch (err) {
        const msg = `Failed to sync ${insight.linear_issue_id}: ${err}`
        errors.push(msg)
        console.error(`${LOG_PREFIX} ${msg}`)
      }
    }

    console.log(`${LOG_PREFIX} Complete: synced=${insights.length}, resolved=${resolved}, errors=${errors.length}`)

    return NextResponse.json({
      success: true,
      synced: insights.length,
      resolved,
      errors,
    })
  } catch (error) {
    console.error(`${LOG_PREFIX} Unhandled error:`, error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}
