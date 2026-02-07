/**
 * SMS Message Templates
 * Phase 04: Studio Tier Features - Plan 05
 * Phase 14: Fred Cary Voice Rewrite
 *
 * Message templates for weekly check-ins and lifecycle events.
 * All templates target under 160 characters (single SMS segment) where possible.
 */

import { getRandomQuote } from "@/lib/fred-brain";

const MAX_SMS_LENGTH = 160;

/**
 * Generate a personalized weekly check-in message.
 * Rotates between 3 variants for variety based on founderName length.
 *
 * @param founderName - First name of the founder
 * @param highlights - Optional array of recent agent activity descriptions
 * @returns SMS message body
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
    // Fall back to standard variant if quote makes message too long
    const variant = founderName.length % 3;
    const variants = [
      `${founderName} -- it's Fred. What's your biggest win this week? ${cta}`,
      `${founderName} -- Fred here. What moved the needle this week? ${cta}`,
      `${founderName} -- Fred checking in. What's working? What's stuck? ${cta}`,
    ];
    return variants[variant].slice(0, MAX_SMS_LENGTH);
  }

  // Highlights logic
  const greeting = `${founderName} -- Fred here.`;
  const highlightText = highlights.join(', ');
  const withHighlights = `${greeting} Your agents did: ${highlightText}. What's next? ${cta}`;
  if (withHighlights.length <= MAX_SMS_LENGTH) {
    return withHighlights;
  }

  return `${greeting} ${cta}`.slice(0, MAX_SMS_LENGTH);
}

/**
 * Welcome message for new SMS subscribers.
 *
 * @param founderName - First name of the founder
 * @returns SMS message body
 */
export function getWelcomeTemplate(founderName: string): string {
  return `${founderName}, it's Fred Cary. I'll text you weekly for a quick accountability check. Think of me as your digital co-founder. Reply STOP to opt out.`.slice(
    0,
    MAX_SMS_LENGTH
  );
}

/**
 * Confirmation message when a user unsubscribes.
 *
 * @returns SMS message body
 */
export function getStopConfirmation(): string {
  return "Got it -- you're unsubscribed from check-ins. Text START anytime to re-enable. --Fred";
}
