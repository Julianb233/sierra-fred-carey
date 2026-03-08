-- Phase 87: Pitch Deck Scoring — deck_score_reviews table
-- Stores AI-generated pitch deck scorecards for users

CREATE TABLE IF NOT EXISTS deck_score_reviews (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  scorecard jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_deck_score_reviews_user ON deck_score_reviews(user_id, created_at DESC);

ALTER TABLE deck_score_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own deck reviews" ON deck_score_reviews FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service inserts deck reviews" ON deck_score_reviews FOR INSERT WITH CHECK (true);
