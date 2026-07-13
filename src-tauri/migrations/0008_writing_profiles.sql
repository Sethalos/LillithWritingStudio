CREATE TABLE IF NOT EXISTS writing_profiles(
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  version INTEGER NOT NULL CHECK(version > 0),
  profile_json TEXT NOT NULL CHECK(json_valid(profile_json)),
  created_at TEXT NOT NULL,
  UNIQUE(project_id, version)
);
CREATE INDEX IF NOT EXISTS idx_writing_profiles_active ON writing_profiles(project_id, version DESC);
INSERT OR IGNORE INTO schema_migrations(version,name,applied_at) VALUES(8,'writing_profiles',strftime('%Y-%m-%dT%H:%M:%fZ','now'));
