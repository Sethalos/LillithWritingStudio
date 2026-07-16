CREATE TABLE IF NOT EXISTS proposal_segment_decisions(
  id TEXT PRIMARY KEY,
  proposal_decision_id TEXT NOT NULL REFERENCES proposal_decisions(id) ON DELETE CASCADE,
  proposal_id TEXT NOT NULL REFERENCES change_proposals(id) ON DELETE CASCADE,
  segment_id TEXT NOT NULL,
  ordinal INTEGER NOT NULL CHECK(ordinal >= 0),
  before_text TEXT NOT NULL,
  after_text TEXT NOT NULL,
  decision TEXT NOT NULL CHECK(decision IN('accepted','rejected','unchanged','edited')),
  UNIQUE(proposal_id, ordinal),
  UNIQUE(proposal_id, segment_id)
);
CREATE INDEX IF NOT EXISTS idx_proposal_segments_decision ON proposal_segment_decisions(proposal_decision_id, ordinal);
INSERT OR IGNORE INTO schema_migrations(version,name,applied_at) VALUES(15,'proposal_segment_decisions',datetime('now'));
