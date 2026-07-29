/**
 * Onboarding Reminder Channel Configuration
 * AI-3492: Automated email + text reminders for user engagement
 */

type EnvLike = Record<string, string | undefined>;

export function isEmailChannelConfigured(env: EnvLike = process.env): boolean {
  return !!env.RESEND_API_KEY;
}

export function isSmsChannelConfigured(env: EnvLike = process.env): boolean {
  return !!(
    env.TWILIO_ACCOUNT_SID &&
    env.TWILIO_AUTH_TOKEN &&
    env.TWILIO_MESSAGING_SERVICE_SID
  );
}
