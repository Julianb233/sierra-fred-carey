-- AI-2273: Remove dead prompt_patches definition from Phase 76 fewshot migration
-- The prompt_patches table was already created by 20260309100001_prompt_patches.sql
-- with the correct schema (patch_type, tracking columns, etc.)
-- The duplicate CREATE TABLE IF NOT EXISTS in 20260310000001 is a no-op but
-- documents a conflicting schema that confuses developers.
--
-- This migration is a no-op marker. The actual fix is documented in the audit:
-- - 20260309100001 defines the authoritative schema (patch_type, tracking_started_at, etc.)
-- - 20260310000001's prompt_patches block should be removed in a code cleanup
-- - The fewshot_examples table from 20260310000001 is correct and unaffected

-- No SQL changes needed - this is a documentation-only migration
SELECT 1;
