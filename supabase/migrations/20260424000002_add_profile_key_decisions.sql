-- Add profiles.key_decisions text column so persistMemoryUpdates can store
-- chat-extracted "key_decisions" values for Free/Builder tier users
-- (Pro+ already persists via semantic memory).
--
-- Without this column, key_decisions extracted from conversation was silently
-- dropped for Free/Builder tier, causing FRED to re-ask the same question
-- every turn (one of the loop modes reported by Fred Cary).
--
-- See lib/fred/active-memory.ts PROFILE_COLUMN_MAP and the buildActiveFounderMemory
-- read block for the corresponding read path.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS key_decisions TEXT;
