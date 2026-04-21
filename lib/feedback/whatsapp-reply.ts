/**
 * Sends a message to a WhatsApp group via Mac Mini SSH + AppleScript.
 * This is the primary method — Mac Mini is always authenticated.
 */
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function sendWhatsAppMessage(
  groupName: string,
  message: string
): Promise<{ success: boolean; error?: string }> {

  // Escape special characters for AppleScript
  const escapedMessage = message
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n");

  const script = `
ssh mac-mini 'osascript << "SCPT"
tell application "WhatsApp" to activate
delay 1
tell application "System Events"
    tell process "WhatsApp"
        -- Click group in chat list
        set allBtns to entire contents of window 1
        repeat with el in allBtns
            try
                if (role of el) is "AXButton" and (description of el) contains "${groupName}" then
                    click el
                    exit repeat
                end if
            end try
        end repeat
        delay 1
        key code 119
        delay 0.5

        -- Click compose area
        set allElements to entire contents of window 1
        repeat with el in allElements
            try
                set d to description of el as text
                if d contains "Compose message" then
                    set r to role of el
                    if r is "AXTextArea" or r is "AXTextField" then
                        click el
                        delay 0.3
                        exit repeat
                    end if
                end if
            end try
        end repeat
    end tell
end tell
delay 0.3
tell application "System Events"
    keystroke "${escapedMessage}"
    delay 0.5
    keystroke return
    delay 1
end tell
SCPT
'`;

  try {
    await execAsync(script, { timeout: 30000 });
    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

/**
 * Sends acknowledgment for captured feedback issues
 */
export async function sendFeedbackAck(
  groupName: string,
  issues: Array<{ title: string; identifier: string; priority: number }>
): Promise<void> {
  const priorityLabels = ["", "Urgent", "High", "Normal", "Low"];
  const issueLines = issues
    .map(i => `- ${i.title} (${i.identifier}) [${priorityLabels[i.priority]}]`)
    .join("\\n");

  const message = `Feedback captured:\\n${issueLines}\\n\\nTeam has been notified.`;
  await sendWhatsAppMessage(groupName, message);
}

/**
 * Sends resolution notification when a Linear issue is closed
 */
export async function sendResolutionNotification(
  groupName: string,
  issueTitle: string,
  issueIdentifier: string
): Promise<void> {
  const message = `Resolved: "${issueTitle}" (${issueIdentifier}) - Fixed and deployed.`;
  await sendWhatsAppMessage(groupName, message);
}
