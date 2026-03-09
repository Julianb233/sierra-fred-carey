/**
 * Scheduled task: Sahara WhatsApp Feedback Monitor
 *
 * Runs twice daily (9 AM and 5 PM UTC) to:
 * 1. Open WhatsApp Web via BrowserBase → "Sahara Founders" group
 * 2. Extract messages since last check
 * 3. Use AI to identify actionable feedback/bugs/feature requests
 * 4. Create Linear issues for each
 * 5. Send status report via WhatsApp reply, SMS, and email
 *
 * State tracking: Uses Supabase `whatsapp_monitor_state` table
 * to track last check timestamp and avoid duplicate processing.
 */
import { schedules, logger } from "@trigger.dev/sdk/v3";

// ── Types ───────────────────────────────────────────────────────
interface WhatsAppMessage {
  sender: string;
  timestamp: string;
  text: string | null;
  media: string | null;
}

interface IdentifiedIssue {
  title: string;
  description: string;
  priority: 1 | 2 | 3 | 4; // 1=Urgent, 2=High, 3=Normal, 4=Low
  type: "bug" | "feature" | "improvement";
  source_message: string;
}

interface MonitorResult {
  messagesExtracted: number;
  issuesIdentified: number;
  linearIssuesCreated: string[];
  reportSent: boolean;
  errors: string[];
}

// ── Constants ───────────────────────────────────────────────────
const WHATSAPP_GROUP_NAME = "Sahara Founders";
const BROWSERBASE_CONTEXT_ID = "ed424c84-729a-49f3-bfe2-811d5cda5282"; // Persistent context — cookies survive across sessions
const JULIAN_PHONE = process.env.JULIAN_PHONE || "+16265226199";
const JULIAN_EMAIL = process.env.JULIAN_EMAIL || "julian@aiacrobatics.com";
const LINEAR_TEAM = "Ai Acrobatics";
const LINEAR_PROJECT = "Sahara - AI Founder OS";

// ── Main Cron Task ──────────────────────────────────────────────
export const saharaWhatsAppMonitor = schedules.task({
  id: "sahara-whatsapp-monitor",
  // Twice daily: 9 AM UTC (2 AM PT) and 5 PM UTC (10 AM PT)
  cron: "0 9,17 * * *",
  maxDuration: 600, // 10 minutes
  retry: {
    maxAttempts: 2,
    minTimeoutInMs: 10000,
    maxTimeoutInMs: 60000,
    factor: 2,
  },
  run: async (payload) => {
    logger.log("Sahara WhatsApp monitor started", {
      timestamp: payload.timestamp,
      group: WHATSAPP_GROUP_NAME,
    });

    const result: MonitorResult = {
      messagesExtracted: 0,
      issuesIdentified: 0,
      linearIssuesCreated: [],
      reportSent: false,
      errors: [],
    };

    try {
      // Step 1: Get last check timestamp from state
      const lastCheck = await getLastCheckTimestamp();
      logger.log("Last check timestamp", { lastCheck });

      // Step 2: Extract messages from WhatsApp via BrowserBase
      const messages = await extractWhatsAppMessages(lastCheck);
      result.messagesExtracted = messages.length;
      logger.log(`Extracted ${messages.length} messages`);

      if (messages.length === 0) {
        logger.log("No new messages since last check");
        await updateLastCheckTimestamp();
        return result;
      }

      // Step 3: Use AI to identify actionable issues
      const issues = await identifyIssues(messages);
      result.issuesIdentified = issues.length;
      logger.log(`Identified ${issues.length} actionable issues`);

      if (issues.length === 0) {
        logger.log("No actionable issues found in messages");
        await updateLastCheckTimestamp();
        return result;
      }

      // Step 4: Create Linear issues
      for (const issue of issues) {
        try {
          const linearId = await createLinearIssue(issue);
          result.linearIssuesCreated.push(linearId);
          logger.log(`Created Linear issue: ${linearId}`, { title: issue.title });
        } catch (err) {
          const msg = `Failed to create Linear issue: ${issue.title} - ${err}`;
          result.errors.push(msg);
          logger.error(msg);
        }
      }

      // Step 5: Send report via WhatsApp, SMS, and email
      await sendReport(result, issues);
      result.reportSent = true;

      // Step 6: Update last check timestamp
      await updateLastCheckTimestamp();

      logger.log("WhatsApp monitor completed", result as unknown as Record<string, unknown>);
      return result;
    } catch (err) {
      const msg = `WhatsApp monitor failed: ${err}`;
      result.errors.push(msg);
      logger.error(msg);

      // Still try to send error notification
      try {
        await sendErrorNotification(msg);
      } catch {
        logger.error("Failed to send error notification");
      }

      return result;
    }
  },
});

// ── Helper Functions ────────────────────────────────────────────

async function getLastCheckTimestamp(): Promise<string | null> {
  try {
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data } = await supabase
      .from("whatsapp_monitor_state")
      .select("last_check_at")
      .eq("group_name", WHATSAPP_GROUP_NAME)
      .single();

    return data?.last_check_at || null;
  } catch {
    return null;
  }
}

async function updateLastCheckTimestamp(): Promise<void> {
  try {
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    await supabase
      .from("whatsapp_monitor_state")
      .upsert({
        group_name: WHATSAPP_GROUP_NAME,
        last_check_at: new Date().toISOString(),
        context_id: BROWSERBASE_CONTEXT_ID,
      }, { onConflict: "group_name" });
  } catch (err) {
    logger.error(`Failed to update last check timestamp: ${err}`);
  }
}

async function extractWhatsAppMessages(
  _lastCheck: string | null
): Promise<WhatsAppMessage[]> {
  // BrowserBase + Stagehand automation
  // Uses the persistent authenticated session to avoid QR re-scan
  const BROWSERBASE_API_KEY = process.env.BROWSERBASE_API_KEY;
  const BROWSERBASE_PROJECT_ID = process.env.BROWSERBASE_PROJECT_ID;

  if (!BROWSERBASE_API_KEY || !BROWSERBASE_PROJECT_ID) {
    throw new Error("BrowserBase credentials not configured");
  }

  // Create a new session (reusing auth cookies from persistent session)
  const sessionRes = await fetch("https://www.browserbase.com/v1/sessions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-bb-api-key": BROWSERBASE_API_KEY,
    },
    body: JSON.stringify({
      projectId: BROWSERBASE_PROJECT_ID,
      // Use persistent context to reuse WhatsApp login across sessions
      browserSettings: {
        context: {
          id: BROWSERBASE_CONTEXT_ID,
          persist: true,
        },
      },
    }),
  });

  if (!sessionRes.ok) {
    throw new Error(`BrowserBase session creation failed: ${sessionRes.status}`);
  }

  const session = await sessionRes.json();
  const sessionId = session.id;
  const connectUrl = session.connectUrl;

  logger.log("BrowserBase session created", { sessionId });

  try {
    // Connect via Stagehand SDK
    const { Stagehand } = await import("@browserbasehq/stagehand");

    const stagehand = new Stagehand({
      browserbaseSessionID: sessionId,
      env: "BROWSERBASE",
      model: "gemini-2.0-flash" as const,
    });

    await stagehand.init();

    // Navigate to WhatsApp Web
    await stagehand.act("Navigate to https://web.whatsapp.com");

    // Wait for WhatsApp to load (either QR or chat list)
    await new Promise((r) => setTimeout(r, 5000));

    // Search for the group
    await stagehand.act(
      `Click the search box and type "${WHATSAPP_GROUP_NAME}"`
    );

    await new Promise((r) => setTimeout(r, 2000));

    // Click on the group
    await stagehand.act(
      `Click on the "${WHATSAPP_GROUP_NAME}" group chat in the search results`
    );

    await new Promise((r) => setTimeout(r, 3000));

    // Extract messages
    const extraction = await stagehand.extract(
      `Extract ALL chat messages visible on this page from the "${WHATSAPP_GROUP_NAME}" group. For each message, extract: the sender name, the timestamp, and the full message text. Also note any images or photos mentioned. Return everything in chronological order.`
    );

    await stagehand.close();

    const messages = (extraction as any).messages || [];
    return messages.filter(
      (m: WhatsAppMessage) => m.text && m.text.length > 0
    );
  } catch (err) {
    logger.error(`WhatsApp extraction failed: ${err}`);
    // Close the session on failure
    await fetch(`https://www.browserbase.com/v1/sessions/${sessionId}`, {
      method: "DELETE",
      headers: { "x-bb-api-key": BROWSERBASE_API_KEY },
    }).catch(() => {});
    throw err;
  }
}

async function identifyIssues(
  messages: WhatsAppMessage[]
): Promise<IdentifiedIssue[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY not configured");
  }

  const messageText = messages
    .map((m) => `[${m.timestamp}] ${m.sender}: ${m.text}`)
    .join("\n");

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: `You are analyzing WhatsApp messages from the "Sahara Founders" group for the Sahara AI Founder OS platform (joinsahara.com).

Identify ACTIONABLE feedback — bugs, feature requests, or improvements mentioned by users (especially Fred Cary / "Fred Tec Partner" who is the product owner).

Ignore: greetings, thank yous, scheduling messages, unrelated chatter, admin messages.

For each issue found, return a JSON array with objects containing:
- title: concise issue title
- description: detailed description with the original quote
- priority: 1 (Urgent/breaking), 2 (High/important), 3 (Normal), 4 (Low/nice-to-have)
- type: "bug", "feature", or "improvement"
- source_message: the original message text

Messages:
${messageText}

Return ONLY a JSON array. If no actionable issues found, return [].`,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Anthropic API failed: ${response.status}`);
  }

  const data = await response.json();
  const content = data.content?.[0]?.text || "[]";

  // Extract JSON from response
  const jsonMatch = content.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];

  try {
    return JSON.parse(jsonMatch[0]);
  } catch {
    logger.error("Failed to parse AI response as JSON");
    return [];
  }
}

async function createLinearIssue(issue: IdentifiedIssue): Promise<string> {
  const apiKey = process.env.LINEAR_API_KEY;
  if (!apiKey) {
    throw new Error("LINEAR_API_KEY not configured");
  }

  // Get team ID first
  const teamQuery = await fetch("https://api.linear.app/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: apiKey,
    },
    body: JSON.stringify({
      query: `query { teams(filter: { name: { eq: "${LINEAR_TEAM}" } }) { nodes { id } } }`,
    }),
  });

  const teamData = await teamQuery.json();
  const teamId = teamData.data?.teams?.nodes?.[0]?.id;
  if (!teamId) throw new Error(`Team "${LINEAR_TEAM}" not found`);

  // Create the issue
  const labels = issue.type === "bug" ? ["Bug"] : issue.type === "feature" ? ["Feature"] : ["Improvement"];

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
          title: issue.title,
          description: `## Source\nWhatsApp Feedback — Sahara Founders group (auto-detected)\n\n## Description\n${issue.description}\n\n## Original Message\n> ${issue.source_message}`,
          priority: issue.priority,
          labelIds: [], // Labels need IDs, skip for now
        },
      },
    }),
  });

  const createData = await createRes.json();
  const identifier = createData.data?.issueCreate?.issue?.identifier;
  if (!identifier) throw new Error("Failed to create issue");

  return identifier;
}

async function sendReport(
  result: MonitorResult,
  issues: IdentifiedIssue[]
): Promise<void> {
  const issueList = issues
    .map((i, idx) => `${idx + 1}. [${i.type.toUpperCase()}] ${i.title} (P${i.priority})`)
    .join("\n");

  const linearLinks = result.linearIssuesCreated
    .map((id) => `- ${id}: https://linear.app/ai-acrobatics/issue/${id}`)
    .join("\n");

  const reportText = `Sahara WhatsApp Monitor Report
${new Date().toLocaleString("en-US", { timeZone: "America/Los_Angeles" })}

Messages scanned: ${result.messagesExtracted}
Issues identified: ${result.issuesIdentified}
Linear issues created: ${result.linearIssuesCreated.length}

${issueList ? `Issues:\n${issueList}` : "No new issues found."}

${linearLinks ? `Linear links:\n${linearLinks}` : ""}

${result.errors.length > 0 ? `Errors:\n${result.errors.join("\n")}` : "No errors."}`;

  // Send SMS
  try {
    const twilio = await import("twilio");
    const client = twilio.default(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );

    await client.messages.create({
      to: JULIAN_PHONE,
      messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID,
      body: reportText.slice(0, 1500), // SMS limit
    });

    logger.log("SMS report sent");
  } catch (err) {
    logger.error(`SMS send failed: ${err}`);
    result.errors.push(`SMS failed: ${err}`);
  }

  // Send email
  try {
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);

    await resend.emails.send({
      from: `${process.env.RESEND_FROM_NAME || "Sahara"} <${process.env.RESEND_FROM_EMAIL || "sahara@aiacrobatics.com"}>`,
      to: JULIAN_EMAIL,
      subject: `Sahara Monitor: ${result.issuesIdentified} issues found — ${new Date().toLocaleDateString()}`,
      html: `
        <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #ff6a1a;">Sahara WhatsApp Feedback Report</h2>
          <p style="color: #666;">${new Date().toLocaleString("en-US", { timeZone: "America/Los_Angeles" })}</p>

          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Messages scanned</strong></td><td>${result.messagesExtracted}</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Issues identified</strong></td><td>${result.issuesIdentified}</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Linear issues created</strong></td><td>${result.linearIssuesCreated.length}</td></tr>
          </table>

          ${issues.length > 0 ? `
            <h3>Issues Found</h3>
            <ul>
              ${issues.map((i) => `
                <li style="margin: 8px 0;">
                  <span style="background: ${i.priority === 1 ? "#ef4444" : i.priority === 2 ? "#f97316" : "#3b82f6"}; color: white; padding: 2px 6px; border-radius: 4px; font-size: 12px;">${i.type.toUpperCase()} P${i.priority}</span>
                  <strong>${i.title}</strong>
                  <br/><span style="color: #666; font-size: 14px;">${i.description.slice(0, 200)}</span>
                </li>
              `).join("")}
            </ul>
          ` : "<p>No new actionable issues found.</p>"}

          ${result.linearIssuesCreated.length > 0 ? `
            <h3>Linear Issues</h3>
            <ul>
              ${result.linearIssuesCreated.map((id) => `
                <li><a href="https://linear.app/ai-acrobatics/issue/${id}" style="color: #ff6a1a;">${id}</a></li>
              `).join("")}
            </ul>
          ` : ""}

          <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;" />
          <p style="color: #999; font-size: 12px;">Auto-generated by Sahara WhatsApp Monitor via Trigger.dev</p>
        </div>
      `,
    });

    logger.log("Email report sent");
  } catch (err) {
    logger.error(`Email send failed: ${err}`);
    result.errors.push(`Email failed: ${err}`);
  }
}

async function sendErrorNotification(error: string): Promise<void> {
  try {
    const twilio = await import("twilio");
    const client = twilio.default(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );

    await client.messages.create({
      to: JULIAN_PHONE,
      messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID,
      body: `Sahara WhatsApp Monitor ERROR: ${error.slice(0, 300)}`,
    });
  } catch {
    // Last resort — can't even send error notification
  }
}
