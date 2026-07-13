BEGIN;
CREATE TABLE IF NOT EXISTS research_sources(
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL CHECK(source_type IN('website','book','paper','interview','archive','other')),
  title TEXT NOT NULL,
  author TEXT,
  publisher TEXT,
  url TEXT,
  published_date TEXT,
  accessed_date TEXT,
  citation TEXT,
  excerpt TEXT,
  notes TEXT,
  tags_json TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(tags_json)),
  linked_nodes_json TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(linked_nodes_json)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_research_project ON research_sources(project_id,updated_at) WHERE deleted_at IS NULL;
CREATE VIRTUAL TABLE IF NOT EXISTS research_fts USING fts5(source_id UNINDEXED,title,content,tokenize='unicode61');
INSERT OR IGNORE INTO schema_migrations(version,name,applied_at) VALUES(7,'research_workspace',strftime('%Y-%m-%dT%H:%M:%fZ','now'));
PRAGMA user_version=7;
COMMIT;
