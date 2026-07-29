import { describe, expect, it } from 'vitest';
import { resolveLifecycleDeliveryMode } from './delivery-cutover';

describe('resolveLifecycleDeliveryMode', () => {
  it('keeps the existing direct provider when the variable is absent', () => {
    expect(resolveLifecycleDeliveryMode(undefined)).toBe('direct');
  });

  it('only cuts over for an explicit customerio value', () => {
    expect(resolveLifecycleDeliveryMode('customerio')).toBe('customerio');
    expect(resolveLifecycleDeliveryMode(' CustomerIO ')).toBe('customerio');
  });

  it('fails closed to direct delivery for unknown values', () => {
    expect(resolveLifecycleDeliveryMode('enabled')).toBe('direct');
    expect(resolveLifecycleDeliveryMode('true')).toBe('direct');
  });
});
