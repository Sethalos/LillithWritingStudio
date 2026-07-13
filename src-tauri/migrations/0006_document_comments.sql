BEGIN;
CREATE TABLE IF NOT EXISTS document_comments(
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES manuscript_nodes(id) ON DELETE CASCADE,
  base_revision INTEGER NOT NULL,
  base_content_hash TEXT NOT NULL,
  anchor_from INTEGER NOT NULL,
  anchor_to INTEGER NOT NULL,
  selected_text TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK(status IN('open','resolved')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  resolved_at TEXT,
  CHECK(anchor_from >= 0 AND anchor_to > anchor_from)
);
CREATE INDEX IF NOT EXISTS idx_document_comments_review ON document_comments(document_id,status,created_at);
INSERT OR IGNORE INTO schema_migrations(version,name,applied_at) VALUES(6,'document_comments',strftime('%Y-%m-%dT%H:%M:%fZ','now'));
PRAGMA user_version=6;
COMMIT;
