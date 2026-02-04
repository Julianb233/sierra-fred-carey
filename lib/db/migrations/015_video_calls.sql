-- Video Calls Migration
-- Stores video call sessions and participants

-- Video call rooms
CREATE TABLE IF NOT EXISTS video_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_name VARCHAR(255) NOT NULL UNIQUE,
  title VARCHAR(500),
  description TEXT,
  host_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  status VARCHAR(50) DEFAULT 'scheduled', -- scheduled, active, ended
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  max_participants INT DEFAULT 10,
  is_recording_enabled BOOLEAN DEFAULT false,
  recording_url TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Video call participants
CREATE TABLE IF NOT EXISTS video_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES video_rooms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  participant_name VARCHAR(255) NOT NULL,
  participant_identity VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'participant', -- host, co-host, participant, viewer
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  left_at TIMESTAMPTZ,
  duration_seconds INT,
  connection_quality VARCHAR(50), -- excellent, good, poor
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Video call chat messages (in-call chat)
CREATE TABLE IF NOT EXISTS video_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES video_rooms(id) ON DELETE CASCADE,
  participant_id UUID REFERENCES video_participants(id) ON DELETE SET NULL,
  message TEXT NOT NULL,
  message_type VARCHAR(50) DEFAULT 'text', -- text, system, reaction
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_video_rooms_status ON video_rooms(status);
CREATE INDEX IF NOT EXISTS idx_video_rooms_host ON video_rooms(host_user_id);
CREATE INDEX IF NOT EXISTS idx_video_rooms_scheduled ON video_rooms(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_video_participants_room ON video_participants(room_id);
CREATE INDEX IF NOT EXISTS idx_video_participants_user ON video_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_video_chat_room ON video_chat_messages(room_id);

-- Update trigger for video_rooms
CREATE OR REPLACE FUNCTION update_video_rooms_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS video_rooms_updated_at ON video_rooms;
CREATE TRIGGER video_rooms_updated_at
  BEFORE UPDATE ON video_rooms
  FOR EACH ROW
  EXECUTE FUNCTION update_video_rooms_updated_at();
