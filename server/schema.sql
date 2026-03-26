CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nickname VARCHAR(100) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'player' CHECK (role IN ('player', 'moderator', 'admin')),
  country_code VARCHAR(10) DEFAULT '',
  avatar_url TEXT DEFAULT '',
  bio_ru TEXT DEFAULT '',
  bio_en TEXT DEFAULT '',
  is_banned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token VARCHAR(64) UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS levels (
  id VARCHAR(255) PRIMARY KEY,
  rank INTEGER NOT NULL,
  segment VARCHAR(20) DEFAULT 'main',
  name VARCHAR(255) NOT NULL,
  creator VARCHAR(255) NOT NULL,
  creator_id UUID REFERENCES users(id) ON DELETE SET NULL,
  verifier VARCHAR(255) NOT NULL,
  verifier_id UUID REFERENCES users(id) ON DELETE SET NULL,
  original_name VARCHAR(255),
  description_ru TEXT DEFAULT '',
  description_en TEXT DEFAULT '',
  similarity INTEGER DEFAULT 80,
  is_new BOOLEAN DEFAULT TRUE,
  nerfed_level_id VARCHAR(100),
  original_level_id VARCHAR(100),
  original_placement VARCHAR(100),
  password VARCHAR(100) DEFAULT 'Free Copy',
  length VARCHAR(50) DEFAULT 'Unknown',
  objects VARCHAR(50) DEFAULT 'Unknown',
  version VARCHAR(20) DEFAULT '2.2',
  song_url TEXT DEFAULT '',
  verification_url TEXT NOT NULL,
  youtube_id VARCHAR(30),
  gd_browser_url TEXT,
  thumbnail_url TEXT,
  score_100 VARCHAR(20) DEFAULT '0',
  score_progress VARCHAR(20) DEFAULT '0',
  required_progress VARCHAR(10) DEFAULT '0%',
  min_progress NUMERIC DEFAULT NULL,
  min_progress_score NUMERIC DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_levels_rank ON levels(rank);

CREATE TABLE IF NOT EXISTS records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level_id VARCHAR(255) NOT NULL REFERENCES levels(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  player VARCHAR(255) NOT NULL,
  progress VARCHAR(20) NOT NULL,
  video_url TEXT,
  date TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_records_level ON records(level_id);
CREATE INDEX IF NOT EXISTS idx_records_user ON records(user_id);

CREATE TABLE IF NOT EXISTS level_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level_id VARCHAR(255) NOT NULL REFERENCES levels(id) ON DELETE CASCADE,
  rank INTEGER,
  note_ru TEXT,
  note_en TEXT,
  date TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_history_level ON level_history(level_id);
ALTER TABLE level_history ADD COLUMN IF NOT EXISTS change_type VARCHAR(20);
ALTER TABLE level_history ADD COLUMN IF NOT EXISTS above_id VARCHAR(255);
ALTER TABLE level_history ADD COLUMN IF NOT EXISTS above_name VARCHAR(255);
ALTER TABLE level_history ADD COLUMN IF NOT EXISTS below_id VARCHAR(255);
ALTER TABLE level_history ADD COLUMN IF NOT EXISTS below_name VARCHAR(255);

CREATE TABLE IF NOT EXISTS submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(20) NOT NULL CHECK (type IN ('record', 'level')),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'banned')),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  player VARCHAR(255) NOT NULL,
  country_code VARCHAR(10),
  level_id VARCHAR(255) REFERENCES levels(id) ON DELETE SET NULL,
  level_name VARCHAR(255),
  original_name VARCHAR(255),
  progress VARCHAR(100),
  raw_url TEXT,
  video_url TEXT,
  notes TEXT DEFAULT '',
  moderation_note TEXT DEFAULT '',
  reviewed_by VARCHAR(255),
  original_placement VARCHAR(100),
  similarity INTEGER,
  preview_image_url TEXT,
  verifier_nickname VARCHAR(255),
  nerfed_level_id VARCHAR(100),
  original_level_id VARCHAR(100),
  password VARCHAR(100),
  length VARCHAR(50),
  objects VARCHAR(50),
  version VARCHAR(20),
  song_url TEXT,
  verification_url TEXT,
  description_ru TEXT,
  description_en TEXT,
  creator_nickname VARCHAR(255),
  segment VARCHAR(20),
  thumbnail_data TEXT,
  min_progress NUMERIC,
  min_progress_score NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_submissions_user ON submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status);

CREATE TABLE IF NOT EXISTS rules (
  id VARCHAR(100) PRIMARY KEY,
  title_ru TEXT NOT NULL,
  title_en TEXT NOT NULL,
  body_ru TEXT NOT NULL,
  body_en TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS rule_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id VARCHAR(100) NOT NULL REFERENCES rules(id) ON DELETE CASCADE,
  text_ru TEXT NOT NULL,
  text_en TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS site_settings (
  key VARCHAR(100) PRIMARY KEY,
  value TEXT
);
