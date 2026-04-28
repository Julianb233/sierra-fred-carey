/**
 * Password Reset Email Template (AI-8906)
 *
 * Sent to migrated users (and anyone using the forgot-password flow) so the
 * email comes from Sahara's branded Resend sender instead of relying on
 * Supabase's default plaintext SMTP. Body explains:
 *   - Why they got it (account migrated from previous platform OR they
 *     clicked "forgot password")
 *   - What clicking the link does (sets a new password, takes them to the
 *     login dashboard)
 *   - That the link is single-use and expires in 1 hour
 *
 * Phase 65-user migration (2026-04-22 meeting): Sean Gelt and Fred Cary
 * asked for a sample template before mass-sending so they could review
 * tone + fields. This component renders that sample.
 */

import {
  Heading,
  Text,
  Button,
  Section,
  Link,
} from "@react-email/components";
import { EmailLayout } from "./layout";

export interface PasswordResetEmailProps {
  /** Greeting name. Falls back to "there" when missing. */
  recipientName?: string | null;
  /** The signed magic link the user clicks to reset their password. */
  resetUrl: string;
  /** App base URL used by the layout footer (settings link). */
  appUrl: string;
  /** Variant — controls the contextual blurb at top. */
  variant?: "migration" | "self-serve";
  /** Hours until the link expires. Default 1. */
  expiresInHours?: number;
}

export default function PasswordResetEmail({
  recipientName,
  resetUrl,
  appUrl,
  variant = "self-serve",
  expiresInHours = 1,
}: PasswordResetEmailProps) {
  const greetingName = recipientName?.trim() || "there";
  const previewText =
    variant === "migration"
      ? "Set your new Sahara password to access your account"
      : "Reset your Sahara password";

  return (
    <EmailLayout previewText={previewText} appUrl={appUrl}>
      <Heading
        as="h1"
        style={{
          fontSize: "24px",
          fontWeight: 700,
          color: "#111827",
          margin: "0 0 16px 0",
          lineHeight: "32px",
        }}
      >
        {variant === "migration"
          ? "Welcome back to Sahara, " + greetingName
          : "Reset your password, " + greetingName}
      </Heading>

      {variant === "migration" ? (
        <>
          <Text
            style={{
              fontSize: "16px",
              color: "#374151",
              lineHeight: "24px",
              margin: "0 0 16px 0",
            }}
          >
            We&apos;ve moved Sahara onto a new platform. Your account, profile, and
            progress have been migrated &mdash; <strong>nothing has been lost</strong>. The
            one thing we couldn&apos;t carry over is your password (it was encrypted
            on the old platform), so we need you to set a new one before
            signing in.
          </Text>
          <Text
            style={{
              fontSize: "16px",
              color: "#374151",
              lineHeight: "24px",
              margin: "0 0 24px 0",
            }}
          >
            Click the button below to set your new password. It only takes a
            second.
          </Text>
        </>
      ) : (
        <Text
          style={{
            fontSize: "16px",
            color: "#374151",
            lineHeight: "24px",
            margin: "0 0 24px 0",
          }}
        >
          We received a request to reset your Sahara password. Click the button
          below to choose a new one. If you didn&apos;t request this, you can safely
          ignore this email &mdash; your password will stay the same.
        </Text>
      )}

      <Section style={{ textAlign: "center" as const, margin: "0 0 32px 0" }}>
        <Button
          href={resetUrl}
          style={{
            backgroundColor: "#ff6a1a",
            color: "#ffffff",
            padding: "14px 32px",
            borderRadius: "8px",
            textDecoration: "none",
            fontSize: "16px",
            fontWeight: 600,
            display: "inline-block",
          }}
        >
          {variant === "migration" ? "Set my new password" : "Reset my password"}
        </Button>
      </Section>

      <Text
        style={{
          fontSize: "14px",
          color: "#6b7280",
          lineHeight: "20px",
          margin: "0 0 16px 0",
        }}
      >
        <strong>Heads up:</strong> this link is single-use and expires in{" "}
        {expiresInHours} hour{expiresInHours === 1 ? "" : "s"}. If it expires,
        just request a new one from the{" "}
        <Link
          href={`${appUrl}/forgot-password`}
          style={{ color: "#ff6a1a", textDecoration: "underline" }}
        >
          forgot-password page
        </Link>
        .
      </Text>

      <Text
        style={{
          fontSize: "14px",
          color: "#9ca3af",
          lineHeight: "20px",
          margin: "16px 0 0 0",
        }}
      >
        Button not working? Copy this link into your browser:
        <br />
        <Link
          href={resetUrl}
          style={{
            color: "#6b7280",
            wordBreak: "break-all",
            fontSize: "12px",
          }}
        >
          {resetUrl}
        </Link>
      </Text>
    </EmailLayout>
  );
}
