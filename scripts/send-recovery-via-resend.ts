/**
 * send-recovery-via-resend.ts
 *
 * Bypass Supabase's built-in email SMTP and deliver a password-recovery link
 * directly via Resend (known-good deliverability from fred@joinsahara.com).
 *
 * We hit Supabase admin.generate_link to MINT the token, then Resend to SEND
 * the message. Supabase's recovery_sent_at rate limit only applies to its
 * own public /recover endpoint, not admin/generate_link — so this path is
 * free of the "1 email per 60s" throttle and free of the default shared
 * SMTP's deliverability problems.
 *
 * Usage:
 *   npx tsx scripts/send-recovery-via-resend.ts billhoodtaos@gmail.com
 *
 * Env required (all already in sahara/.env.local):
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY,
 *   RESEND_FROM_EMAIL
 */

import { Resend } from 'resend';
import { config } from 'dotenv';
import { resolve } from 'node:path';

config({ path: resolve(process.cwd(), '.env.local'), override: true });

function must(k: string): string {
  const v = process.env[k];
  if (!v) { console.error(`Missing env: ${k}`); process.exit(2); }
  return v;
}

async function mintLink(email: string): Promise<{ action_link: string; hashed_token: string }> {
  const r = await fetch(`${must('NEXT_PUBLIC_SUPABASE_URL')}/auth/v1/admin/generate_link`, {
    method: 'POST',
    headers: {
      apikey: must('SUPABASE_SERVICE_ROLE_KEY'),
      Authorization: `Bearer ${must('SUPABASE_SERVICE_ROLE_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ type: 'recovery', email }),
  });
  if (!r.ok) throw new Error(`generate_link failed: ${r.status} ${await r.text()}`);
  return (await r.json()) as { action_link: string; hashed_token: string };
}

// Build a branded URL that goes through our own /auth/verify route — never
// surfaces the Supabase project URL to the user.
function brandedRecoveryUrl(email: string, hashed_token: string): string {
  const base = process.env.SAHARA_APP_URL || 'https://www.joinsahara.com';
  const qs = new URLSearchParams({
    token_hash: hashed_token,
    type: 'recovery',
    next: '/reset-password',
  });
  return `${base}/auth/verify?${qs.toString()}`;
}

function renderHtml(email: string, link: string): string {
  // Plain, transactional, no tracking pixels, Sahara-branded.
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Sign in to Sahara</title></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:#111827;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f9fafb;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;margin:40px auto;">
        <tr><td style="text-align:center;padding-bottom:24px;">
          <div style="font-size:28px;font-weight:700;color:#6366f1;letter-spacing:-0.5px;">Sahara</div>
        </td></tr>
        <tr><td style="background:#ffffff;border-radius:8px;padding:40px;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
          <p style="font-size:16px;font-weight:600;margin:0 0 16px 0;">Sign in to Sahara</p>
          <p style="font-size:15px;line-height:1.6;color:#374151;margin:0 0 16px 0;">
            We're routing this directly so your one-click sign-in link lands cleanly in your inbox. Click the button below to sign in and set a new password.
          </p>
          <table cellpadding="0" cellspacing="0" border="0" align="center" style="margin:24px auto;">
            <tr><td style="background:#6366f1;border-radius:6px;">
              <a href="${link}" style="display:inline-block;padding:12px 28px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;">
                Sign in &amp; reset password
              </a>
            </td></tr>
          </table>
          <p style="font-size:13px;line-height:1.6;color:#6b7280;margin:24px 0 0 0;">
            If the button doesn't work, copy this URL into your browser:<br>
            <span style="word-break:break-all;font-size:12px;color:#6b7280;">${link}</span>
          </p>
          <p style="font-size:13px;line-height:1.6;color:#6b7280;margin:16px 0 0 0;">
            This link is one-time-use and expires in 24 hours. It was requested for <strong>${email}</strong>.
          </p>
          <p style="font-size:13px;line-height:1.6;color:#6b7280;margin:24px 0 0 0;">
            If you didn't request this, just ignore this email — no change will be made to your account. Questions? Reply directly.
          </p>
        </td></tr>
        <tr><td style="text-align:center;padding-top:24px;">
          <div style="font-size:12px;color:#9ca3af;">Sahara · joinsahara.com</div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error('usage: tsx scripts/send-recovery-via-resend.ts <email>');
    process.exit(1);
  }

  console.log(`minting recovery link for ${email} via admin/generate_link...`);
  const { action_link, hashed_token } = await mintLink(email);
  const branded = brandedRecoveryUrl(email, hashed_token);
  console.log(`raw link (hidden from user):  ${action_link.slice(0, 80)}...`);
  console.log(`branded link (in the email): ${branded}`);

  console.log(`sending via Resend from ${must('RESEND_FROM_EMAIL')}...`);
  const resend = new Resend(must('RESEND_API_KEY'));
  const res = await resend.emails.send({
    from: must('RESEND_FROM_EMAIL'),
    to: email,
    subject: 'Sign in to Sahara (one-click recovery link)',
    html: renderHtml(email, branded),
    replyTo: must('RESEND_FROM_EMAIL'),
  });
  if (res.error) {
    console.error(`Resend error:`, res.error);
    process.exit(1);
  }
  console.log(`sent. resend_id=${res.data?.id}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
