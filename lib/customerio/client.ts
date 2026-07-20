/**
 * Customer.io Track API — Client / Config Singleton
 *
 * AI-13316: Sahara member lifecycle email.
 *
 * Follows the project's lazy-init + graceful-degrade pattern (see
 * lib/email/client.ts, lib/analytics/server.ts): when the Customer.io
 * credentials are absent the client returns null and all callers no-op, so
 * dev/test/CI environments run without external credentials.
 *
 * Uses the raw Track API over fetch — no SDK dependency. Auth is HTTP Basic
 * with `site_id:track_api_key`. These are the *Track* credentials (not the
 * App/Bearer API key); keep them server-side only.
 */

import type { CustomerIoRegion } from './types';

export interface CustomerIoConfig {
  siteId: string;
  trackApiKey: string;
  region: CustomerIoRegion;
  /** Track API base URL for the configured region, no trailing slash. */
  baseUrl: string;
  /** Pre-computed `Authorization: Basic ...` header value. */
  authHeader: string;
}

/** Track API host per data-center region. */
const TRACK_HOSTS: Record<CustomerIoRegion, string> = {
  us: 'https://track.customer.io',
  eu: 'https://track-eu.customer.io',
};

let _config: CustomerIoConfig | null = null;
let _resolved = false;

function base64(input: string): string {
  // Node (server) has Buffer; guard for edge/runtime safety.
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(input, 'utf-8').toString('base64');
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g = globalThis as any;
  if (typeof g.btoa === 'function') return g.btoa(input);
  throw new Error('No base64 encoder available in this runtime');
}

function normalizeRegion(raw: string | undefined): CustomerIoRegion {
  return raw?.toLowerCase() === 'eu' ? 'eu' : 'us';
}

/**
 * Resolve the Customer.io config from environment.
 * Returns null when CUSTOMERIO_SITE_ID or CUSTOMERIO_TRACK_API_KEY is missing.
 *
 * Result is memoized. Pass `force` to re-read env (used in tests).
 */
export function getCustomerIoConfig(force = false): CustomerIoConfig | null {
  if (_resolved && !force) return _config;

  const siteId = process.env.CUSTOMERIO_SITE_ID;
  const trackApiKey = process.env.CUSTOMERIO_TRACK_API_KEY;

  if (!siteId || !trackApiKey) {
    _config = null;
    _resolved = true;
    return null;
  }

  const region = normalizeRegion(process.env.CUSTOMERIO_REGION);
  _config = {
    siteId,
    trackApiKey,
    region,
    baseUrl: TRACK_HOSTS[region],
    authHeader: `Basic ${base64(`${siteId}:${trackApiKey}`)}`,
  };
  _resolved = true;
  return _config;
}

/** True when Customer.io credentials are present. */
export function isCustomerIoConfigured(): boolean {
  return getCustomerIoConfig() !== null;
}

/** Reset the memoized config. Test-only helper. */
export function __resetCustomerIoConfig(): void {
  _config = null;
  _resolved = false;
}
