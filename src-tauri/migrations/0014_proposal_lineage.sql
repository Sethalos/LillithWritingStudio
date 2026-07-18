ALTER TABLE change_proposals ADD COLUMN regeneration_instruction TEXT;
ALTER TABLE change_proposals ADD COLUMN editing_mode TEXT NOT NULL DEFAULT 'tracked-rewrite' CHECK(editing_mode IN ('suggest-only','tracked-rewrite','direct-apply'));
CREATE INDEX IF NOT EXISTS idx_change_proposals_parent ON change_proposals(parent_proposal_id);
INSERT OR IGNORE INTO schema_migrations(version,name,applied_at) VALUES(14,'proposal_lineage',datetime('now'));
