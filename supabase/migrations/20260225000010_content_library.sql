-- Migration: Content Library
-- Creates 5 tables for the course content system:
-- courses, modules, lessons, enrollments, content_progress
-- Phase 66: Content Library — Schema & Backend

-- ============================================================================
-- Table 1: courses
-- ============================================================================
CREATE TABLE IF NOT EXISTS courses (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT NOT NULL,
  description   TEXT NOT NULL DEFAULT '',
  slug          TEXT NOT NULL UNIQUE,
  thumbnail_url TEXT,
  stage         TEXT,
  topic         TEXT,
  tier_required TEXT NOT NULL DEFAULT 'free'
                CHECK (tier_required IN ('free', 'pro', 'studio')),
  is_published  BOOLEAN NOT NULL DEFAULT false,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- Table 2: modules
-- ============================================================================
CREATE TABLE IF NOT EXISTS modules (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id   UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- Table 3: lessons
-- ============================================================================
CREATE TABLE IF NOT EXISTS lessons (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id        UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  title            TEXT NOT NULL,
  description      TEXT NOT NULL DEFAULT '',
  sort_order       INTEGER NOT NULL DEFAULT 0,
  duration_seconds INTEGER,
  mux_upload_id    TEXT,
  mux_asset_id     TEXT,
  mux_playback_id  TEXT,
  mux_status       TEXT NOT NULL DEFAULT 'pending'
                   CHECK (mux_status IN ('pending', 'processing', 'ready', 'error')),
  is_preview       BOOLEAN NOT NULL DEFAULT false,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- Table 4: enrollments
-- ============================================================================
CREATE TABLE IF NOT EXISTS enrollments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id   UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, course_id)
);

-- ============================================================================
-- Table 5: content_progress
-- ============================================================================
CREATE TABLE IF NOT EXISTS content_progress (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id    UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  watched_pct  INTEGER NOT NULL DEFAULT 0 CHECK (watched_pct BETWEEN 0 AND 100),
  completed    BOOLEAN NOT NULL DEFAULT false,
  last_watched TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, lesson_id)
);

-- ============================================================================
-- Indexes
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_courses_published ON courses(is_published);
CREATE INDEX IF NOT EXISTS idx_courses_stage ON courses(stage);
CREATE INDEX IF NOT EXISTS idx_courses_topic ON courses(topic);
CREATE INDEX IF NOT EXISTS idx_modules_course_id ON modules(course_id);
CREATE INDEX IF NOT EXISTS idx_lessons_module_id ON lessons(module_id);
CREATE INDEX IF NOT EXISTS idx_lessons_mux_asset_id ON lessons(mux_asset_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_user_id ON enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_content_progress_user_id ON content_progress(user_id);

-- ============================================================================
-- RLS: courses
-- ============================================================================
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read published courses"
  ON courses FOR SELECT TO authenticated
  USING (is_published = true);

CREATE POLICY "Service role manages courses"
  ON courses FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ============================================================================
-- RLS: modules
-- ============================================================================
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read modules"
  ON modules FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Service role manages modules"
  ON modules FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ============================================================================
-- RLS: lessons
-- ============================================================================
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read lessons"
  ON lessons FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Service role manages lessons"
  ON lessons FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ============================================================================
-- RLS: enrollments
-- ============================================================================
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own enrollments"
  ON enrollments FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users create own enrollments"
  ON enrollments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role manages enrollments"
  ON enrollments FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ============================================================================
-- RLS: content_progress
-- ============================================================================
ALTER TABLE content_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own progress"
  ON content_progress FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users upsert own progress"
  ON content_progress FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role manages content_progress"
  ON content_progress FOR ALL TO service_role
  USING (true) WITH CHECK (true);
