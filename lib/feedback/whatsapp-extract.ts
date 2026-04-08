/**
 * WhatsApp Message Extraction — Fallback Chain
 *
 * Primary: Mac Mini SSH + AppleScript (always authenticated, no session expiry)
 * Fallback: BrowserBase + Stagehand (browser automation)
 *
 * Used by trigger/sahara-whatsapp-monitor.ts
 */

export interface WhatsAppMessage {
  sender: string
  timestamp: string
  text: string | null
  media: string | null
}

interface ExtractionResult {
  messages: WhatsAppMessage[]
  method: "mac-mini-ssh" | "browserbase"
  error?: string
}

interface ExtractionLogger {
  log: (msg: string, extra?: Record<string, unknown>) => void
  error: (msg: string) => void
}

const WHATSAPP_GROUP_NAME = "Sahara Founders"
const BROWSERBASE_CONTEXT_ID = "ed424c84-729a-49f3-bfe2-811d5cda5282"

/**
 * Extract messages using fallback chain: Mac Mini SSH (primary) → BrowserBase (fallback)
 */
export async function extractMessages(
  lastCheck: string | null,
  logger: ExtractionLogger
): Promise<ExtractionResult> {
  // Try Mac Mini SSH first
  logger.log("Attempting Mac Mini SSH extraction (primary)")
  try {
    const messages = await extractViaMacMiniSSH(logger)
    if (messages.length > 0) {
      logger.log(`Mac Mini SSH extraction succeeded: ${messages.length} messages`)
      return { messages, method: "mac-mini-ssh" }
    }
    logger.log("Mac Mini SSH returned 0 messages, falling back to BrowserBase")
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err)
    logger.error(`Mac Mini SSH extraction failed: ${errMsg}`)
    logger.log("Falling back to BrowserBase extraction")
  }

  // Fallback to BrowserBase
  try {
    const messages = await extractViaBrowserBase(lastCheck, logger)
    logger.log(`BrowserBase extraction succeeded: ${messages.length} messages`)
    return { messages, method: "browserbase" }
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err)
    logger.error(`BrowserBase extraction also failed: ${errMsg}`)
    return {
      messages: [],
      method: "browserbase",
      error: `Both extraction methods failed. SSH: see above. BrowserBase: ${errMsg}`,
    }
  }
}

/**
 * Extract messages via Mac Mini SSH + AppleScript.
 * Uses the WhatsApp desktop app which is always authenticated on Mac Mini.
 */
async function extractViaMacMiniSSH(
  logger: ExtractionLogger
): Promise<WhatsAppMessage[]> {
  const { exec } = await import("child_process")
  const { promisify } = await import("util")
  const execAsync = promisify(exec)

  // AppleScript to activate WhatsApp, navigate to the group, and extract visible messages
  const appleScript = `
tell application "WhatsApp" to activate
delay 2
tell application "System Events"
    tell process "WhatsApp"
        -- Find and click the group
        set allElements to entire contents of window 1
        repeat with el in allElements
            try
                if (role of el) is "AXButton" and (description of el) contains "${WHATSAPP_GROUP_NAME}" then
                    click el
                    exit repeat
                end if
            end try
        end repeat
        delay 2
        -- Scroll to bottom
        key code 119
        delay 1
        -- Extract all visible text
        set messageTexts to {}
        set allItems to entire contents of window 1
        repeat with el in allItems
            try
                set r to role of el
                if r is "AXStaticText" then
                    set v to value of el
                    if v is not missing value and v is not "" then
                        set end of messageTexts to v
                    end if
                end if
            end try
        end repeat
        set AppleScript's text item delimiters to "|||"
        return messageTexts as text
    end tell
end tell`

  const escapedScript = appleScript.replace(/'/g, "'\\''")

  const { stdout } = await execAsync(
    `ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no mac-mini 'osascript -e '"'"'${escapedScript}'"'"''`,
    { timeout: 60000 }
  )

  if (!stdout || !stdout.trim()) {
    return []
  }

  // Parse the pipe-delimited output into messages
  const parts = stdout.trim().split("|||").map((s: string) => s.trim()).filter(Boolean)
  return parseRawTextToMessages(parts, logger)
}

/**
 * Parse raw text elements from WhatsApp desktop into structured messages.
 * WhatsApp desktop accessibility tree typically has: sender, timestamp, message body
 * as separate AXStaticText elements.
 */
function parseRawTextToMessages(
  parts: string[],
  logger: ExtractionLogger
): WhatsAppMessage[] {
  const timePattern = /^\d{1,2}:\d{2}\s*(AM|PM|am|pm)?$/
  const skipTexts = new Set([
    "WhatsApp", "Search", "Chats", "Status", "Communities",
    "Channels", "New chat", "Encrypted", "Settings",
  ])

  const messages: WhatsAppMessage[] = []

  for (let i = 0; i < parts.length; i++) {
    const text = parts[i]

    // Skip UI chrome text
    if (skipTexts.has(text) || text.length < 3) continue

    // If this looks like a timestamp, check surrounding context
    if (timePattern.test(text)) {
      const sender = i > 0 ? parts[i - 1] : "Unknown"
      const body = i + 1 < parts.length ? parts[i + 1] : null

      if (body && !timePattern.test(body) && body.length > 2 && !skipTexts.has(body)) {
        messages.push({
          sender: skipTexts.has(sender) ? "Unknown" : sender,
          timestamp: text,
          text: body,
          media: null,
        })
        i += 1 // Skip the body in next iteration
        continue
      }
    }

    // Long standalone text is likely a message
    if (text.length > 20 && !timePattern.test(text)) {
      messages.push({
        sender: "Unknown",
        timestamp: "",
        text,
        media: null,
      })
    }
  }

  logger.log(`Parsed ${messages.length} messages from ${parts.length} raw text elements`)
  return messages
}

/**
 * Extract messages via BrowserBase + Stagehand (fallback method).
 * Uses persistent auth context to reuse WhatsApp Web login.
 */
async function extractViaBrowserBase(
  _lastCheck: string | null,
  logger: ExtractionLogger
): Promise<WhatsAppMessage[]> {
  const apiKey = process.env.BROWSERBASE_API_KEY
  const projectId = process.env.BROWSERBASE_PROJECT_ID

  if (!apiKey || !projectId) {
    throw new Error("BrowserBase credentials not configured")
  }

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
    throw new Error(`BrowserBase session creation failed: ${sessionRes.status}`)
  }

  const session = await sessionRes.json()
  const sessionId = session.id

  logger.log("BrowserBase session created", { sessionId })

  try {
    const { Stagehand } = await import("@browserbasehq/stagehand")

    const stagehand = new Stagehand({
      browserbaseSessionID: sessionId,
      env: "BROWSERBASE",
      model: "gemini-2.0-flash" as const,
    })

    await stagehand.init()

    await stagehand.act("Navigate to https://web.whatsapp.com")
    await new Promise((r) => setTimeout(r, 5000))

    await stagehand.act(
      `Click the search box and type "${WHATSAPP_GROUP_NAME}"`
    )
    await new Promise((r) => setTimeout(r, 2000))

    await stagehand.act(
      `Click on the "${WHATSAPP_GROUP_NAME}" group chat in the search results`
    )
    await new Promise((r) => setTimeout(r, 3000))

    const extraction = await stagehand.extract(
      `Extract ALL chat messages visible on this page from the "${WHATSAPP_GROUP_NAME}" group. For each message, extract: the sender name, the timestamp, and the full message text. Also note any images or photos mentioned. Return everything in chronological order.`
    )

    await stagehand.close()

    const messages = (extraction as Record<string, unknown>).messages as WhatsAppMessage[] || []
    return messages.filter(
      (m: WhatsAppMessage) => m.text && m.text.length > 0
    )
  } catch (err) {
    // Close session on failure
    await fetch(`https://www.browserbase.com/v1/sessions/${sessionId}`, {
      method: "DELETE",
      headers: { "x-bb-api-key": apiKey },
    }).catch(() => {})
    throw err
  }
}
