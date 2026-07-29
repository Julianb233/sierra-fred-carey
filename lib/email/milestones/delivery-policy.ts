import type { CustomerIoResult } from '@/lib/customerio';

/**
 * Customer.io is the primary milestone-email orchestrator.
 *
 * The legacy Resend path is only a delivery fallback when Customer.io did not
 * accept the canonical milestone event. This keeps one provider authoritative
 * per event while preserving delivery during provider/configuration failures.
 */
export function shouldSendLegacyMilestoneEmail(
  customerIoResult: CustomerIoResult,
): boolean {
  return !customerIoResult.success;
}
