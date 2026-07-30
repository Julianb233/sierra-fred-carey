import { describe, expect, it } from 'vitest';
import { parseAcquisitionAttribution } from './attribution';

describe('acquisition attribution', () => {
  it('captures approved Meta, Reddit, Google, referral, and UTM fields', () => {
    expect(
      parseAcquisitionAttribution(
        '?utm_source=reddit&utm_medium=paid&utm_campaign=launch&utm_content=founders&utm_term=startups&ref=fred&gclid=g-1&fbclid=f-1&rdt_cid=r-1',
        '/start-now',
        'https://www.reddit.com/r/startups',
      ),
    ).toEqual({
      source: 'reddit',
      ref: 'fred',
      utmSource: 'reddit',
      utmMedium: 'paid',
      utmCampaign: 'launch',
      utmContent: 'founders',
      utmTerm: 'startups',
      gclid: 'g-1',
      fbclid: 'f-1',
      redditClickId: 'r-1',
      landingPath: '/start-now',
      referrerHost: 'www.reddit.com',
    });
  });

  it('ignores unknown parameters and does not retain the referrer path', () => {
    const result = parseAcquisitionAttribution(
      '?email=person@example.com&phone=5551234567',
      '/start-now',
      'https://example.com/private/person@example.com',
    );
    expect(result.source).toBe('start-now');
    expect(result.referrerHost).toBe('example.com');
    expect(JSON.stringify(result)).not.toContain('person@example.com');
    expect(JSON.stringify(result)).not.toContain('5551234567');
    expect(JSON.stringify(result)).not.toContain('/private/');
  });

  it('fails closed for control characters and bounds campaign values', () => {
    const result = parseAcquisitionAttribution(
      `?source=${encodeURIComponent('bad\u0000value')}&utm_campaign=${'a'.repeat(300)}`,
      '/start-now',
    );
    expect(result.source).toBe('start-now');
    expect(result.utmCampaign).toHaveLength(256);
  });
});
