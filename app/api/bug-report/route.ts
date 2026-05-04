import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { findExistingLinearIssue } from "@/lib/feedback/linear-auto-triage"

/**
 * POST /api/bug-report
 *
 * AI-8499: Accept user-submitted bug reports from the in-app widget.
 * Stores in Supabase `bug_reports` table and creates a Linear issue.
 *
 * Body: {
 *   title: string,
 *   description: string,
 *   category: string,
 *   pageUrl: string,
 *   userAgent?: string,
 * }
 */

const LINEAR_TEAM = "Ai Acrobatics"
const VALID_CATEGORIES = ["ui", "functionality", "performance", "data", "other"]

export async function POST(req: NextRequest) {
  // 1. Auth
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // 2. Parse body
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const { title, description, category, pageUrl, userAgent } = body as {
    title?: string
    description?: string
    category?: string
    pageUrl?: string
    userAgent?: string
  }

  // 3. Validate
  if (!title || typeof title !== "string" || title.trim().length === 0) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 })
  }
  if (
    !description ||
    typeof description !== "string" ||
    description.trim().length === 0
  ) {
    return NextResponse.json(
      { error: "Description is required" },
      { status: 400 }
    )
  }
  if (title.length > 200) {
    return NextResponse.json(
      { error: "Title must be 200 characters or less" },
      { status: 400 }
    )
  }
  if (description.length > 2000) {
    return NextResponse.json(
      { error: "Description must be 2000 characters or less" },
      { status: 400 }
    )
  }

  const safeCategory = VALID_CATEGORIES.includes(category ?? "")
    ? category!
    : "other"

  // 4. Get user profile for context
  const serviceClient = createServiceClient()
  const { data: profile } = await serviceClient
    .from("profiles")
    .select("name, email, stage")
    .eq("id", user.id)
    .single()

  // 5. Store in Supabase
  const { data: bugReport, error: insertError } = await serviceClient
    .from("bug_reports")
    .insert({
      user_id: user.id,
      user_email: user.email || profile?.email || "",
      user_name: profile?.name || "",
      title: title.trim(),
      description: description.trim(),
      category: safeCategory,
      page_url: (pageUrl as string) || "",
      user_agent: ((userAgent as string) || "").slice(0, 500),
      status: "open",
    })
    .select("id")
    .single()

  if (insertError) {
    console.error("[bug-report] Insert error:", insertError)
    return NextResponse.json(
      { error: "Failed to save bug report" },
      { status: 500 }
    )
  }

  // 6. Create Linear issue (best-effort, don't block on failure)
  let linearIdentifier: string | null = null
  let linearUrl: string | null = null

  try {
    const linearResult = await createLinearBugIssue({
      title: title.trim(),
      description: description.trim(),
      category: safeCategory,
      pageUrl: (pageUrl as string) || "",
      userName: profile?.name || user.email || "Unknown",
      userEmail: user.email || "",
      bugReportId: bugReport.id,
    })

    if (linearResult.success) {
      linearIdentifier = linearResult.identifier ?? null
      linearUrl = linearResult.url ?? null

      // Update bug report with Linear issue link
      await serviceClient
        .from("bug_reports")
        .update({
          linear_issue_id: linearIdentifier,
          linear_issue_url: linearUrl,
        })
        .eq("id", bugReport.id)
    }
  } catch (err) {
    console.error("[bug-report] Linear issue creation failed:", err)
  }

  return NextResponse.json(
    {
      success: true,
      id: bugReport.id,
      linearIssue: linearIdentifier,
    },
    { status: 201 }
  )
}

// ── Linear Issue Creation ──────────────────────────────────────────

interface LinearBugInput {
  title: string
  description: string
  category: string
  pageUrl: string
  userName: string
  userEmail: string
  bugReportId: string
}

interface LinearResult {
  success: boolean
  identifier?: string
  url?: string
  error?: string
}

async function createLinearBugIssue(input: LinearBugInput): Promise<LinearResult> {
  const apiKey = process.env.LINEAR_API_KEY
  if (!apiKey) {
    return { success: false, error: "LINEAR_API_KEY not configured" }
  }

  // AI-4108: dedup by exact title match before creating — if a user double-
  // submits the same bug (network retry, duplicate click), reuse the existing
  // issue rather than spawning a duplicate.
  const issueTitle = `[Bug] ${input.title}`
  const existing = await findExistingLinearIssue(apiKey, issueTitle)
  if (existing) {
    return {
      success: true,
      identifier: existing.identifier,
      url: existing.url,
    }
  }

  // Get team ID
  const teamQuery = await fetch("https://api.linear.app/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: apiKey,
    },
    body: JSON.stringify({
      query: `query { teams(filter: { name: { eq: "${LINEAR_TEAM}" } }) { nodes { id } } }`,
    }),
  })

  const teamData = await teamQuery.json()
  const teamId = teamData.data?.teams?.nodes?.[0]?.id
  if (!teamId) {
    return { success: false, error: `Team "${LINEAR_TEAM}" not found` }
  }

  const categoryLabel: Record<string, string> = {
    ui: "UI / Visual",
    functionality: "Broken Feature",
    performance: "Performance",
    data: "Wrong Data",
    other: "Other",
  }

  const issueDescription = `## User Bug Report

**Reporter:** ${input.userName} (${input.userEmail})
**Category:** ${categoryLabel[input.category] || input.category}
**Page:** ${input.pageUrl || "N/A"}
**Report ID:** \`${input.bugReportId}\`

### Description
${input.description}

---
*Submitted via in-app bug report widget*`

  // Create issue with priority 3 (Normal) and label
  const createRes = await fetch("https://api.linear.app/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: apiKey,
    },
    body: JSON.stringify({
      query: `mutation CreateIssue($input: IssueCreateInput!) {
        issueCreate(input: $input) {
          success
          issue { id identifier url }
        }
      }`,
      variables: {
        input: {
          teamId,
          title: issueTitle,
          description: issueDescription,
          priority: 3,
        },
      },
    }),
  })

  const createData = await createRes.json()
  const issue = createData.data?.issueCreate?.issue

  if (!issue?.identifier) {
    const errorDetail = JSON.stringify(createData.errors || createData)
    return { success: false, error: `Linear issue creation failed: ${errorDetail}` }
  }

  return {
    success: true,
    identifier: issue.identifier,
    url: issue.url,
  }
}
