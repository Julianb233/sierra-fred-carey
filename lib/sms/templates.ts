/**
 * SMS Message Templates
 * Phase 04: Studio Tier Features - Plan 05
 * Phase 14: Fred Cary Voice Rewrite
 * Phase 15: Voice Helpers Activation
 *
 * Message templates for weekly check-ins and lifecycle events.
 * All templates target under 160 characters (single SMS segment) where possible.
 */

import { getRandomQuote } from "@/lib/fred-brain";

const MAX_SMS_LENGTH = 160;

/**
 * Generate a personalized weekly check-in message.
 * Tries to include a Fred quote when there are no highlights and space permits.
 *
 * @param founderName - First name of the founder
 * @param highlights - Optional array of recent agent activity descriptions
 * @returns SMS message body (max 160 chars)
 */
export function getCheckinTemplate(
  founderName: string,
  highlights?: string[]
): string {
  const cta = 'Reply with your top 3 priorities.';

  if (!highlights || highlights.length === 0) {
    // Try to include a Fred quote when no highlights
    const quote = getRandomQuote();
    const withQuote = `Hey ${founderName}! "${quote}" - Fred. ${cta}`;
    if (withQuote.length <= MAX_SMS_LENGTH) {
      return withQuote;
    }
    // Fall back if quote makes message too long
    const simple = `Hey ${founderName}! Weekly check-in from Sahara. ${cta}`;
    return simple.slice(0, MAX_SMS_LENGTH);
  }

  // Existing highlights logic (unchanged)
  const greeting = `Hey ${founderName}! Weekly check-in from Sahara.`;
  const highlightPrefix = 'Your agents completed: ';
  const availableSpace = MAX_SMS_LENGTH - greeting.length - cta.length - highlightPrefix.length - 3;

  let highlightText = highlights.join(', ');
  if (highlightText.length > availableSpace) {
    highlightText = highlightText.slice(0, availableSpace - 3) + '...';
  }

  const message = `${greeting} ${highlightPrefix}${highlightText}. ${cta}`;

  if (message.length > MAX_SMS_LENGTH) {
    return `${greeting} ${cta}`.slice(0, MAX_SMS_LENGTH);
  }

  return message;
}

/**
 * Welcome message for new SMS subscribers.
 *
 * @param founderName - First name of the founder
 * @returns SMS message body (max 160 chars)
 */
export function getWelcomeTemplate(founderName: string): string {
  return `Welcome aboard, ${founderName}! Fred here. We'll check in weekly to keep you on track. Reply STOP to opt out.`.slice(
    0,
    MAX_SMS_LENGTH
  );
}

/**
 * Confirmation message when a user unsubscribes.
 * Signed "--Fred" for personal touch.
 *
 * @returns SMS message body
 */
export function getStopConfirmation(): string {
  return "Got it -- you're unsubscribed from check-ins. Text START anytime to jump back in. --Fred";
}
