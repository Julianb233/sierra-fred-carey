-- Migration: SMS Check-in Idempotency
-- Reliability fix: US-013
-- Created: 2026-02-25

-- Add unique constraint on message_sid to enable idempotent webhook handling.
-- Twilio may deliver the same webhook multiple times; this prevents duplicate rows.
-- NULL values are allowed (not all rows have a message_sid) and do not conflict.
CREATE UNIQUE INDEX IF NOT EXISTS idx_sms_checkins_message_sid_unique
  ON sms_checkins (message_sid)
  WHERE message_sid IS NOT NULL;
