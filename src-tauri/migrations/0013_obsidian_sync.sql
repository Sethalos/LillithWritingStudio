CREATE TABLE IF NOT EXISTS obsidian_vault_configs(
  project_id TEXT PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
  vault_root TEXT NOT NULL,
  vault_mode TEXT NOT NULL CHECK(vault_mode IN ('master','independent')),
  project_folder TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1 CHECK(enabled IN (0,1)),
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS obsidian_record_mappings(
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  relative_path TEXT NOT NULL,
  generated_hash TEXT NOT NULL,
  observed_file_hash TEXT NOT NULL,
  synced_at TEXT NOT NULL,
  UNIQUE(project_id,entity_type,entity_id),
  UNIQUE(project_id,relative_path)
);
CREATE TABLE IF NOT EXISTS obsidian_sync_runs(
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK(status IN ('running','completed','completed-with-conflicts','failed')),
  created_count INTEGER NOT NULL DEFAULT 0,
  updated_count INTEGER NOT NULL DEFAULT 0,
  unchanged_count INTEGER NOT NULL DEFAULT 0,
  conflict_count INTEGER NOT NULL DEFAULT 0,
  error_redacted TEXT,
  started_at TEXT NOT NULL,
  completed_at TEXT
);
CREATE TABLE IF NOT EXISTS obsidian_sync_conflicts(
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES obsidian_sync_runs(id) ON DELETE CASCADE,
  mapping_id TEXT REFERENCES obsidian_record_mappings(id),
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  relative_path TEXT NOT NULL,
  reason TEXT NOT NULL,
  expected_hash TEXT,
  observed_hash TEXT,
  proposed_hash TEXT NOT NULL,
  created_at TEXT NOT NULL
);
INSERT OR IGNORE INTO schema_migrations(version,name,applied_at) VALUES(13,'obsidian_sync',datetime('now'));
