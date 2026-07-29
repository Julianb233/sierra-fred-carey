export type LifecycleDeliveryMode = 'direct' | 'customerio';

/**
 * Customer.io cutovers fail closed to the existing direct provider.
 *
 * A typo, blank value, or missing deployment variable must never silently
 * disable the current Resend/Twilio delivery path.
 */
export function resolveLifecycleDeliveryMode(
  value: string | undefined,
): LifecycleDeliveryMode {
  return value?.trim().toLowerCase() === 'customerio'
    ? 'customerio'
    : 'direct';
}
