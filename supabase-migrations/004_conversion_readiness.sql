-- Migration: conversion_readiness columns on conversation_summaries (AI-3526)
--
-- Adds the conversion prioritizer's output to the per-founder summary so the
-- team-facing queues can rank free founders by how ready they are to convert
-- within Sahara's gated progression model (free Discovery -> paid tiers).
--
-- Written by lib/ai/conversation-summarizer.ts (saveSummary, via a guarded
-- UPDATE) using lib/sales/conversion-prioritizer.ts. Read by
-- getPrioritizedQueues -> app/api/admin/conversation-priorities.
--
-- Additive + idempotent: existing rows keep NULLs until the next cron run
-- re-summarizes them, and saveSummary degrades gracefully if this migration
-- has not been applied yet.

ALTER TABLE conversation_summaries
  ADD COLUMN IF NOT EXISTS conversion_readiness INTEGER,   -- 0-100, higher = hotter to convert
  ADD COLUMN IF NOT EXISTS progression_stage TEXT;         -- discovery|activated|evaluating|ready|converted

-- Conversion queue scan: hottest free->paid candidates first, excluding
-- founders already on a paid tier (progression_stage = 'converted').
CREATE INDEX IF NOT EXISTS idx_conv_summaries_conversion
  ON conversation_summaries (conversion_readiness DESC, created_at DESC)
  WHERE progression_stage IS NOT NULL AND progression_stage <> 'converted';
