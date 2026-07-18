# Lillith Writing Studio

A private, desktop-first authoring environment built around character psychology, voice continuity, inspectable AI context, and safe revision. Lillith stores projects locally and never requires a cloud account.

## Status

This repository contains the first vertical slice: a Tauri desktop shell, React/TypeScript manuscript workspace, TipTap chapter editor, a workflow home that tracks project brief, Creative North Star, discovery, unresolved decisions, and drafting readiness, character and Voice Lock views, a typed AI context/proposal workflow, a secure Model tab, an explainable publishing checklist and readiness gate, and a Rust SQLite persistence layer. The sample project makes the interaction model visible before an AI key is configured.

The application now uses a professional command-center shell with a separate functional dashboard and Project Workflow. The dashboard derives manuscript progress, active characters, deterministic pacing evidence, unresolved decisions, Story Bible, timeline, research, revision-pipeline, and recent manuscript information from their owning modules; persistent tasks and daily focus use dedicated SQLite records. Conservative one-way Obsidian synchronization exports approved characters and Story Bible records into a master or independent vault while preserving manual notes and reporting external generated-section edits as conflicts. Finer-grained tracked revision review is the next approved milestone. Character Studio and AI Editor remain the heart of the product.

## Model providers

Open **Models** from the inspector or the processor icon in the top bar. Remote providers accept an API key that the desktop backend writes to the operating-system credential store; keys are never persisted in browser storage or project data. Local connections support Ollama, LM Studio, vLLM, and generic OpenAI-compatible endpoints. The connection tester discovers models from Ollama's `/api/tags` or an OpenAI-compatible `/models` endpoint. Per-task routing can assign different models to editing, rewriting, character analysis, continuity, brainstorming, summarization, indexing, and final polish.

Specialized Anthropic and Gemini adapters are included. Anthropic uses its Messages and Models APIs with `x-api-key` and the required API-version header. Gemini uses model listing and `generateContent` with `x-goog-api-key`, system instructions, and a JSON response schema. Both normalize their responses into the same validated, tracked proposal contract used by local and OpenAI-compatible providers.

Discovered remote models accept user-controlled input and output pricing per million tokens, avoiding stale hard-coded vendor prices. The AI Editor shows a conservative preflight range before execution. Successful requests normalize provider-reported input/output usage from OpenAI-compatible APIs, Anthropic, Gemini, and Ollama; recent runs and calculated cost appear in Models. Local runtimes are explicitly reported as zero API cost, while unpriced remote models say that pricing is not configured rather than inventing a number.

Context retrieval combines structured queries, FTS5, chapter proximity, and an embedded local semantic index. The bundled adapter produces normalized 256-dimensional feature-hash vectors entirely offline, including a conservative synonym normalization layer. Scene and Bible chunks update incrementally by content hash; active documents and rejected/superseded facts are excluded. Retrieved chunks retain title, source, similarity, reason, and hash in the inspectable AI context. The vector adapter boundary can later use provider embeddings or sqlite-vec without changing stored context contracts.

## Principles

- Local files are the durable source of truth; SQLite is the structured index and transaction layer.
- AI suggestions are proposals, never silent edits.
- Every AI request exposes its assembled context and estimated token count.
- Character state is point-in-story knowledge, not a single mutable biography.
- Provider credentials are referenced by credential IDs; secrets never enter project files.
- Large manuscripts are loaded one document section at a time.

## Quick start

Requirements: Node 20+, Rust stable, and the platform prerequisites for Tauri 2.

```bash
npm install
npm run dev
```

For the desktop application:

```bash
npm run tauri dev
```

Release-oriented commands are `npm run test:release`, `npm run desktop:check`, and `npm run desktop:linux`. The Linux build produces installable DEB and RPM packages under `src-tauri/target/release/bundle/`. See [Release checklist](docs/RELEASE_CHECKLIST.md) for verified platforms and remaining native gates.

The browser development build uses a sample repository for presentation. The Tauri build can create or open portable `.lillith` projects and invokes the local Rust/SQLite commands. Click the project name in the upper-left binder to open the project launcher. Workflow Home is the default orientation layer; it shows the current phase, recommended next action, and a route into the relevant workspace. No provider calls are made until a provider is configured and an operation is explicitly run.

Project creation builds the documented folder layout, manifest, SQLite database, initial book/chapter/scene, and ordinary HTML section file. Binder additions create real chapter or scene records. Autosaves use revision preconditions, atomic file replacement, and a local snapshot of the previous section; stale writes are rejected instead of overwriting newer work.

The binder supports drag-and-drop chapter ordering and scene ordering within a chapter. Reorders are validated against the complete sibling set and committed transactionally, so interrupted or malformed operations cannot leave duplicate or partial positions. The manuscript toolbar includes a distraction-free focus mode and synchronized split view; both panes edit the same section and continue through the normal local autosave and revision guards.

The manuscript editor includes `Ctrl/Cmd+F` find and replace with next/previous navigation, current-match replacement, and replace-all operations applied through ProseMirror positions so surrounding rich-text structure remains intact. Scene details persist an editorial goal, word target, tags, POV character, scene type, and scene location in SQLite. Scene location can be linked directly from the local Story Bible when a canonical place already exists. Goals and targets appear in the editor footer and binder rather than living only in temporary UI state.

Desktop startup keeps the binder, manuscript editor, and active AI Editor on the immediate path. Character Studio, Models, Story Bible, Research, Analysis, Visualizations, History, Pipelines, Files, Settings, Comments, and the project launcher load as isolated on-demand workspaces with accessible progress and recovery states. Vendor code is split into cached React, TipTap/ProseMirror, icon, desktop, and validation chunks; the application entry bundle is approximately 49 KB minified rather than the previous 801 KB monolith.

Selecting manuscript text enables a persistent comment action. Comments record the selected text, ProseMirror range, source revision/hash, editorial note, and open/resolved history. The Comments inspector navigates back to anchored text and identifies anchors as current, safely rebased after an edit, or stale when the original wording no longer exists. New comments flush pending autosave first so their revision precondition is durable.

The Settings workspace creates project-local verified backups. SQLite is captured through `VACUUM INTO` for a consistent database image while WAL mode is active; ordinary manuscript files, assets, and snapshots are copied alongside it. A SHA-256 manifest records every file and byte count, and backups can be reverified to detect deletion or tampering. Recovery always creates a new `.lillith` project, refuses overwrites, and validates that the recovered database opens before reporting success. Provider credentials are deliberately excluded.

Settings also contains a versioned **Author Voice & Project Rules** profile. It records the author's voice summary, POV, tense, spelling dialect, sentence rhythm, description and dialogue preferences, mechanics, preserve/avoid constraints, project rules, and approved prose examples. Every save creates a new local version. The active version is automatically pinned into inspectable AI Editor and revision-pipeline context while the one-off editing instruction remains a separate item.

The Character inspector is a persistent Character Studio rather than a static card. It supports multiple project characters, complete Identity and Psychology records, manuscript-linked appearances, roles and notes, plus the full versioned Voice Lock—including situational speech, vocabulary constraints, and approved/rejected examples. Character saves are validated and stored locally in SQLite.

The AI Editor can execute a selected-text operation through the Model-tab prose route using Ollama or an OpenAI-compatible provider. Before execution, it persists an inspectable package containing the selection, current scene, character identity, psychology, Voice Lock, and user instruction. Structured proposals include issue, rationale, evidence, strategies, and replacement text. Accept verifies the original revision/hash and uniquely matched text before creating an `ai-accepted` revision; reject and defer are also recorded. Model output never silently overwrites the manuscript.

Character Studio's **Story** section persists dynamic state at chapter/scene boundaries, directional relationships, and character arcs. State covers condition, injuries, fatigue, inventory, emotion, knowledge, incorrect beliefs, secrets, promises, relationship/trust changes, moral compromises, losses, victories, and immediate priorities. The AI context assembler filters state by story position and includes applicable state, relationships, and arcs alongside the Voice Lock.

The Story Bible supports typed locations, organizations, governments, units, technologies, vehicles, objects, religions, events, rules, themes, symbols, plot threads, mysteries, promises, foreshadowing, and payoffs. Each record and fact has a canon status and optional manuscript provenance. Saving rebuilds a local FTS5 entry. AI operations retrieve a small relevant set and automatically exclude rejected or superseded records/facts. The editor can now pull an explicit canonical location into scene metadata instead of relying on free text alone.

The Research workspace keeps websites, books, papers, interviews, archives, and other sources in the local project. Sources include citation metadata, excerpts, notes, tags, access dates, and links to relevant chapters or scenes. Full-text retrieval prioritizes sources linked to the active document and adds only the relevant results to the AI Editor's inspectable context package.

The Series workspace records series identity, book order, and typed cross-book canon for characters, relationships, world rules, places, organizations, technologies, objects, events, terminology, timelines, and plot threads. Records keep canon status, source book, and continuity notes and are indexed locally with FTS5. Versioned JSON continuity packs transfer validated copies between projects without live database links or cloud storage. Relevant canon is automatically pinned into editor and pipeline context, while developmental reviews include the active series record set in their inspectable package.

Story Bible extraction can analyze any saved scene through the configured Background indexing model, with Primary editor as a fallback. Structured suggestions are stored in a separate review queue with confidence, source scene, manuscript evidence, and proposed facts. They cannot enter project memory until the user chooses Reject, Accept as Draft, or Accept as Canon. Accepted facts retain their scene provenance and review time; decisions are immutable.

The Files tab provides reviewed DOCX, Markdown, plain-text, HTML, and EPUB import. Import first detects headings, chapters, scenes, scene-break markers, counts, and warnings without changing the project. Committing the preview creates normal binder records and `import` revisions. Export follows binder order to editable DOCX, Markdown, plain text, standalone HTML, EPUB 3, or PDF proof while preserving the essential formatting supported by each format. The publishing workflow adds dedicated Kindle EPUB, paperback DOCX, and hardcover DOCX production presets, each routed through the isolated Python worker. Paperback and hardcover presets apply print typography, chapter starts, scene separators, first-paragraph handling, and page-number fields. The isolated Python worker never opens SQLite.

Publishing is organized as a soft-guidance checklist rather than a hard compliance wall. Each phase exposes small project-aware items with status, evidence, and rationale, and the readiness gate explains what remains incomplete, what is required versus recommended, and which workspace can satisfy the missing item. Kindle, paperback, and hardcover readiness are tracked independently so one format can be publishable while another remains unfinished. Manual overrides, skips, and “not applicable” states are persisted locally and remain visible.

The Pacing tab provides deterministic scene and manuscript analysis without reducing prose to one score. It maps scene/chapter length, paragraph and sentence structure, sentence-length variation, dialogue balance, exposition/action/reflection density, conflict and emotional signals, physical movement, new-information signals, active-character estimates, scene function, scene location, and entry/ending strength. It also explains slow/rushed evidence, adjacent repeated rhythms, repeated locations, and long gaps without action or quiet reflection, with navigation back to each affected scene.

The History tab combines immutable manuscript revisions with AI proposal decisions. Every revision row now points to a matching content snapshot and hash, while the prior revision remains available for recovery. Revisions can be compared side-by-side with the current scene. Restore never rewinds or deletes history: it creates a new `undo` revision, making the operation auditable and reversible.

The Analysis workspace also includes deterministic continuity review. It detects reversed, orphaned, or overlapping character-state intervals; injuries and inventory that disappear without an event; promises broken before being made; unresolved promises; POV use of Voice Lock–avoided vocabulary; major/supporting character absence and long disappearance gaps; incomplete arc transitions; and conflicting canonical Story Bible facts. Every result includes evidence, correction strategies, severity/category filters, and manuscript navigation.

Analysis also offers persistent AI developmental review for a selected chapter or the whole manuscript. The user chooses a focus and sees the scene count and approximate input size before execution. Lillith assembles manuscript text, the active Author Voice profile, characters, Story Bible, and timeline into an inspectable package; oversized manuscripts use clearly disclosed bounded scene excerpts. Structured findings include the problem, manuscript evidence, relevant project knowledge, correction strategies, and affected-text navigation. Findings never rewrite text and can be added to the revision plan, deferred, or ignored.

The Visuals workspace contains a persistent story timeline and interactive relationship graph. Timeline events track story order, free-form or ISO story time, optional end time, canon status, participants, and manuscript links. The SVG relationship graph renders arrowed directional edges so A's feelings toward B remain distinct from B's feelings toward A, with selectable character nodes and asymmetric trust, affection, and fear details.

The Models workspace keeps provider and task routing local to the project. It supports remote and local providers, optional OS credential storage, discovered model lists, per-task routing, and opinionated presets for all-local or all-remote routing so a user can switch the project between workflows quickly. The publishing workflow also carries a later trilogy/series mode in metadata so a single-book project can be promoted into a set without reworking the core workflow model.

The Pipelines workspace seeds all sixteen requested revision presets and supports custom ordered passes. Each pass can define instructions, characters, chapters/scenes, model assignment, context sources, creativity, change limits, output format, and mandatory review. A pass can run immediately on the current selection through the tracked AI workflow, or materialize a chapter-scale resumable queue with one item per pass/document pair.

The publishing workflow currently treats the project as a sequence of operational phases: project creation, discovery, outline, draft, development, continuity, character voice, narrative weight, trust the reader, proof and integrity, production, cover, metadata, preview QA, publication, marketing, and archive. The gate is designed to say exactly which checklist items are incomplete and whether they are blocking, warning-level, optional, skipped, or not applicable.

## Repository map

```text
docs/                 architecture, schema, workflows, roadmap, risks
src/                  React application and domain contracts
src/components/       manuscript, character, and AI editor surfaces
src/lib/              repository, context, and provider boundaries
src-tauri/             Tauri shell and Rust SQLite services
python/               optional document-processing sidecar boundary
tests/                 end-to-end tests (roadmap)
```

## Local project layout

User-created projects are ordinary folders. See `docs/PROJECT_STRUCTURE.md`. Manuscript content is kept as portable HTML/Markdown-compatible section files; the database stores metadata, indexes, state, canonical facts, proposals, and revision lineage. SQLite WAL mode and atomic file writes protect autosave. Snapshots live inside the project and can be copied without the application.

## Security and privacy

- API keys must be written to the OS credential store (Keychain, Credential Manager, or Secret Service). The database stores only a lookup label.
- Remote-provider requests show the exact context package before execution.
- Local endpoints are opt-in and validated against an allowlist of user-configured URLs.
- Project exports exclude settings and credentials.
- Logs redact authorization headers, manuscript excerpts, and prompts by default.

## Development commands

```bash
npm run build       # type-check and production frontend build
npm test            # unit/component tests
cargo test --manifest-path src-tauri/Cargo.toml
```

## Documentation

- [Product vision](docs/PRODUCT_VISION.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Architecture decisions](docs/DECISIONS.md)
- [Data model](docs/DATA_MODEL.md)
- [SQLite schema](docs/DATABASE.md)
- [Project folder format](docs/PROJECT_STRUCTURE.md)
- [Character system](docs/CHARACTER_SYSTEM.md)
- [AI Editor](docs/AI_EDITOR.md)
- [AI and context contracts](docs/AI_CONTRACTS.md)
- [Retrieval and context](docs/RETRIEVAL_CONTEXT.md)
- [Author workflow](docs/AUTHOR_WORKFLOW.md)
- [Tracked-change workflow](docs/TRACKED_CHANGES.md)
- [Obsidian integration](docs/OBSIDIAN_INTEGRATION.md)
- [Security and privacy](docs/SECURITY_AND_PRIVACY.md)
- [Import and export](docs/IMPORT_EXPORT.md)
- [Vertical slice](docs/VERTICAL_SLICE.md)
- [Risk register](docs/RISK_REGISTER.md)
- [Roadmap](docs/ROADMAP.md)

## Publishing workflow notes

- The publishing checklist is local-first and stored with the project.
- Checklist items can complete automatically from project evidence, or be completed/reopened manually.
- Publication readiness is format-specific: Kindle, paperback, and hardcover can each be ready independently.
- Series/trilogy support is prepared at the data-model level so later books can inherit shared metadata, branding, and continuity without reworking the checklist system.

## Current boundaries

Reviewed multi-format import/export including a KDP paperback DOCX preset, remote/local provider execution, secure credentials, local semantic and research retrieval, transactional binder reordering, focus/split editing, and resumable revision-pipeline execution are implemented. Pipeline passes honor their assigned provider/model or task route, persist failures for retry, and create full-scene tracked proposals that must be accepted, rejected, or deferred in Revision History. Higher-quality optional embedding adapters and fully self-contained Python runtime packaging remain later units.

## License

Private personal project. No license is granted for redistribution.
