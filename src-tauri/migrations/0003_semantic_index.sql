BEGIN;
CREATE TABLE IF NOT EXISTS semantic_chunks(
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL CHECK(source_type IN('scene','story-bible')),
  source_id TEXT NOT NULL,
  document_id TEXT REFERENCES manuscript_nodes(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  dimensions INTEGER NOT NULL,
  vector_json TEXT NOT NULL CHECK(json_valid(vector_json)),
  updated_at TEXT NOT NULL,
  UNIQUE(source_type,source_id)
);
CREATE INDEX IF NOT EXISTS idx_semantic_project_source ON semantic_chunks(project_id,source_type,updated_at);
INSERT OR IGNORE INTO schema_migrations(version,name,applied_at) VALUES(3,'semantic_index',strftime('%Y-%m-%dT%H:%M:%fZ','now'));
PRAGMA user_version=3;
COMMIT;
