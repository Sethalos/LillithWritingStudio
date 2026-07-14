# Architecture

## Goals and quality attributes

Lillith is a single-user local desktop application. Data ownership, revision safety, character intelligence, and responsive long-form editing take priority over feature breadth. The system must recover from interruption, explain every model input, keep ordinary manuscript files accessible, and support 500,000+ word projects without mounting the whole manuscript in the DOM.

## System view

```text
React + TipTap UI
  | typed commands/events
Tauri command boundary
  |-- Project service ------ project folders + snapshots
  |-- SQLite repository ---- metadata, canon, state, FTS, revisions
  |-- AI gateway ----------- remote/local OpenAI-compatible endpoints
  |-- Retrieval service ---- SQL + FTS5 + vector adapter + ranking
  |-- Obsidian sync -------- approved-data Markdown projection + conflicts
  `-- Document jobs -------- optional Python sidecar for DOCX/EPUB/PDF
```

The React process never receives provider secrets. It asks Rust to perform provider operations using a credential reference. Rust owns filesystem boundaries, transactions, backups, HTTP policies, and process supervision. Python is a disposable worker for file formats, not a long-running source of truth.

The React shell keeps navigation, the active manuscript section, TipTap, autosave, and the current AI proposal on the startup path. Specialist inspector modules are loaded with dynamic imports behind Suspense and error boundaries. Rollup isolates React, TipTap/ProseMirror, icons, Tauri APIs, and validation code into stable cacheable chunks so opening one specialist workspace does not force every other workspace into the initial application bundle.

## Modules

| Module | Responsibility |
| --- | --- |
| manuscript | tree, section loading, autosave, counts, snapshots |
| characters | identity, psychology, Voice Lock, point-in-story state |
| relationships | directional edges and changes over story position |
| timeline | story events, ordering, participation, temporal constraints |
| story-bible | typed facts, canon status, provenance, extraction review |
| ai-editor | operations, issues, proposals, comparisons, decisions |
| model-providers | provider capabilities, routing, credentials, usage |
| retrieval | structured/FTS/vector candidates, ranking, context budgets |
| pacing | deterministic metrics and explainable model interpretation |
| continuity | assertions, conflicts, evidence, resolution decisions |
| revisions | immutable proposals, decisions, snapshots, audit trail |
| import-export | normalized document model and format workers |
| settings | local application and per-project preferences |
| backups | WAL-safe copies, snapshots, archive validation, retention |
| dashboard | read models for focus, activity, tasks, findings, and system health |
| obsidian-sync | vault configuration, projections, mappings, hashes, and conflicts |

Modules expose application services and exchange IDs/domain values, not database rows. Provider SDK types and TipTap JSON do not leak into the core domain.

## Data ownership

Each project is self-contained. `project.json` identifies format version and database location. Section files are durable author-accessible documents. SQLite is authoritative for tree organization, structured entities, story-positioned facts, FTS, proposals, revision ancestry, dashboard operations, and Obsidian sync state. Section saves update a temporary file, fsync, atomic rename, then update SQLite metadata in one command. On mismatch, the newer section file is retained and reconciliation is offered.

Obsidian Markdown is a human-readable projection, not a second structured authority. Version 1 exports approved data one way through a dedicated synchronizer. Generated regions are hash-checked and author-written regions are preserved. External generated-region edits produce conflicts rather than automatic imports or overwrites.

## Manuscript scale

- The binder fetches metadata only.
- The editor loads one scene/chapter section and optionally one adjacent section.
- Autosave is debounced, serialized per document, and revision-aware.
- FTS and embeddings are updated by a background queue after the file save commits.
- Analyses operate on section IDs and stream progress/results.
- Virtualized lists render binders and issue sets.
- Cached context summaries are invalidated by content hashes.

## Retrieval

Context assembly is a deterministic pipeline: pinned items, current selection/scene, structured character facts and state at story position, Voice Locks, relationship state, timeline/world constraints, lexical candidates, semantic candidates, proximity candidates, then budget-aware deduplication. Every item contains source ID, version/hash, reason, relevance, token estimate, and sensitivity. The exact package is persisted with an AI run.

Semantic retrieval is stored in `semantic_chunks` behind a replaceable vector adapter. The default adapter uses normalized 256-dimensional local feature-hash embeddings with conservative synonym normalization, requiring no model, network, or native extension. Incremental content hashes avoid unnecessary re-indexing. A future provider-embedding or sqlite-vec adapter can replace vector generation/search without changing context-package provenance.

## AI execution

`AiProvider` exposes capability discovery, model listing, generation, streaming, embeddings, and token estimation. Task routing maps a task role to provider/model/settings. OpenAI-compatible endpoints are the Phase 1 implementation target; specialized adapters normalize Anthropic and Gemini later. Requests are assembled from typed context and a versioned prompt template. Model output must validate against a schema before entering the proposal store.

## Security boundaries

- Project paths are canonicalized beneath a user-selected root.
- External HTTP is denied except configured providers.
- Credentials use OS storage and are represented as opaque IDs.
- Sidecar inputs use temp directories with restrictive permissions.
- HTML is sanitized before TipTap display.
- Provider/context logs are metadata-only unless diagnostic logging is explicitly enabled.

## Reliability

SQLite uses foreign keys, WAL, busy timeout, and migrations in transactions. Every accepted proposal creates a revision and snapshot link. Background jobs are resumable and idempotent. On startup, integrity checks identify orphaned temp files, stale jobs, checksum mismatch, or migration failure; the project opens read-only if safe recovery is uncertain.

## Testing strategy

- Unit: domain invariants, context ranking, Voice Lock prompt shaping, diffs.
- Database: migrations from every supported version, constraints, rollback.
- Integration: autosave/file/DB reconciliation, AI schema validation, import jobs.
- Contract: recorded provider responses and OpenAI-compatible mock server.
- End-to-end: create project, edit, restart, propose/reject/accept, export.
- Property/fuzz: document normalization, path handling, diff application.

## Architectural decisions

1. Section files plus SQLite, rather than an opaque database-only manuscript.
2. Story-position IDs rather than chapter-number strings, so reordering is safe.
3. Immutable proposals and revisions rather than in-place AI mutation.
4. Provider ports rather than direct SDK calls from UI.
5. Optional sidecar rather than requiring Python for normal editing.
6. Progressive indexing rather than blocking saves or project open.
7. A daily command-center dashboard separate from the longer-form Project Workflow.
8. A master Obsidian vault with project folders by default, while allowing independent project vaults.
9. One-way, conflict-aware Obsidian projection before any controlled two-way synchronization.
