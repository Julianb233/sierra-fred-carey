/**
 * Customer.io reporting webhook.
 *
 * The endpoint stores only redacted delivery evidence. It never stores
 * recipients, message bodies, email addresses, phone numbers, or credentials.
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import {
  buildCustomerIoReportingRecord,
  parseCustomerIoReportingPayload,
  recordCustomerIoReportingEvent,
  verifyCustomerIoReportingSignature,
} from '@/lib/customerio/reporting-webhook';

export const dynamic = 'force-dynamic';
export const maxDuration = 10;

const LOG_PREFIX = '[Webhook: Customer.io]';

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const timestamp = request.headers.get('x-cio-timestamp');
  const signature = request.headers.get('x-cio-signature');

  if (!verifyCustomerIoReportingSignature(rawBody, timestamp, signature)) {
    logger.warn(`${LOG_PREFIX} Invalid signature`);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const payload = parseCustomerIoReportingPayload(body);
  if (!payload) {
    return NextResponse.json({ error: 'Invalid reporting event' }, { status: 422 });
  }

  try {
    const record = buildCustomerIoReportingRecord(payload);
    const result = await recordCustomerIoReportingEvent(record);
    logger.info(`${LOG_PREFIX} Event accepted`, {
      eventId: result.eventId,
      metric: record.metric,
      objectType: record.object_type,
      duplicate: result.duplicate,
    });
    return NextResponse.json({
      ok: true,
      duplicate: result.duplicate,
      eventId: result.eventId,
    });
  } catch (error) {
    logger.error(`${LOG_PREFIX} Evidence write failed`, {
      error: error instanceof Error ? error.message : String(error),
    });
    // Customer.io retries non-2xx responses with exponential backoff.
    return NextResponse.json({ error: 'Temporary failure' }, { status: 503 });
  }
}
