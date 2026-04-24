import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

// Load env
for (const line of readFileSync('.env.local','utf-8').split('\n')) {
  const m = line.match(/^(NEXT_PUBLIC_SUPABASE_URL|SUPABASE_SERVICE_ROLE_KEY|NEXT_PUBLIC_SITE_URL)=(.*)$/);
  if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g,'').trim();
}

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.joinsahara.com';
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

const dryRun = process.argv.includes('--dry-run');
const realOnly = process.argv.includes('--real-only'); // skip obvious test accounts

const TEST_PATTERNS = [/test/i, /example\.com$/i, /^gg@g/i, /^dev@/i, /browser\./i, /ux-test/i];
const isTest = (e) => TEST_PATTERNS.some(p => p.test(e));

(async () => {
  const { data: profiles, error } = await db.from('profiles').select('id, email').eq('enrichment_source','firebase_migration_2026_04_21');
  if (error) throw error;

  let page=1, all=[];
  while (true) {
    const { data } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    all = all.concat(data.users);
    if (data.users.length < 1000) break;
    page++;
  }
  const byId = new Map(all.map(u=>[u.id,u]));
  const migrated = profiles.map(p => byId.get(p.id)).filter(Boolean);
  const never = migrated.filter(u => !u.last_sign_in_at);
  const targets = realOnly ? never.filter(u => u.email && !isTest(u.email)) : never;

  console.log(`migrated=${migrated.length} never_signed_in=${never.length} target=${targets.length} dry_run=${dryRun}`);
  console.log('targets:');
  targets.forEach(u => console.log('  ', u.email));
  if (dryRun) { console.log('\ndry run — no emails sent'); return; }

  let ok=0, err=0;
  for (const u of targets) {
    const { error } = await db.auth.admin.generateLink({
      type: 'recovery',
      email: u.email,
      options: { redirectTo: `${SITE}/api/auth/callback?next=/reset-password` },
    });
    if (error) { console.error(' fail', u.email, error.message); err++; }
    else { ok++; }
    await new Promise(r=>setTimeout(r,250)); // throttle ~4/sec
  }
  console.log(`\nsent=${ok} failed=${err}`);
})();
