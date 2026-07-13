BEGIN;
CREATE TABLE IF NOT EXISTS bible_extraction_batches(
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  document_id TEXT NOT NULL REFERENCES manuscript_nodes(id) ON DELETE CASCADE,
  provider_config_id TEXT NOT NULL,
  model_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN('running','review','completed','failed')),
  error_redacted TEXT,
  input_tokens INTEGER,
  output_tokens INTEGER,
  created_at TEXT NOT NULL,
  completed_at TEXT
);
CREATE TABLE IF NOT EXISTS bible_extraction_suggestions(
  id TEXT PRIMARY KEY,
  batch_id TEXT NOT NULL REFERENCES bible_extraction_batches(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  name TEXT NOT NULL,
  summary TEXT,
  facts_json TEXT NOT NULL CHECK(json_valid(facts_json)),
  confidence REAL NOT NULL CHECK(confidence BETWEEN 0 AND 1),
  evidence_json TEXT NOT NULL CHECK(json_valid(evidence_json)),
  decision TEXT NOT NULL DEFAULT 'pending' CHECK(decision IN('pending','accepted','rejected')),
  created_entity_id TEXT REFERENCES bible_entities(id),
  created_at TEXT NOT NULL,
  decided_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_bible_extraction_review ON bible_extraction_suggestions(decision,created_at);
INSERT OR IGNORE INTO schema_migrations(version,name,applied_at) VALUES(4,'bible_extraction_review',strftime('%Y-%m-%dT%H:%M:%fZ','now'));
PRAGMA user_version=4;
COMMIT;
