/**
 * SMS Message Templates
 * Phase 04: Studio Tier Features - Plan 05
 * Phase 14: Fred Cary Voice Rewrite
 *
 * Message templates for weekly check-ins and lifecycle events.
 * All templates target under 160 characters (single SMS segment) where possible.
 */

const MAX_SMS_LENGTH = 160;

/**
 * Generate a personalized weekly check-in message.
 * Rotates between 3 Fred-voice variants for variety (deterministic based on name length).
 *
 * @param founderName - First name of the founder
 * @param highlights - Optional array of recent agent activity descriptions
 * @returns SMS message body (max 160 chars)
 */
export function getCheckinTemplate(
  founderName: string,
  highlights?: string[]
): string {
  // Fred's voice: motivational, direct, personal
  // Rotate messages for variety (deterministic based on name length)
  const messages = [
    `${founderName} -- it's Fred. What's your biggest win this week? Reply with your top 3 priorities.`,
    `Hey ${founderName}, Fred here. Quick check-in: what moved the needle this week? Top 3 priorities -- go.`,
    `${founderName}, how's the grind? Tell me your #1 win and your biggest blocker. --Fred`,
  ];

  if (!highlights || highlights.length === 0) {
    const index = founderName.length % messages.length;
    return messages[index].slice(0, MAX_SMS_LENGTH);
  }

  // With highlights, use a shorter base to leave room
  const base = `${founderName}, Fred here. Your agents finished: `;
  const cta = ' What are your priorities?';
  const availableSpace = MAX_SMS_LENGTH - base.length - cta.length;

  let highlightText = highlights.join(', ');
  if (highlightText.length > availableSpace) {
    highlightText = highlightText.slice(0, availableSpace - 3) + '...';
  }

  const message = `${base}${highlightText}.${cta}`;

  // Final safety truncation -- fall back to base message if highlights make it too long
  if (message.length > MAX_SMS_LENGTH) {
    const index = founderName.length % messages.length;
    return messages[index].slice(0, MAX_SMS_LENGTH);
  }

  return message;
}

/**
 * Welcome message for new SMS subscribers.
 * Identifies sender as Fred Cary with accountability framing.
 *
 * @param founderName - First name of the founder
 * @returns SMS message body (max 160 chars)
 */
export function getWelcomeTemplate(founderName: string): string {
  return `${founderName}, it's Fred Cary. I'll text you weekly for a quick accountability check. Think of me as your co-founder in your pocket. Reply STOP to opt out.`.slice(
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
