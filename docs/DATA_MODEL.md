# Data model

This document defines domain ownership and model boundaries. The executable SQLite details remain in [DATABASE.md](DATABASE.md) and `src-tauri/migrations/`.

## Ownership model

| Information | Authority | Portable representation |
| --- | --- | --- |
| Manuscript prose | Section files with revision metadata in SQLite | HTML/Markdown-compatible files |
| Project tree and scene metadata | SQLite | Export manifests |
| Characters, states, relationships, and arcs | SQLite | Generated Obsidian Markdown and exports |
| Story Bible and canon status | SQLite | Generated Obsidian Markdown and continuity packs |
| Timeline and plot threads | SQLite | Generated Obsidian Markdown and exports |
| AI context, runs, proposals, and decisions | SQLite | Revision/audit exports where requested |
| Author-written vault notes | Obsidian Markdown | Markdown files |
| Search and embeddings | Rebuildable SQLite/local indexes | None required |

## Core aggregates

### Project and manuscript

A `Project` owns a hierarchical set of stable `ManuscriptNode` IDs. Nodes may represent books, parts, acts, chapters, scenes, interludes, notes, or research. Human titles and order may change without invalidating references. Section bodies remain separate files and carry revision/hash preconditions.

### Character intelligence

A character aggregate contains identity, psychology, a versioned Voice Lock, appearances, and notes. Point-in-story behavior is represented separately through effective character-state intervals, directional relationships and changes, and character arcs with linked beats. See [CHARACTER_SYSTEM.md](CHARACTER_SYSTEM.md).

### Story knowledge

Story Bible entities and facts carry explicit canon status, optional validity intervals, and manuscript provenance. Timeline events, plot threads, research sources, and series-continuity entries are related but remain distinct queryable records.

### AI and revisions

Every model execution references an immutable context package and provider route. Structured output creates a change set or finding set. A manuscript proposal records its target range, base revision, base hash, before/after text, evidence, rationale, strategies, and decision lineage. See [AI_EDITOR.md](AI_EDITOR.md) and [TRACKED_CHANGES.md](TRACKED_CHANGES.md).

### Dashboard operations

The functional dashboard requires persistent operational records that are not all present yet:

- tasks and deadlines;
- daily focus records;
- writing sessions and streak summaries;
- append-only activity events;
- pinned artifacts;
- dashboard preferences;
- Obsidian vault and sync status.

Derived cards such as word progress, active characters, analysis findings, timeline events, recent revisions, backup state, and pipeline progress must query their owning modules rather than duplicate data.

### Obsidian synchronization

Vault configuration, record-to-file mappings, generated-content hashes, observed external hashes, sync runs, conflicts, and diagnostics belong to the `obsidian-sync` module. Generated Markdown is a projection of approved SQLite data. Manual Markdown remains owned by the author. See [OBSIDIAN_INTEGRATION.md](OBSIDIAN_INTEGRATION.md).

## Migration strategy

- Migrations are ordered, immutable SQL files applied transactionally through `PRAGMA user_version`.
- A verified project backup precedes any release migration that changes durable data.
- New columns should be nullable or have safe defaults until backfill is complete.
- Derived indexes and dashboard summaries must be rebuildable.
- Failed or ambiguous migrations open the project read-only rather than attempting a silent repair.
- Downgrades are never performed in place.

## Data-model decisions still open

- Exact diff-segment representation for partially accepted rich-text proposals.
- Whether activity events are purely derived or also persisted for stable historical presentation.
- The initial dashboard-health normalization formulas; these must be documented before percentage summaries ship.
- The future controlled two-way Obsidian merge policy. Version 1 is intentionally one-way.
