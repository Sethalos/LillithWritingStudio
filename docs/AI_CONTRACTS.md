# AI, context, Voice Lock, and state contracts

This document records the current low-level contracts. Product behavior and operation policy are defined in [AI_EDITOR.md](AI_EDITOR.md); retrieval behavior is defined in [RETRIEVAL_CONTEXT.md](RETRIEVAL_CONTEXT.md).

The executable TypeScript contracts live in `src/domain/ai.ts` and `src/domain/models.ts`. This document records semantics that types alone cannot enforce.

## Provider interface

Providers report capabilities and models, estimate tokens, generate or stream normalized chunks, and optionally embed. A provider receives a prompt plus a `contextPackageId`; it does not decide what project data to retrieve. Task routing is separate and stores provider ID, model ID, creativity, output limit, and credential reference.

OpenAI-compatible configuration contains a user-visible name, base URL, optional organization/project headers, credential reference, and model allowlist. Ollama, vLLM, and LM Studio use this adapter initially. Remote/local classification is explicit and shown in the execution confirmation.

## Context package v1

Every package identifies the task, exact target/range, story position, included items, deliberate exclusions, budget, token/cost estimate, assembler version, and timestamp. Each item includes content, provenance entity/version/hash, retrieval reason, relevance, token estimate, and pin status. Persisted packages make an AI result reproducible even after canon changes.

Budget order: mandatory instruction and selection; pinned items; relevant Voice Lock and state; hard world/timeline facts; current scene; relationships and revision decisions; lexical/semantic/proximity excerpts. Items are deduplicated by entity/version and content hash. Future-state facts are excluded from story-positioned work.

The immediate editing instruction and the durable author profile are distinct context items. `Requested editing action` records what the user asked for in this operation. `Author Voice & Project Rules` is the active immutable writing-profile version and contains POV, tense, dialect, rhythm, dialogue style, description density, preserve/avoid constraints, mechanics, project rules, and approved prose samples. The latter is pinned into editor and pipeline packages whenever a saved profile exists, and remains visible before any proposal is accepted.

Series continuity is stored separately from book-local Story Bible facts. Editor and pipeline assembly performs local FTS retrieval against non-rejected, non-superseded series records and pins relevant matches as `series-continuity`. Developmental review includes the current portable series canon directly in its inspectable package. Continuity packs are explicit versioned JSON files; importing a pack copies validated facts into the open project and never opens or mutates another project's database.

## Character Voice Lock

Voice Locks are versioned one-to-one records whose complete field set is represented by `VoiceLock`. List fields are stored as JSON arrays in SQLite to preserve author ordering. Approved/rejected examples are separate child rows in the database so each example can carry situation, addressee, emotion, provenance, and author note. The compact JSON representation is used at the UI/service boundary.

For dialogue operations the assembler includes only the speaking character's current Voice Lock, applicable emotional/state fields, addressee relationship, and a small number of most-similar approved/rejected examples. Rejected examples are clearly labelled as negative constraints.

## Dynamic character state

State is append-only and valid over a story-position interval. New information closes or supersedes applicable fields; it does not destroy history. Knowledge and belief records can reference the event/evidence that caused the change. Queries ask `state_at(character_id, position)` and reject records whose valid start follows the target.

The database normalizes high-value facts (knowledge, secrets, promises, inventory, injuries) for queries while `DynamicCharacterState` offers a convenient aggregate to the UI. Confidence applies only to proposed extraction; accepted/manual state is authoritative.

## Structured output

Editor responses validate as an issue plus rationale, manuscript evidence, relevant canon, correction strategies, and zero or more proposed changes. Invalid output is never treated as a proposal. The gateway may run one schema-repair attempt, then exposes a readable failure and raw response saved without secrets.

Chapter and manuscript developmental reviews use a separate non-mutating report contract. Each finding includes category, severity, problem, manuscript evidence, relevant character/world context, correction strategies, and only validated document IDs from the supplied package. Runs persist the exact context, model, token estimate/usage, and findings. Findings can be kept open, added to the revision plan, deferred, or ignored. Large manuscripts use explicitly labelled beginning/end excerpts rather than silently exceeding a model context window.
