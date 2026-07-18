# Product vision

Lillith Writing Studio is a private, local-first author operating system for one writer. It supports novels and multi-book series from first idea through revision and publication preparation. It is not a SaaS product, a collaboration platform, or a chatbot attached to a word processor.

## Product promise

The author can open a novel, select a passage, ask the AI Editor to perform a specific editorial operation with relevant character and project memory, inspect exactly what context was used, and safely accept or reject a transparent tracked revision without losing the original work.

## Product hierarchy

1. Character Studio is the heart of character intelligence.
2. AI Editor performs concrete manuscript work.
3. Tracked Rewrite keeps every proposed change reviewable and reversible.
4. Project and series memory preserve continuity across long works.
5. Story Workflow helps the author see the next useful step without forcing a rigid process.
6. Dashboard is the command center that reveals current work, evidence, and routes into these systems.

The dashboard must not become a substitute for the writing workflow. Visual polish and summary scores are secondary to reliable editing, evidence, and action.

## Product principles

- Local SQLite and ordinary project files remain the durable source of truth.
- The author retains final control over manuscript text and canon.
- AI suggestions are proposals unless Direct Apply is explicitly enabled for an operation.
- AI context is task-specific, inspectable, bounded, and persisted with provenance.
- Characters are evolving psychological and narrative models, not biography cards.
- Analysis explains findings and links to manuscript evidence.
- Obsidian is a human-readable knowledge layer, not a replacement database.
- Large manuscripts are processed section by section and never mounted as one editor document.
- The application remains usable without a cloud account and with local models where practical.

## Deployment boundary

Lillith is single-user, desktop-first, Linux-compatible, private, and offline-capable where practical. It does not require registration, billing, public sharing, team permissions, or multi-tenant infrastructure. Remote AI providers are optional and explicitly configured by the author.

## Experience direction

The primary shell follows the approved dark desktop command-center concept: global top navigation, a categorized left sidebar, a responsive data-backed dashboard, and a persistent system-status bar. The application name remains **Lillith Writing Studio**.

The shell should expose project identity, manuscript progress, current focus, active characters, open findings and threads, timeline, revision activity, tasks, model status, backups, and Obsidian status. Every summary must route to the underlying workspace or evidence.

## Non-goals

- Commercial SaaS features
- Autonomous or silent manuscript rewriting
- Obsidian as a second canonical structured store
- Decorative dashboards populated with invented data
- A single universal quality score
- Replacing established functionality merely to match a visual reference
- Rendering an entire book or series in one rich-text editor instance

## Success measures

- Author work survives interruption and remains portable.
- Character voice and point-in-story knowledge appear in relevant AI operations.
- Every accepted AI change is attributable and recoverable.
- Analysis findings identify evidence, method, confidence, and a useful next action.
- The dashboard shortens the path from opening a project to meaningful manuscript work.
- Approved structured knowledge can be exported safely to an Obsidian vault without overwriting manual notes.
