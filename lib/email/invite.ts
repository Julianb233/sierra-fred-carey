/**
 * Team Invite Email Utility
 * Phase 33-01: Collaboration & Sharing
 *
 * Sends invite notification emails via Resend when configured.
 * No-ops gracefully when RESEND_API_KEY is not set.
 */

import { logger } from "@/lib/logger";

const log = logger.child({ module: "email/invite" });

const RESEND_API_URL = "https://api.resend.com/emails";
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "noreply@sahara.app";
const FROM_NAME = process.env.RESEND_FROM_NAME || "Sahara";

/**
 * Send a team invite notification email.
 *
 * Uses Resend if RESEND_API_KEY is configured, otherwise no-ops.
 * This function never throws -- failures are logged and swallowed
 * so the caller can fire-and-forget.
 */
export async function sendInviteEmail(
  toEmail: string,
  inviterName: string,
  role: string
): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    log.info("RESEND_API_KEY not configured, skipping invite email", {
      toEmail,
      inviterName,
      role,
    });
    return false;
  }

  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const invitationsUrl = `${baseUrl}/dashboard/invitations`;

    const html = generateInviteEmailHtml(inviterName, role, invitationsUrl);
    const text = generateInviteEmailText(inviterName, role, invitationsUrl);

    const emailPayload = {
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: [toEmail],
      subject: `${inviterName} invited you to collaborate on Sahara`,
      html,
      text,
      tags: [
        { name: "type", value: "team-invite" },
        { name: "role", value: role },
      ],
    };

    const response = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emailPayload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      log.error("Resend API error sending invite email", {
        status: response.status,
        error: errorData,
        toEmail,
      });
      return false;
    }

    log.info("Invite email sent", { toEmail, inviterName, role });
    return true;
  } catch (error) {
    log.error("Failed to send invite email", {
      error: error instanceof Error ? error.message : String(error),
      toEmail,
      inviterName,
    });
    return false;
  }
}

// ============================================================================
// Email Templates
// ============================================================================

function generateInviteEmailHtml(
  inviterName: string,
  role: string,
  invitationsUrl: string
): string {
  const roleLabel = role.charAt(0).toUpperCase() + role.slice(1);

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Team Invitation</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #ff6a1a 0%, #ea580c 100%); padding: 32px; text-align: center;">
              <h1 style="margin: 0; color: white; font-size: 24px; font-weight: 700;">
                Sahara
              </h1>
              <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">
                AI-Powered Founder Operating System
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="color: #111827; margin: 0 0 16px 0; font-size: 20px;">
                You have been invited to collaborate
              </h2>
              <p style="font-size: 16px; color: #374151; margin: 0 0 24px 0; line-height: 1.6;">
                <strong>${escapeHtml(inviterName)}</strong> has invited you to join their team on Sahara as a <strong>${escapeHtml(roleLabel)}</strong>.
              </p>

              <div style="background-color: #fff7ed; border-left: 4px solid #ff6a1a; padding: 16px; margin: 0 0 24px 0; border-radius: 0 6px 6px 0;">
                <p style="margin: 0; color: #9a3412; font-size: 14px;">
                  <strong>Role:</strong> ${escapeHtml(roleLabel)}<br>
                  <strong>Invited by:</strong> ${escapeHtml(inviterName)}
                </p>
              </div>

              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 16px 0;">
                    <a href="${invitationsUrl}" style="display: inline-block; background-color: #ff6a1a; color: white; text-decoration: none; padding: 14px 36px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                      View Invitation
                    </a>
                  </td>
                </tr>
              </table>

              <p style="color: #6b7280; font-size: 14px; margin: 24px 0 0 0; line-height: 1.5;">
                You can accept or decline this invitation from your dashboard.
                If you do not have a Sahara account, you will need to sign up first.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                This email was sent by Sahara. If you did not expect this invitation, you can safely ignore it.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

function generateInviteEmailText(
  inviterName: string,
  role: string,
  invitationsUrl: string
): string {
  const roleLabel = role.charAt(0).toUpperCase() + role.slice(1);

  return `
Team Invitation - Sahara

${inviterName} has invited you to join their team on Sahara as a ${roleLabel}.

Role: ${roleLabel}
Invited by: ${inviterName}

View and manage your invitation:
${invitationsUrl}

You can accept or decline this invitation from your dashboard.
If you do not have a Sahara account, you will need to sign up first.
  `.trim();
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
