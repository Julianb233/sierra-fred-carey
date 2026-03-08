/**
 * Linear Auto-Triage for Feedback Insights
 *
 * Phase 74-02: Creates Linear issues from feedback insight clusters.
 * Uses the same GraphQL pattern as trigger/sahara-whatsapp-monitor.ts.
 *
 * Priority mapping: critical=1 (Urgent), high=2, medium=3, low=4
 */

import type { FeedbackInsight } from "@/lib/feedback/types"
import { createServiceClient } from "@/lib/supabase/server"

// ── Constants ───────────────────────────────────────────────────

const LINEAR_TEAM = "Ai Acrobatics"
const ADMIN_DASHBOARD_URL = process.env.NEXT_PUBLIC_APP_URL
  ? `${process.env.NEXT_PUBLIC_APP_URL}/admin/feedback`
  : "https://joinsahara.com/admin/feedback"

// ── Types ───────────────────────────────────────────────────────

export interface LinearIssueResult {
  success: boolean
  identifier?: string  // e.g. "AA-123"
  url?: string         // e.g. "https://linear.app/ai-acrobatics/issue/AA-123"
  error?: string
}

// ── Functions ───────────────────────────────────────────────────

/**
 * Map feedback severity to Linear priority.
 * Linear: 1=Urgent, 2=High, 3=Normal, 4=Low
 */
export function severityToPriority(severity: string): 1 | 2 | 3 | 4 {
  switch (severity) {
    case "critical": return 1
    case "high": return 2
    case "medium": return 3
    default: return 4
  }
}

/**
 * Create a Linear issue from a feedback insight cluster.
 * Uses the same GraphQL fetch pattern as sahara-whatsapp-monitor.ts.
 *
 * Returns success/failure with identifier and URL on success.
 * Gracefully handles missing API key and duplicate creation.
 */
export async function createLinearIssueFromInsight(
  insight: FeedbackInsight
): Promise<LinearIssueResult> {
  const apiKey = process.env.LINEAR_API_KEY
  if (!apiKey) {
    return {
      success: false,
      error: "LINEAR_API_KEY not configured",
    }
  }

  // Guard against duplicate creation
  if (insight.linear_issue_id) {
    return {
      success: false,
      error: `Linear issue already created: ${insight.linear_issue_id}`,
    }
  }

  try {
    // Step 1: Get team ID
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
      return { success: false, error: `Team "${LINEAR_TEAM}" not found in Linear` }
    }

    // Step 2: Build description
    const signalIdsList = insight.signal_ids.slice(0, 20)
    const signalIdsFormatted = signalIdsList.map((id) => `- \`${id}\``).join("\n")
    const truncation =
      insight.signal_ids.length > 20
        ? `\n- ... and ${insight.signal_ids.length - 20} more`
        : ""

    const createdDate = new Date(insight.created_at).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })

    const description = `## Feedback Cluster: ${insight.title}

**Severity:** ${insight.severity} | **Signals:** ${insight.signal_count} | **Category:** ${insight.category || "mixed"}

### Description
${insight.description || "No description available."}

### Source
Auto-created from feedback pattern detection.
- Signal count: ${insight.signal_count}
- Detection date: ${createdDate}
- [View in Sahara Admin](${ADMIN_DASHBOARD_URL})

### Signal IDs
${signalIdsFormatted}${truncation}`

    // Step 3: Create issue
    const priority = severityToPriority(insight.severity)

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
            title: `[Feedback] ${insight.title}`,
            description,
            priority,
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
  } catch (err) {
    return {
      success: false,
      error: `Linear API error: ${err instanceof Error ? err.message : String(err)}`,
    }
  }
}

/**
 * Update a feedback insight with its linked Linear issue identifier.
 * Sets status to 'actioned' and records the timestamp.
 */
export async function updateInsightWithLinearIssue(
  insightId: string,
  linearIdentifier: string
): Promise<void> {
  const supabase = createServiceClient()
  const { error } = await supabase
    .from("feedback_insights")
    .update({
      linear_issue_id: linearIdentifier,
      status: "actioned",
      actioned_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", insightId)
  if (error) throw error
}
