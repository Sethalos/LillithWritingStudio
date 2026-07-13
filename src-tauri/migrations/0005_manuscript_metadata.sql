BEGIN;
ALTER TABLE manuscript_nodes ADD COLUMN scene_goal TEXT;
ALTER TABLE manuscript_nodes ADD COLUMN word_goal INTEGER CHECK(word_goal IS NULL OR word_goal >= 0);
ALTER TABLE manuscript_nodes ADD COLUMN tags_json TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(tags_json));
INSERT OR IGNORE INTO schema_migrations(version,name,applied_at) VALUES(5,'manuscript_metadata',strftime('%Y-%m-%dT%H:%M:%fZ','now'));
PRAGMA user_version=5;
COMMIT;
