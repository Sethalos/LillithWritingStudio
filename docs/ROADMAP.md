# Development roadmap

> Current implementation and hands-on testing status is maintained in [`CURRENT_STATUS.md`](CURRENT_STATUS.md).

## Approved next sequence — command-center expansion

This sequence supersedes feature-order implications in the historical phase list below. Existing functionality remains in place throughout the transition.

1. **Documentation reconciliation.** Establish authoritative product, subsystem, storage, security, risk, and decision documents. **Implemented in the current documentation milestone.**
2. **Application shell.** Introduce the approved global top navigation, categorized sidebar, responsive workspace region, and persistent status bar. Preserve access to every existing workspace and keep the application runnable. **Implemented.**
3. **Functional dashboard.** Build real read models for manuscript progress, daily focus, active characters, transparent analysis findings, unresolved threads, artifacts, recent activity, timeline, tasks, revision pipelines, backups, provider state, and later vault state. Do not populate decorative fake scores. **Core dashboard implemented with real manuscript, workflow, character, pacing, Story Bible, timeline, research, pipeline, task, focus, and recent-section data. Backup/provider/vault status and append-only activity enrichment remain.**
4. **Conservative Obsidian synchronization.** Default to a master vault with `_Master` and per-project folders; allow independent vaults. Export approved structured data one way, preserve manual notes, detect external edits, and report conflicts. **Implemented for characters and approved Story Bible records with stable mappings, generated-region hashes, atomic writes, visible conflicts, and an on-demand vault workspace.**
5. **Improved tracked-change interface.** Add inline small-change diffs, partial segment decisions, editable proposals, regeneration lineage, and explicit Suggest Only/Tracked Rewrite/Direct Apply modes.

Character Studio and AI Editor remain the heart of the product during this sequence. Dashboard polish stops when it is clear, functional, responsive, and connected to real data; writing and editing reliability retain priority.

### Exit criteria for the expansion slice

- All existing workspaces are reachable through the new shell without data loss or route regression.
- Dashboard cards link to real owning records or evidence and disclose stale/unavailable data.
- Health summaries identify method, scope, findings, confidence, and calculation details.
- Tasks, focus, and activity persist locally through typed repositories and migrations.
- An approved character page syncs into the configured vault without modifying manual Markdown.
- External generated-region edits create a visible conflict instead of being overwritten.
- Tracked Rewrite remains the default and accepted changes retain revision/snapshot safety.

## Foundation — architecture complete

- Domain contracts, schema, folder format, provider and context interfaces.
- Tauri/React/Rust scaffold, migration runner, sample repository.
- Threat model, backup/recovery policy, performance budgets.

## Phase 1 — trustworthy authoring slice

1. Project create/open/recent list and migration-safe SQLite initialization.
   - Workflow Home, project brief, Creative North Star, discovery notes, unresolved decisions, and drafting-readiness guidance are now wired as the project orientation layer.
2. Binder CRUD/reorder and section file repository. **Implemented with transactional drag-and-drop ordering.**
3. TipTap editor, autosave queue, counts, focus/split view, keyboard find/replace, persistent scene goals/targets/tags/POV, and revision-aware comments/annotations. **Implemented.**
4. Character identity/psychology and complete versioned Voice Lock form. **Implemented.**
5. OS credential adapter and generic OpenAI-compatible provider.
6. Selection rewrite and character-aware dialogue review. **Implemented for Ollama and OpenAI-compatible routes.**
7. Context inspection, persisted proposal comparison, accept/reject/defer, snapshots. **Implemented.**
8. DOCX normalization worker, reviewed preview, import/export golden tests. **Implemented.**
9. Recovery, backup, accessibility, packaging, and end-to-end verification. **Verified backup/recovery, keyboard accessibility baseline, on-demand inspector code splitting, optimized native build, and audited Linux DEB/RPM packaging implemented. Native macOS/Windows smoke tests, AppImage repair, embedded Python, and full GUI E2E remain.**

Exit: all criteria in `VERTICAL_SLICE.md` pass on the target desktop OS.

## Phase 2 — persistent story intelligence

- Dynamic character states at scene/chapter boundaries. **Implemented.**
- Directional relationships and arc tracker. **Implemented.**
- Typed Story Bible with structured facts, provenance, canon statuses, and persistent AI extraction review. **Implemented.**
- FTS, chapter-proximity, and embedded local semantic retrieval integrated with inspectable AI context. **Implemented.** Higher-quality optional embedding adapters remain.
- Revision history, side-by-side comparison, AI decision audit, and restore-as-new-revision. **Implemented.**
- Versioned Author Voice & Project Rules profile with style, mechanics, constraints, approved samples, and automatic inspectable AI-context inclusion. **Implemented.**
- Deterministic continuity findings across state, promises, inventory, Voice Locks, character presence, arcs, and canonical facts. **Implemented.** Provider-backed chapter/manuscript developmental review with persisted evidence, inspectable bounded context, navigation, and issue disposition is also implemented. Multi-change-set generation remains.

## Phase 3 — analysis and orchestration

- Explainable deterministic pacing metrics/maps and manuscript pattern analysis. **Implemented, including explicit scene location metadata, repeated-location detection, and location-aware continuity checks. AI interpretation remains.**
- Persistent revision pipeline builder, sixteen defaults, immediate tracked pass execution, resumable ordered queue processing, per-pass model routing, progress/failure state, and tracked-proposal review. **Implemented.** Unattended background scheduling remains optional later work.
- Persistent timeline editing and interactive directional relationship visualization. **Implemented.**
- Anthropic, Gemini, OpenAI, OpenRouter, Ollama, vLLM, LM Studio, and generic OpenAI-compatible adapters. **Implemented.** Local-only and remote-only routing presets are also available in the Models workspace.
- Provider-aware token/cost reports and model task routing. **Implemented with configurable model pricing, preflight estimates, normalized provider usage, and per-project run history.**

## Phase 4 — publishing and extensibility

- Soft-guidance publishing workflow with project creation, discovery, outline, draft, development, continuity, character voice, narrative weight, trust-the-reader, proof/integrity, production, cover, metadata, preview QA, publication, marketing, and archive stages. **Implemented as a dedicated inspector workspace with a pre-publication gate and local project state.**
- Checklist items are now phase-scoped, evidence-backed, and explanation-first: each item records requirement level, status, completion source, blocking behavior, format applicability, project applicability, notes, and the workspace that can satisfy it.
- The readiness gate is format-aware. Kindle, paperback, and hardcover are evaluated independently so one production path can be complete while another remains intentionally unselected or unfinished.
- Manual overrides are supported and remain visible, including skipped, not applicable, and reopened states. Automatic completion is inferred from project data where evidence is strong enough.
- Series/trilogy workflow support is prepared in the data model through shared metadata and inherited publishing fields without forcing a full series-management redesign yet.
- DOCX, Kindle EPUB, KDP-ready paperback DOCX, KDP-ready hardcover DOCX, Markdown, text, HTML, EPUB 3, and PDF-proof exports plus DOCX/Markdown/text/HTML/EPUB reviewed imports. **Implemented.**
- Searchable local Research workspace with structured sources, citations, manuscript links, FTS indexing, and inspectable AI-context retrieval. **Implemented.**
- Local Series Continuity workspace with book identity, typed cross-book canon, FTS retrieval, portable versioned JSON packs, and automatic editor/pipeline/developmental-review context. **Implemented.**
- Sandboxed plugin API and optional multi-agent review room remain later work, after the approved command-center, Obsidian, and tracked-review milestones.

## Release discipline

Each milestone requires migration tests, backup/restore verification, accessibility checks, a performance fixture, and an updated data-format version. Features that mutate manuscript content require proposal/revision integration before merge.
