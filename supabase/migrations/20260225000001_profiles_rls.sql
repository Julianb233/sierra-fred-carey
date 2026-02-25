-- Enable Row Level Security on the profiles table and add policies
-- so that authenticated users can only read and update their own row.
-- The service_role key bypasses RLS automatically in Supabase.

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can view own profile"
  ON profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  USING (auth.uid() = id);
