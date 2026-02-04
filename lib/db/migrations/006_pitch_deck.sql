-- Pitch Deck Reviews table for AI-powered pitch deck analysis
CREATE TABLE IF NOT EXISTS pitch_deck_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL,
  file_name VARCHAR(255),
  slide_count INTEGER,
  overall_score INTEGER CHECK (overall_score >= 0 AND overall_score <= 100),
  category_scores JSONB,
  slide_analyses JSONB,
  suggestions TEXT[],
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'analyzing', 'completed', 'failed')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_pitch_deck_user ON pitch_deck_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_pitch_deck_status ON pitch_deck_reviews(status);
CREATE INDEX IF NOT EXISTS idx_pitch_deck_created ON pitch_deck_reviews(created_at DESC);

-- Trigger to update updated_at on pitch deck review updates
CREATE TRIGGER update_pitch_deck_reviews_updated_at
  BEFORE UPDATE ON pitch_deck_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
