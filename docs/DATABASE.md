# SQLite schema

The executable schema is applied in order from `src-tauri/migrations/0001_initial.sql` through `0014_proposal_lineage.sql`. Migrations are recorded in `schema_migrations`, run transactionally, and are never silently downgraded. Project backups provide the verified recovery path before release migrations.

## Design conventions

- IDs are UUID text values; timestamps are RFC 3339 UTC text.
- JSON columns are checked with `json_valid` and reserved for ordered or low-query aggregates.
- Story-positioned facts use manuscript-node IDs plus sortable positions captured at query time.
- Soft deletion uses `deleted_at`; revision/proposal/audit rows are immutable.
- Content hashes are SHA-256 over normalized UTF-8.
- Foreign keys, WAL mode, `synchronous=NORMAL`, and a busy timeout are enabled per connection.
- FTS content is a derived index and can be rebuilt from section files and structured records.

## Entity groups

Project/manuscript: `projects`, `manuscript_nodes`, `document_revisions`, `tags`, `entity_tags`.
`manuscript_nodes` stores scene goal, word target, tags, POV character, explicit scene type, and explicit scene location for chapter/scene planning and analysis.

Character intelligence: `characters`, `voice_locks`, `voice_examples`, `character_states`, `character_state_facts`, `relationships`, `relationship_changes`, `character_arcs`, `arc_beats`.

Story knowledge: `bible_entities`, `bible_facts`, `timeline_events`, `timeline_participants`, `plot_threads`, `research_sources`, `research_fts`, `series_settings`, `series_continuity_entries`, and `series_continuity_fts`.

AI/revision: `provider_configs`, `task_routes`, `context_packages`, `context_items`, `ai_runs`, `change_sets`, `change_proposals`, `proposal_decisions`, `ai_review_runs`, and `ai_review_findings`.

Operations: `background_jobs`, `project_settings`, `writing_profiles`, `snapshots`, `schema_migrations`, and FTS virtual tables. Writing-profile saves append immutable numbered versions; the highest version is the active profile.

Command-center operations include explicit `dashboard_tasks`, `daily_focus`, `activity_events`, and `pinned_artifacts` tables. Tasks and daily focus are wired through typed repositories; activity recording and pin-management UI remain follow-up work. Obsidian synchronization uses `obsidian_vault_configs`, `obsidian_record_mappings`, `obsidian_sync_runs`, and `obsidian_sync_conflicts` for machine-local configuration, stable projections, hashes, audit results, and external-edit protection.

Important indexes cover parent/position binder reads, character state by effective position, directional relationships, canon/status filtering, proposal target/status, and job status. Constraints prevent self-relationships, invalid score ranges, reversed state intervals, and duplicate sibling positions.
