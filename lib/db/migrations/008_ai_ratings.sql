-- AI Ratings table for user feedback on AI responses
-- Supports thumbs up/down and 1-5 star ratings with optional feedback

CREATE TABLE IF NOT EXISTS ai_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id UUID NOT NULL REFERENCES ai_responses(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  session_id TEXT, -- For anonymous ratings if user_id is null

  -- Rating configuration
  rating_type TEXT NOT NULL CHECK (rating_type IN ('thumbs', 'stars')),
  rating_value INTEGER NOT NULL,
  -- For thumbs: -1 (down), 1 (up)
  -- For stars: 1-5

  -- Feedback tags
  feedback_tags TEXT[] NOT NULL DEFAULT '{}',
  -- Supported tags: 'helpful', 'accurate', 'unclear', 'wrong', 'incomplete'

  -- Optional text feedback
  feedback_text TEXT,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_thumbs_rating CHECK (
    rating_type != 'thumbs' OR rating_value IN (-1, 1)
  ),
  CONSTRAINT valid_stars_rating CHECK (
    rating_type != 'stars' OR (rating_value >= 1 AND rating_value <= 5)
  ),
  CONSTRAINT valid_feedback_tags CHECK (
    feedback_tags <@ ARRAY['helpful', 'accurate', 'unclear', 'wrong', 'incomplete']::TEXT[]
  ),
  -- Ensure either user_id or session_id is present
  CONSTRAINT user_or_session CHECK (
    user_id IS NOT NULL OR session_id IS NOT NULL
  )
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_ratings_response_id ON ai_ratings(response_id);
CREATE INDEX IF NOT EXISTS idx_ai_ratings_user_id ON ai_ratings(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_ratings_session_id ON ai_ratings(session_id);
CREATE INDEX IF NOT EXISTS idx_ai_ratings_created_at ON ai_ratings(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_ratings_rating_type ON ai_ratings(rating_type);
CREATE INDEX IF NOT EXISTS idx_ai_ratings_rating_value ON ai_ratings(rating_value);
-- GIN index for array operations on feedback_tags
CREATE INDEX IF NOT EXISTS idx_ai_ratings_feedback_tags ON ai_ratings USING GIN(feedback_tags);

-- Trigger to update updated_at on rating updates
CREATE TRIGGER update_ai_ratings_updated_at
  BEFORE UPDATE ON ai_ratings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE ai_ratings ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can view all ratings for AI responses they can access
CREATE POLICY "Users can view ratings for accessible responses"
  ON ai_ratings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM ai_responses r
      JOIN ai_requests req ON r.request_id = req.id
      WHERE r.id = ai_ratings.response_id
      AND req.user_id = auth.uid()
    )
  );

-- Users can create ratings for responses they can access
CREATE POLICY "Users can create ratings for accessible responses"
  ON ai_ratings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM ai_responses r
      JOIN ai_requests req ON r.request_id = req.id
      WHERE r.id = response_id
      AND req.user_id = auth.uid()
    )
    AND user_id = auth.uid()
  );

-- Users can update their own ratings
CREATE POLICY "Users can update own ratings"
  ON ai_ratings FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own ratings
CREATE POLICY "Users can delete own ratings"
  ON ai_ratings FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Anonymous users can create ratings with session_id
CREATE POLICY "Anonymous users can create ratings with session"
  ON ai_ratings FOR INSERT
  TO anon
  WITH CHECK (
    user_id IS NULL
    AND session_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM ai_responses
      WHERE ai_responses.id = response_id
    )
  );

-- Create a view for rating analytics
CREATE OR REPLACE VIEW ai_rating_analytics AS
SELECT
  r.response_id,
  req.analyzer,
  COUNT(*) as total_ratings,
  COUNT(*) FILTER (WHERE r.rating_type = 'thumbs') as thumbs_count,
  COUNT(*) FILTER (WHERE r.rating_type = 'stars') as stars_count,
  COUNT(*) FILTER (WHERE r.rating_type = 'thumbs' AND r.rating_value = 1) as thumbs_up,
  COUNT(*) FILTER (WHERE r.rating_type = 'thumbs' AND r.rating_value = -1) as thumbs_down,
  ROUND(AVG(r.rating_value) FILTER (WHERE r.rating_type = 'stars'), 2) as avg_stars,
  COUNT(*) FILTER (WHERE 'helpful' = ANY(r.feedback_tags)) as helpful_count,
  COUNT(*) FILTER (WHERE 'accurate' = ANY(r.feedback_tags)) as accurate_count,
  COUNT(*) FILTER (WHERE 'unclear' = ANY(r.feedback_tags)) as unclear_count,
  COUNT(*) FILTER (WHERE 'wrong' = ANY(r.feedback_tags)) as wrong_count,
  COUNT(*) FILTER (WHERE 'incomplete' = ANY(r.feedback_tags)) as incomplete_count,
  COUNT(*) FILTER (WHERE r.feedback_text IS NOT NULL AND r.feedback_text != '') as text_feedback_count
FROM ai_ratings r
JOIN ai_responses res ON r.response_id = res.id
JOIN ai_requests req ON res.request_id = req.id
GROUP BY r.response_id, req.analyzer;

-- Grant select on the analytics view to authenticated users
GRANT SELECT ON ai_rating_analytics TO authenticated;

-- Comments for documentation
COMMENT ON TABLE ai_ratings IS 'User feedback ratings for AI responses, supporting thumbs up/down and 1-5 star ratings with optional tags and text feedback';
COMMENT ON COLUMN ai_ratings.rating_type IS 'Type of rating: thumbs (up/down) or stars (1-5)';
COMMENT ON COLUMN ai_ratings.rating_value IS 'Rating value: -1/1 for thumbs, 1-5 for stars';
COMMENT ON COLUMN ai_ratings.feedback_tags IS 'Array of feedback tags: helpful, accurate, unclear, wrong, incomplete';
COMMENT ON COLUMN ai_ratings.feedback_text IS 'Optional text feedback from user';
COMMENT ON COLUMN ai_ratings.session_id IS 'Session identifier for anonymous ratings';
