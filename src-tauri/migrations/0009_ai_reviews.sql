CREATE TABLE IF NOT EXISTS ai_review_runs(
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  scope TEXT NOT NULL CHECK(scope IN ('chapter','manuscript')),
  focus TEXT NOT NULL,
  provider_config_id TEXT,
  model_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('running','completed','failed')),
  document_ids_json TEXT NOT NULL CHECK(json_valid(document_ids_json)),
  context_json TEXT NOT NULL CHECK(json_valid(context_json)),
  estimated_input_tokens INTEGER NOT NULL,
  actual_input_tokens INTEGER,
  actual_output_tokens INTEGER,
  error_redacted TEXT,
  created_at TEXT NOT NULL,
  completed_at TEXT
);
CREATE TABLE IF NOT EXISTS ai_review_findings(
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES ai_review_runs(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  severity TEXT NOT NULL CHECK(severity IN ('error','warning','note','strength')),
  title TEXT NOT NULL,
  problem TEXT NOT NULL,
  evidence_json TEXT NOT NULL CHECK(json_valid(evidence_json)),
  relevant_context_json TEXT NOT NULL CHECK(json_valid(relevant_context_json)),
  strategies_json TEXT NOT NULL CHECK(json_valid(strategies_json)),
  document_ids_json TEXT NOT NULL CHECK(json_valid(document_ids_json)),
  status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','planned','deferred','ignored')),
  position INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_ai_review_runs_project ON ai_review_runs(project_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_review_findings_run ON ai_review_findings(run_id,position);
INSERT OR IGNORE INTO schema_migrations(version,name,applied_at) VALUES(9,'ai_reviews',strftime('%Y-%m-%dT%H:%M:%fZ','now'));
