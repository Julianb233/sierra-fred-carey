-- Fix admin_read_audit RLS policy: profiles table has no 'role' column.
-- Admin access to fred_audit_log is done via service client (bypasses RLS),
-- so replace the broken policy with a simple service_role-based policy.

DROP POLICY IF EXISTS "admin_read_audit" ON fred_audit_log;

-- Service role can read all (admin API routes use service client)
CREATE POLICY "service_read_all_audit" ON fred_audit_log
  FOR SELECT USING (auth.role() = 'service_role');
