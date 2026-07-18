CREATE TABLE IF NOT EXISTS dashboard_tasks(
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','completed')),
  due_at TEXT,
  linked_node_id TEXT REFERENCES manuscript_nodes(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_dashboard_tasks_project_status_due ON dashboard_tasks(project_id,status,due_at);

CREATE TABLE IF NOT EXISTS daily_focus(
  project_id TEXT PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
  document_id TEXT REFERENCES manuscript_nodes(id),
  title TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL DEFAULT '',
  word_target INTEGER CHECK(word_target IS NULL OR word_target >= 0),
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS activity_events(
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  title TEXT NOT NULL,
  detail TEXT,
  source_entity_id TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_activity_events_project_created ON activity_events(project_id,created_at DESC);

CREATE TABLE IF NOT EXISTS pinned_artifacts(
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  artifact_type TEXT NOT NULL,
  source_entity_id TEXT NOT NULL,
  title TEXT NOT NULL,
  pinned_at TEXT NOT NULL,
  UNIQUE(project_id,artifact_type,source_entity_id)
);

INSERT OR IGNORE INTO schema_migrations(version,name,applied_at) VALUES(12,'dashboard_operations',datetime('now'));
