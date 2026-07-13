CREATE TABLE IF NOT EXISTS series_settings(
  project_id TEXT PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
  series_name TEXT NOT NULL DEFAULT '',
  book_title TEXT NOT NULL DEFAULT '',
  book_number INTEGER CHECK(book_number IS NULL OR book_number > 0),
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS series_continuity_entries(
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK(category IN ('character','relationship','world-rule','location','organization','technology','object','event','timeline','terminology','plot-thread','other')),
  subject TEXT NOT NULL,
  field_name TEXT NOT NULL,
  value TEXT NOT NULL,
  canon_status TEXT NOT NULL CHECK(canon_status IN ('canon','draft','possible','rejected','superseded','unknown')),
  source_book TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_series_entries_project_subject ON series_continuity_entries(project_id,subject,field_name) WHERE deleted_at IS NULL;
CREATE VIRTUAL TABLE IF NOT EXISTS series_continuity_fts USING fts5(entry_id UNINDEXED, subject, field_name, value, source_book, notes, tokenize='unicode61');
INSERT OR IGNORE INTO schema_migrations(version,name,applied_at) VALUES(10,'series_continuity',strftime('%Y-%m-%dT%H:%M:%fZ','now'));
