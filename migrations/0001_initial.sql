-- ModAB Auto-Blog Platform – Initial Schema
-- Migration: 0001_initial.sql

CREATE TABLE IF NOT EXISTS config (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS articles (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  title            TEXT    NOT NULL,
  slug             TEXT    UNIQUE NOT NULL,
  excerpt          TEXT,
  content          TEXT    NOT NULL,
  raw_markdown     TEXT,
  primary_keyword  TEXT,
  keywords         TEXT,
  meta_description TEXT,
  schema_json      TEXT,
  cover_image_url  TEXT,
  images           TEXT,
  video_url        TEXT,
  affiliate_links  TEXT,
  word_count       INTEGER,
  read_time        INTEGER,
  status           TEXT    DEFAULT 'draft',
  is_premium       INTEGER DEFAULT 0,
  view_count       INTEGER DEFAULT 0,
  published_at     TEXT,
  created_at       TEXT    DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS affiliates (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  name             TEXT    NOT NULL,
  network          TEXT    NOT NULL,
  affiliate_id     TEXT,
  base_url         TEXT    NOT NULL,
  tracking_params  TEXT,
  niche_keywords   TEXT,
  click_count      INTEGER DEFAULT 0,
  active           INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS analytics (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  article_id   INTEGER REFERENCES articles(id) ON DELETE SET NULL,
  event        TEXT    NOT NULL,
  affiliate_id INTEGER REFERENCES affiliates(id) ON DELETE SET NULL,
  amount_cents INTEGER,
  ip_hash      TEXT,
  created_at   TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS content_calendar (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  scheduled_date TEXT    NOT NULL,
  title          TEXT    NOT NULL,
  primary_keyword TEXT,
  content_angle  TEXT,
  target_affiliate TEXT,
  status         TEXT    DEFAULT 'planned',
  article_id     INTEGER REFERENCES articles(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS premium_access (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  article_id       INTEGER REFERENCES articles(id) ON DELETE CASCADE,
  email            TEXT,
  ip_hash          TEXT,
  yoco_payment_id  TEXT,
  granted_at       TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Full-text search virtual table
CREATE VIRTUAL TABLE IF NOT EXISTS articles_fts
  USING fts5(title, content, keywords, content='articles', content_rowid='id');

-- Indexes
CREATE INDEX IF NOT EXISTS idx_articles_slug       ON articles(slug);
CREATE INDEX IF NOT EXISTS idx_articles_status     ON articles(status);
CREATE INDEX IF NOT EXISTS idx_articles_published  ON articles(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_article   ON analytics(article_id);
CREATE INDEX IF NOT EXISTS idx_analytics_event     ON analytics(event);
CREATE INDEX IF NOT EXISTS idx_calendar_date       ON content_calendar(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_calendar_status     ON content_calendar(status);
CREATE INDEX IF NOT EXISTS idx_affiliates_network  ON affiliates(network);
