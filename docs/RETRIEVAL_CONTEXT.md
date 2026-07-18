# Retrieval and context

Lillith assembles bounded, task-specific model context rather than sending an entire manuscript for every operation.

## Candidate sources

- Current selection, scene, chapter, and nearby scenes
- Active and mentioned characters
- Voice Locks and applicable point-in-story state
- Directional relationships and character arcs
- Timeline events and story-time constraints
- Story Bible entities, facts, world rules, and locations
- Research linked to the active section
- Previous proposal decisions
- Author Voice and Project Rules
- Series continuity
- User-pinned items

## Assembly pipeline

1. Establish project, target document, story position, task, and budget.
2. Add mandatory pinned and target material.
3. Query structured character, timeline, and canon data with story-position filters.
4. Retrieve lexical FTS5, semantic, manuscript-proximity, and linked-research candidates.
5. Exclude rejected, superseded, future, stale, duplicate, and task-irrelevant items.
6. Rank by task relevance, provenance strength, story proximity, and author pins.
7. Fit items to the context budget without hiding exclusions.
8. Persist the exact package and content hashes before execution.

## Provenance

Every included item exposes its source, entity ID, version/hash, reason for inclusion, relevance, token estimate, and pinned state. Excluded sources may record a concise reason. Context preview is part of the trust boundary, not optional debugging UI.

## Current semantic adapter

The bundled local adapter uses normalized 256-dimensional feature-hash vectors and conservative synonym normalization. It works offline and can be replaced later by provider embeddings or `sqlite-vec` without changing the context-package contract.

## Temporal safety

Character states, facts, relationship changes, and timeline constraints must be evaluated at the active story position. Retrieval tests must prove that future knowledge does not enter earlier-scene context.

## Failure policy

Missing optional indexes degrade to structured/FTS/proximity retrieval. A failed retrieval source is reported and does not silently expand the request to the whole manuscript. Content hash changes invalidate cached chunks and summaries.
