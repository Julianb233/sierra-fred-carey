-- Migration: Add auth support to users table
-- Run: psql $DATABASE_URL -f lib/db/migrations/014_auth_users.sql

-- Add auth fields to users table if not exists, or create the table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  name VARCHAR(255),
  stage VARCHAR(50),
  challenges JSONB DEFAULT '[]',
  teammate_emails JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add password_hash column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'password_hash'
  ) THEN
    ALTER TABLE users ADD COLUMN password_hash VARCHAR(255);
  END IF;
END $$;

-- Create index for faster email lookup
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
