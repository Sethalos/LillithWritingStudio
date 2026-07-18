# AI Editor

The AI Editor is an editorial workbench, not a generic chat panel. It turns a deliberate author request into inspectable findings or a reviewable manuscript proposal.

## Operation flow

1. The author selects a target and editing action.
2. Lillith resolves the task route and estimates context/cost.
3. The context assembler retrieves task-relevant project knowledge.
4. The author can inspect included and excluded context.
5. Rust executes the configured local or remote provider request.
6. Output is validated against the operation schema.
7. The result becomes findings, alternatives, or a tracked proposal.
8. The author accepts, rejects, edits, defers, or regenerates it.

No provider response directly mutates canonical text by default.

## Scope and actions

Operations may target a selection, scene, chapter, or manuscript. Selection operations include rewriting, expansion, condensation, clarity, prose, atmosphere, tension, emotion, subtext, dialogue, voice, sensory detail, physical action, exposition, repetition, pacing, horror, realism, tone, alternatives, and continuation.

Scene and chapter reviews produce evidence-backed findings for purpose, conflict, emotional movement, pacing, dialogue, repetition, passivity, structure, continuity, setting, atmosphere, tension, foreshadowing, technical realism, grammar, and prose. Manuscript review adds arc progression, POV distribution, disappearance gaps, repeated structures/locations/beats, stakes, setup/payoff, world rules, unresolved promises, and tonal drift.

## Editing modes

- **Suggest Only:** findings and strategies, no replacement text required.
- **Tracked Rewrite:** replacement text is proposed for review. This is the default.
- **Direct Apply:** immediate replacement only after explicit author enablement, with the same revision preconditions and snapshot protections. It must never be an implicit fallback.

## Context policy

Context is assembled from the current target, nearby manuscript sections, active characters, Voice Locks, applicable character states, directional relationships, arcs, timeline, Story Bible, world and location rules, research, past revision decisions, author profile, series continuity, and explicit pins. Retrieval combines structured queries, FTS5, semantic candidates, proximity, story-position filtering, deduplication, and token budgeting.

Every context item records source, version/hash, reason, relevance, token estimate, and whether it was pinned. The exact package is persisted. The entire manuscript is not sent by default.

## Provider boundary

Supported routes include OpenAI, Anthropic, Gemini, OpenRouter, Ollama, vLLM, LM Studio, and generic OpenAI-compatible endpoints. Roles may independently route primary editing, prose rewrite, character analysis, brainstorming, continuity, indexing, summarization, final polish, and research.

Credentials remain in the operating-system credential store. The interface reports provider, model, estimated/actual usage, configured cost, status, errors, and retry options.

## Output contract

An editorial proposal includes issue, rationale, manuscript evidence, repair strategies, replacement text where applicable, and a context-package reference. Invalid structured output may be repaired once or exposed as a visible failure; it must not be auto-applied.

Lower-level TypeScript contracts and current context schema are documented in [AI_CONTRACTS.md](AI_CONTRACTS.md).
