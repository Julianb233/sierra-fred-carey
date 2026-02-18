import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load env vars
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function createTestUser() {
  const email = 'test-dev@joinsahara.com';
  const password = 'TestPassword123!';

  console.log('Creating user in Supabase Auth...');

  // Delete existing test user if present
  const { data: existingUsers } = await supabase.auth.admin.listUsers();
  const existing = existingUsers?.users?.find(u => u.email === email);
  if (existing) {
    console.log('Deleting existing test user:', existing.id);
    await supabase.auth.admin.deleteUser(existing.id);
  }

  // Create the user
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      name: 'Test Dev User',
    }
  });

  if (error) {
    console.error('ERROR creating user:', error);
    process.exit(1);
  }

  console.log('User created:', data.user.id, data.user.email);
  console.log('Email confirmed:', data.user.email_confirmed_at);

  // Create profile
  const { error: profileError } = await supabase.from('profiles').upsert({
    id: data.user.id,
    email: email,
    name: 'Test Dev User',
    stage: 'idea',
    challenges: ['fundraising'],
    teammate_emails: [],
    tier: 0,
    onboarding_completed: false,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'id' });

  if (profileError) {
    console.error('ERROR creating profile:', profileError);
    process.exit(1);
  }

  console.log('Profile created successfully');

  // Verify in DB
  const { data: profile, error: fetchError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', data.user.id)
    .single();

  if (fetchError) {
    console.error('ERROR fetching profile:', fetchError);
    process.exit(1);
  }

  console.log('\n=== USER CREATED AND VERIFIED ===');
  console.log('Auth User ID:', data.user.id);
  console.log('Email:', data.user.email);
  console.log('Email Confirmed:', !!data.user.email_confirmed_at);
  console.log('Profile:', JSON.stringify(profile, null, 2));
  console.log('\nLogin credentials:');
  console.log('  Email:', email);
  console.log('  Password:', password);
}

createTestUser().catch(console.error);
