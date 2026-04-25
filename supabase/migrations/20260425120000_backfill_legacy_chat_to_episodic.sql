-- Backfill legacy chat into fred_episodic_memory so /api/fred/history + FRED continuity
-- match pre-Supabase / pre-episodic behavior (chat_messages + funnel_sessions).
-- Idempotent: ON CONFLICT (user_id, session_id, content_hash) DO NOTHING.
--
-- Sources:
--   1) public.chat_messages (Next app / early Postgres chat)
--   2) public.funnel_sessions.chat_messages (JSON array from you.joinsahara funnel sync)

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;

-- ---------------------------------------------------------------------------
-- 1) Platform chat_messages -> episodic (conversation rows)
-- ---------------------------------------------------------------------------
INSERT INTO public.fred_episodic_memory (
  user_id,
  session_id,
  event_type,
  content,
  content_hash,
  importance_score,
  created_at,
  metadata,
  channel
)
SELECT
  cm.user_id::uuid,
  CASE
    WHEN cm.session_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      THEN TRIM(cm.session_id)::uuid
    ELSE extensions.uuid_generate_v5(
      '6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid,
      cm.user_id || '|' || COALESCE(NULLIF(TRIM(cm.session_id), ''), 'legacy')
    )
  END,
  'conversation',
  jsonb_build_object('role', cm.role, 'content', cm.content),
  md5(concat('conversation:', cm.role::text, ':', cm.content::text)),
  0.35::double precision,
  COALESCE(cm.created_at::timestamptz, now()),
  jsonb_build_object('source', 'legacy_chat_messages_backfill'),
  'chat'
FROM public.chat_messages cm
WHERE cm.role IN ('user', 'assistant')
  AND LENGTH(TRIM(cm.content)) > 0
  AND cm.user_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
ON CONFLICT (user_id, session_id, content_hash)
  WHERE content_hash IS NOT NULL
DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2) Funnel JSON chat history -> episodic (one deterministic UUID per funnel session_id)
-- ---------------------------------------------------------------------------
INSERT INTO public.fred_episodic_memory (
  user_id,
  session_id,
  event_type,
  content,
  content_hash,
  importance_score,
  created_at,
  metadata,
  channel
)
SELECT
  fs.migrated_to_user_id,
  extensions.uuid_generate_v5(
    '6ba7b811-9dad-11d1-80b4-00c04fd430c8'::uuid,
    fs.session_id
  ),
  'conversation',
  jsonb_build_object(
    'role',
    elem->>'role',
    'content',
    elem->>'content',
    'source',
    'funnel'
  ),
  md5(
    concat(
      'conversation:',
      COALESCE(elem->>'role', ''),
      ':',
      COALESCE(elem->>'content', '')
    )
  ),
  0.35::double precision,
  COALESCE(fs.last_synced_at, fs.created_at, now()),
  jsonb_build_object('source', 'funnel_sessions_backfill', 'funnel_session_id', fs.session_id),
  'chat'
FROM public.funnel_sessions fs
CROSS JOIN LATERAL jsonb_array_elements(
  CASE
    WHEN jsonb_typeof(fs.chat_messages) = 'array' THEN fs.chat_messages
    ELSE '[]'::jsonb
  END
) AS elem
WHERE fs.migrated_to_user_id IS NOT NULL
  AND COALESCE(elem->>'role', '') IN ('user', 'assistant')
  AND LENGTH(TRIM(COALESCE(elem->>'content', ''))) > 0
ON CONFLICT (user_id, session_id, content_hash)
  WHERE content_hash IS NOT NULL
DO NOTHING;
