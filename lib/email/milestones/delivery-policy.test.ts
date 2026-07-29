import { describe, expect, it } from 'vitest';
import { shouldSendLegacyMilestoneEmail } from './delivery-policy';

describe('shouldSendLegacyMilestoneEmail', () => {
  it('does not send through Resend after Customer.io accepts the event', () => {
    expect(shouldSendLegacyMilestoneEmail({ success: true, status: 200 })).toBe(false);
  });

  it.each([
    { success: false, skipped: true, error: 'Customer.io not configured' },
    { success: false, status: 401, error: 'Unauthorized' },
    { success: false, error: 'Network failure' },
  ])('uses Resend as a fallback when Customer.io does not accept the event', (result) => {
    expect(shouldSendLegacyMilestoneEmail(result)).toBe(true);
  });
});
