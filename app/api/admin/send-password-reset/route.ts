/**
 * Admin: Send branded password-reset email
 *
 * POST /api/admin/send-password-reset
 * body: { email: string, variant?: "migration" | "self-serve", preview?: boolean }
 *
 * Generates a Supabase recovery link via the admin API (so the link is
 * already valid without the user clicking through Supabase's plaintext
 * email), wraps it in our branded React Email template, and sends through
 * Resend.
 *
 * AI-8906: Sean asked for a sample template before mass-sending the
 * 65-user migration cohort. With `?preview=true`, the endpoint renders
 * the email HTML and returns it without sending — Sean reviews, then
 * we run the same call with preview=false to actually send.
 *
 * Requires admin authentication.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdminRequest } from "@/lib/auth/admin";
import { createServiceClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/send";
import PasswordResetEmail from "@/lib/email/templates/password-reset";
import { render } from "@react-email/components";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const denied = await requireAdminRequest(request);
  if (denied) return denied;

  try {
    const body = await request.json();
    const email = (body.email || "").toString().trim().toLowerCase();
    const variant: "migration" | "self-serve" =
      body.variant === "migration" ? "migration" : "self-serve";
    const preview = body.preview === true;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "valid email required" },
        { status: 400 }
      );
    }

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL || "https://www.joinsahara.com";

    const supabase = createServiceClient();

    // Look up the user — also pulls name for personalization
    const { data: usersList } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });
    const authUser = usersList.users.find(
      (u) => (u.email || "").toLowerCase() === email
    );

    let recipientName: string | null = null;
    let resetUrl = `${appUrl}/forgot-password?email=${encodeURIComponent(email)}`;

    if (authUser) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("name")
        .eq("id", authUser.id)
        .maybeSingle();
      recipientName =
        (profile as { name?: string } | null)?.name ?? null;

      // Generate a real recovery link via Supabase admin API. This produces
      // a token-bearing URL that bypasses Supabase's plaintext email entirely.
      const { data: linkData, error: linkErr } =
        await supabase.auth.admin.generateLink({
          type: "recovery",
          email,
          options: {
            redirectTo: `${appUrl}/api/auth/callback?next=/reset-password`,
          },
        });

      if (linkErr) {
        console.error(
          "[admin/send-password-reset] generateLink error:",
          linkErr
        );
      } else if (linkData?.properties?.action_link) {
        resetUrl = linkData.properties.action_link;
      }
    }

    const emailComponent = PasswordResetEmail({
      recipientName,
      resetUrl,
      appUrl,
      variant,
      expiresInHours: 1,
    });

    if (preview) {
      const html = await render(emailComponent);
      return NextResponse.json({
        preview: true,
        html,
        resetUrl,
        recipientName,
        variant,
      });
    }

    const subject =
      variant === "migration"
        ? "Set your new Sahara password"
        : "Reset your Sahara password";

    const result = await sendEmail({
      to: email,
      subject,
      react: emailComponent,
      tags: [
        { name: "category", value: "password-reset" },
        { name: "variant", value: variant },
      ],
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error ?? "send failed" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      email,
      variant,
      resend_id: result.resendId,
    });
  } catch (err) {
    console.error("[admin/send-password-reset] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "send failed" },
      { status: 500 }
    );
  }
}
