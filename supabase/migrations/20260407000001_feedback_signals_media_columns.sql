-- Phase: Add image/media processing to feedback pipeline (AI-4115)
-- Adds media attachment fields and vision analysis to feedback_signals

ALTER TABLE feedback_signals
  ADD COLUMN IF NOT EXISTS media_urls TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS media_types TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS vision_analysis JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS media_processing_status TEXT NOT NULL DEFAULT 'none'
    CHECK (media_processing_status IN ('none', 'pending', 'processing', 'completed', 'failed'));

-- Index for finding signals that need vision processing
CREATE INDEX IF NOT EXISTS idx_feedback_signals_media_processing
  ON feedback_signals (media_processing_status)
  WHERE media_processing_status IN ('pending', 'processing');

-- Partial index for signals that have media attachments
CREATE INDEX IF NOT EXISTS idx_feedback_signals_has_media
  ON feedback_signals (created_at DESC)
  WHERE array_length(media_urls, 1) > 0;

COMMENT ON COLUMN feedback_signals.media_urls IS 'Array of URLs to attached images/screenshots/media';
COMMENT ON COLUMN feedback_signals.media_types IS 'Parallel array of media types: image, screenshot, video, audio';
COMMENT ON COLUMN feedback_signals.vision_analysis IS 'JSON output from vision API analysis of attached media';
COMMENT ON COLUMN feedback_signals.media_processing_status IS 'none=no media, pending=awaiting analysis, processing=in progress, completed=done, failed=error';
