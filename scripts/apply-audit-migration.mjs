import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Check if table exists first
const { data, error } = await supabase.from('ux_test_runs').select('id').limit(1)
if (!error) {
  console.log('Tables already exist!')
  process.exit(0)
}

if (error.code === '42P01') {
  console.log('Tables do not exist. Reading migration SQL...')
  const sql = readFileSync('supabase/migrations/20260311000001_ux_test_audit.sql', 'utf8')

  // Split into individual statements and execute
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'))

  for (const stmt of statements) {
    console.log(`Executing: ${stmt.substring(0, 60)}...`)
    const { error: execError } = await supabase.rpc('exec_sql', { query: stmt + ';' })
    if (execError) {
      console.log(`  Warning: ${execError.message}`)
    } else {
      console.log('  OK')
    }
  }

  // Verify
  const { error: verifyError } = await supabase.from('ux_test_runs').select('id').limit(1)
  if (verifyError) {
    console.log('Tables still missing. Need to apply via Supabase Dashboard SQL editor.')
    console.log('Copy-paste the migration file: supabase/migrations/20260311000001_ux_test_audit.sql')
  } else {
    console.log('Migration applied successfully!')
  }
} else {
  console.log('Unexpected error:', error.message)
}
