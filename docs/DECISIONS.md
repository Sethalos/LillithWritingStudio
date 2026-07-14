# Architecture and product decisions

Decisions are append-only. Superseded decisions remain visible with a link to their replacement.

## ADR-001 — Local project files plus SQLite

**Status:** Accepted

**Decision:** Ordinary manuscript files remain portable while SQLite owns structure, canon, state, revisions, and indexes.

**Reason:** Combines author ownership with reliable queries and transactions.

## ADR-002 — Immutable AI proposals by default

**Status:** Accepted

**Decision:** Tracked Rewrite is the default. Model output does not immediately replace manuscript text.

**Reason:** Editorial usefulness must not weaken author control or recovery.

## ADR-003 — Story-positioned character intelligence

**Status:** Accepted

**Decision:** Character state and related facts use stable manuscript-node positions and validity intervals.

**Reason:** Characters evolve, and future knowledge must not leak backward.

## ADR-004 — Dashboard and Workflow are separate surfaces

**Status:** Accepted

**Decision:** Dashboard is the daily command center; Project Workflow retains premise, Creative North Star, discovery, readiness, and phase guidance.

**Reason:** The approved dashboard concept is operational, while existing workflow forms remain valuable planning tools.

## ADR-005 — Approved command-center shell direction

**Status:** Accepted

**Decision:** Follow the supplied dark desktop concept as closely as practical: global top navigation, categorized sidebar, responsive card grid, and persistent status bar. Existing functionality takes precedence over pixel matching when they conflict. The product name remains Lillith Writing Studio.

**Reason:** This structure matches the author's vision and provides fast access to a broad local authoring system.

## ADR-006 — Findings-first dashboard health

**Status:** Accepted

**Decision:** Health cards prioritize transparent findings, labels, evidence, and recommendations. Percentages are secondary and must disclose formula, analyzed scope, contributing findings, confidence, and deterministic/AI origin.

**Reason:** Manuscript improvement matters more than decorative scoring.

## ADR-007 — Master Obsidian vault by default

**Status:** Accepted

**Decision:** Support both a master vault and independent project vaults. Default to one `Lillith Studio Vault` with `_Master` reusable knowledge and one folder per project.

**Reason:** A master vault supports series and reusable author knowledge while preserving optional project isolation.

## ADR-008 — Conservative one-way Obsidian synchronization in Version 1

**Status:** Accepted

**Decision:** Export approved SQLite data, preserve author-written Markdown, detect external edits, report conflicts, and never import external edits into canon automatically. Design mappings for later controlled two-way review.

**Reason:** Lillith needs one unambiguous structured authority before attempting merge behavior.

## ADR-009 — Approved development sequence

**Status:** Accepted

**Decision:** Reconcile documentation, build the new shell, build the functional data-driven dashboard, implement conservative Obsidian sync, then improve tracked-change granularity.

**Constraint:** Dashboard work must not displace the higher product priorities of Character Studio, AI Editor, Tracked Rewrite, project memory, and story workflow.

## Unresolved decisions

- Rich-text diff segmentation and how formatting marks attach to partial accept/reject operations.
- Dashboard card customization for the first shell release.
- Exact score normalization formulas, if percentage health summaries are retained.
- Archive behavior for Obsidian pages whose source records are deleted or superseded.
