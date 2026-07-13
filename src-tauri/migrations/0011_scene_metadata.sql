BEGIN;
ALTER TABLE manuscript_nodes ADD COLUMN scene_type TEXT CHECK(scene_type IS NULL OR scene_type IN ('action','dialogue','reflection','exposition','mixed'));
ALTER TABLE manuscript_nodes ADD COLUMN scene_location TEXT;
INSERT OR IGNORE INTO schema_migrations(version,name,applied_at) VALUES(11,'scene_metadata',strftime('%Y-%m-%dT%H:%M:%fZ','now'));
PRAGMA user_version=11;
COMMIT;
