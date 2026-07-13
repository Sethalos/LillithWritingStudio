BEGIN;
CREATE TABLE IF NOT EXISTS revision_pipelines(
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_default INTEGER NOT NULL DEFAULT 0 CHECK(is_default IN(0,1)),
  pipeline_json TEXT NOT NULL CHECK(json_valid(pipeline_json)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(project_id,name)
);
CREATE TABLE IF NOT EXISTS pipeline_runs(
  id TEXT PRIMARY KEY,
  pipeline_id TEXT NOT NULL REFERENCES revision_pipelines(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK(status IN('queued','running','paused','review','completed','failed','cancelled')),
  target_json TEXT NOT NULL CHECK(json_valid(target_json)),
  total_items INTEGER NOT NULL,
  completed_items INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS pipeline_run_items(
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES pipeline_runs(id) ON DELETE CASCADE,
  pass_id TEXT NOT NULL,
  document_id TEXT NOT NULL REFERENCES manuscript_nodes(id),
  position INTEGER NOT NULL,
  status TEXT NOT NULL CHECK(status IN('queued','running','review','accepted','rejected','failed','skipped')),
  ai_run_id TEXT REFERENCES ai_runs(id),
  error_redacted TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(run_id,pass_id,document_id)
);
CREATE INDEX IF NOT EXISTS idx_pipeline_project ON revision_pipelines(project_id,updated_at);
CREATE INDEX IF NOT EXISTS idx_pipeline_run_queue ON pipeline_run_items(run_id,status,position);
INSERT OR IGNORE INTO schema_migrations(version,name,applied_at) VALUES(2,'revision_pipelines',strftime('%Y-%m-%dT%H:%M:%fZ','now'));
PRAGMA user_version=2;
COMMIT;
