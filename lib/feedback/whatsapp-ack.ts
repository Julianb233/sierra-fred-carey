/**
 * WhatsApp Group Acknowledgment via BrowserBase
 *
 * Sends feedback acknowledgment messages back to WhatsApp groups
 * using BrowserBase + Stagehand for reliable cross-environment delivery.
 *
 * Used by:
 * - trigger/sahara-whatsapp-monitor.ts (after creating Linear issues)
 * - app/api/admin/feedback/insights/[insightId]/linear/route.ts (manual triage)
 */

const WHATSAPP_GROUP_NAME = "Sahara Founders"
const BROWSERBASE_CONTEXT_ID = "ed424c84-729a-49f3-bfe2-811d5cda5282"

export interface AckIssue {
  title: string
  identifier: string
  priority: number
}

/**
 * Format the ack message for WhatsApp group.
 * Keeps it short and scannable — one line per issue.
 */
export function formatAckMessage(issues: AckIssue[]): string {
  const priorityLabels: Record<number, string> = {
    1: "Urgent",
    2: "High",
    3: "Normal",
    4: "Low",
  }

  const lines = issues.map(
    (i) => `• ${i.title} (${i.identifier}) — ${priorityLabels[i.priority] || "Normal"}`
  )

  return [
    "✓ Feedback captured:",
    "",
    ...lines,
    "",
    "We're on it!",
  ].join("\n")
}

/**
 * Send an acknowledgment message to the WhatsApp group via BrowserBase.
 *
 * Opens a new BrowserBase session with persistent auth context,
 * navigates to the group, types the message, and sends it.
 *
 * Returns success/failure — never throws (callers should log but not fail).
 */
export async function sendWhatsAppAck(
  issues: AckIssue[],
  options?: {
    groupName?: string
    logger?: { log: (msg: string, extra?: Record<string, unknown>) => void; error: (msg: string) => void }
  }
): Promise<{ success: boolean; error?: string }> {
  const groupName = options?.groupName || WHATSAPP_GROUP_NAME
  const log = options?.logger || { log: console.log, error: console.error }
  const message = formatAckMessage(issues)

  const apiKey = process.env.BROWSERBASE_API_KEY
  const projectId = process.env.BROWSERBASE_PROJECT_ID

  if (!apiKey || !projectId) {
    return { success: false, error: "BrowserBase credentials not configured" }
  }

  let sessionId: string | null = null

  try {
    // Create a session with persistent WhatsApp auth
    const sessionRes = await fetch("https://www.browserbase.com/v1/sessions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-bb-api-key": apiKey,
      },
      body: JSON.stringify({
        projectId,
        browserSettings: {
          context: {
            id: BROWSERBASE_CONTEXT_ID,
            persist: true,
          },
        },
      }),
    })

    if (!sessionRes.ok) {
      return { success: false, error: `BrowserBase session creation failed: ${sessionRes.status}` }
    }

    const session = await sessionRes.json()
    sessionId = session.id
    log.log("BrowserBase ack session created", { sessionId })

    const { Stagehand } = await import("@browserbasehq/stagehand")

    const stagehand = new Stagehand({
      browserbaseSessionID: sessionId!,
      env: "BROWSERBASE",
      model: "gemini-2.0-flash" as const,
    })

    await stagehand.init()

    // Navigate to WhatsApp Web
    await stagehand.act("Navigate to https://web.whatsapp.com")
    await new Promise((r) => setTimeout(r, 5000))

    // Find and open the group
    await stagehand.act(`Click the search box and type "${groupName}"`)
    await new Promise((r) => setTimeout(r, 2000))

    await stagehand.act(
      `Click on the "${groupName}" group chat in the search results`
    )
    await new Promise((r) => setTimeout(r, 3000))

    // Type and send the ack message
    await stagehand.act(
      `Click on the message input box at the bottom of the chat`
    )
    await new Promise((r) => setTimeout(r, 1000))

    // Type the message line by line (WhatsApp uses Shift+Enter for newlines)
    await stagehand.act(
      `Type the following message in the message input box and press Enter to send it: ${message}`
    )
    await new Promise((r) => setTimeout(r, 2000))

    await stagehand.close()
    log.log("WhatsApp ack sent successfully", { groupName, issueCount: issues.length })

    return { success: true }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    log.error(`WhatsApp ack failed: ${errorMsg}`)

    // Clean up session on failure
    if (sessionId && apiKey) {
      await fetch(`https://www.browserbase.com/v1/sessions/${sessionId}`, {
        method: "DELETE",
        headers: { "x-bb-api-key": apiKey },
      }).catch(() => {})
    }

    return { success: false, error: errorMsg }
  }
}
