/**
 * Backfill canonical Sahara members into Customer.io.
 *
 * Default mode is read-only. Pass --apply to perform idempotent profile
 * upserts. Output is aggregate-only and never prints member PII.
 */

import { identifyCanonicalMember } from '../../lib/customerio/canonical-profile';
import { isCustomerIoConfigured } from '../../lib/customerio/client';
import { createServiceClient } from '../../lib/supabase/server';

const apply = process.argv.includes('--apply');
const PAGE_SIZE = 200;

async function main(): Promise<void> {
  if (!isCustomerIoConfigured()) {
    throw new Error('Customer.io is not configured');
  }

  const supabase = createServiceClient();
  let offset = 0;
  let discovered = 0;
  let eligible = 0;
  let skippedTest = 0;
  let missingCanonicalEmail = 0;
  let hydrated = 0;
  let failed = 0;

  for (;;) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email')
      .order('id')
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) throw new Error(`Supabase profile scan failed: ${error.message}`);
    if (!data || data.length === 0) break;

    discovered += data.length;
    for (const row of data) {
      const { data: authData, error: authError } =
        await supabase.auth.admin.getUserById(row.id);
      if (authError) {
        failed += 1;
        continue;
      }
      if (authData.user?.user_metadata?.is_test_account === true) {
        skippedTest += 1;
        continue;
      }
      if (!row.email && !authData.user?.email) {
        missingCanonicalEmail += 1;
        continue;
      }

      eligible += 1;
      if (apply) {
        const result = await identifyCanonicalMember(row.id);
        if (result.success) hydrated += 1;
        else if (!result.skipped) failed += 1;
      }
    }

    if (data.length < PAGE_SIZE) break;
    offset += data.length;
  }

  console.log(
    JSON.stringify({
      mode: apply ? 'apply' : 'dry-run',
      discovered,
      eligible,
      skippedTest,
      missingCanonicalEmail,
      hydrated,
      failed,
    }),
  );

  if (failed > 0) process.exitCode = 1;
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
