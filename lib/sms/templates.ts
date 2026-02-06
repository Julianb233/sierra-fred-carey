/**
 * SMS Message Templates
 * Phase 04: Studio Tier Features - Plan 05
 *
 * Message templates for weekly check-ins and lifecycle events.
 * All templates target under 160 characters (single SMS segment) where possible.
 */

const MAX_SMS_LENGTH = 160;

/**
 * Generate a personalized weekly check-in message.
 *
 * @param founderName - First name of the founder
 * @param highlights - Optional array of recent agent activity descriptions
 * @returns SMS message body
 */
export function getCheckinTemplate(
  founderName: string,
  highlights?: string[]
): string {
  const greeting = `Hey ${founderName}! Weekly check-in from Sahara.`;
  const cta = 'Reply with your top 3 priorities this week.';

  if (!highlights || highlights.length === 0) {
    const message = `${greeting} ${cta}`;
    return message.slice(0, MAX_SMS_LENGTH);
  }

  // Build highlights section, truncating to fit SMS limit
  const highlightPrefix = 'Your agents completed: ';
  const availableSpace = MAX_SMS_LENGTH - greeting.length - cta.length - highlightPrefix.length - 3; // 3 for spaces/periods

  let highlightText = highlights.join(', ');
  if (highlightText.length > availableSpace) {
    highlightText = highlightText.slice(0, availableSpace - 3) + '...';
  }

  const message = `${greeting} ${highlightPrefix}${highlightText}. ${cta}`;

  // Final safety truncation
  if (message.length > MAX_SMS_LENGTH) {
    return `${greeting} ${cta}`.slice(0, MAX_SMS_LENGTH);
  }

  return message;
}

/**
 * Welcome message for new SMS subscribers.
 *
 * @param founderName - First name of the founder
 * @returns SMS message body
 */
export function getWelcomeTemplate(founderName: string): string {
  return `Welcome to Sahara check-ins, ${founderName}! Every week we'll text you for a quick accountability check. Reply STOP to opt out.`.slice(
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
  return "You've been unsubscribed from Sahara check-ins. Text START to re-enable.";
}
