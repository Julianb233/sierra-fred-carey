/**
 * Privacy-bounded acquisition attribution.
 *
 * Capture only campaign identifiers needed to measure the acquisition funnel.
 * Unknown query parameters, emails, phone numbers, and arbitrary page content
 * are deliberately ignored.
 */

export interface AcquisitionAttribution {
  source: string;
  ref: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  utmTerm: string | null;
  gclid: string | null;
  fbclid: string | null;
  redditClickId: string | null;
  landingPath: string;
  referrerHost: string | null;
}

const MAX_VALUE_LENGTH = 256;

function safeValue(value: string | null): string | null {
  if (!value) return null;
  const normalized = value.trim().slice(0, MAX_VALUE_LENGTH);
  if (!normalized || /[\u0000-\u001f\u007f]/.test(normalized)) return null;
  return normalized;
}

function safeReferrerHost(referrer: string | undefined): string | null {
  if (!referrer) return null;
  try {
    return new URL(referrer).hostname.slice(0, MAX_VALUE_LENGTH) || null;
  } catch {
    return null;
  }
}

export function parseAcquisitionAttribution(
  search: string,
  pathname: string,
  referrer?: string,
): AcquisitionAttribution {
  const params = new URLSearchParams(search);
  const utmSource = safeValue(params.get('utm_source'));
  return {
    source:
      safeValue(params.get('source')) ??
      utmSource ??
      safeValue(params.get('ref')) ??
      'start-now',
    ref: safeValue(params.get('ref')),
    utmSource,
    utmMedium: safeValue(params.get('utm_medium')),
    utmCampaign: safeValue(params.get('utm_campaign')),
    utmContent: safeValue(params.get('utm_content')),
    utmTerm: safeValue(params.get('utm_term')),
    gclid: safeValue(params.get('gclid')),
    fbclid: safeValue(params.get('fbclid')),
    redditClickId:
      safeValue(params.get('rdt_cid')) ?? safeValue(params.get('rdt_click_id')),
    landingPath: pathname.slice(0, MAX_VALUE_LENGTH),
    referrerHost: safeReferrerHost(referrer),
  };
}
