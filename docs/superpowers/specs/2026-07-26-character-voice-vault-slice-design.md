# Character Voice → Dialogue: the first canon-vault slice

**Date:** 2026-07-26
**Status:** Approved in principle (design); pending written-spec review
**Kind:** Vertical slice — proves the canon-as-Obsidian-vault loop end-to-end on one entity type (character voice), then the pattern replicates to places (Atmosphere) and author voice (Author Polish).

## Why this slice

The redesign is moving canon from the legacy SQLite/localStorage store into the markdown
vault, stored as **Obsidian-compatible linked notes** so the same files serve three readers:
the writer (browsing in Obsidian), Lillith (capturing canon), and the editorial engines
(auditing prose against canon). See `2026-07-24-lillith-studio-redesign-design.md`.

Rather than design all canon types up front, we build **one thin vertical slice** —
character *voice* — end to end, and let the proven pattern carry to the other entity types.

## What already exists (we are relocating, not inventing)

- `src/domain/models.ts` already models character voice richly: `CharacterIdentity.mannerisms`
  plus a ≈28-field `VoiceLock` (vocabulary, sentence rhythm, formality, common phrases,
  verbal habits, frequent/avoided words, situational speech — under stress / angry / afraid /
  grieving / lying / to authority / to family — and approved/rejected dialogue examples).
- The Character panel (`src/components/CharacterPanel.tsx`) already edits all of it across
  Identity / Psychology / **Voice Lock** tabs.
- It persists today as part of the whole-character blob via the `save_character` Tauri command
  (`src/lib/characterRepository.ts`).
- The vault scaffolder (`src-tauri/src/vault.rs`) already creates a `characters/` folder.

Nothing consumes `VoiceLock` yet, and no dedicated Dialogue audit exists (there is a generic
`RevisionPass` pipeline and a deterministic `pacingEngine.ts`, but no voice-aware pass).

## The "one owner per fact" rule (how we avoid duplication)

Duplication is only harmful when the *same fact* has two owners that can disagree. We avoid it
by giving every fact exactly one owner, migrating canon **one category at a time**:

- After this slice, **character voice is owned solely by `characters/<Name>.md`.** The legacy
  character record stops carrying `voiceLock` entirely.
- Identity, psychology, relationships, arcs remain legacy-owned *for now* and migrate in later
  slices, each leaving the legacy store as it lands in a note.
- The only thing shared across stores is the character's **id/name** — a key, not a fact.

At no point does a voice fact live in two places, so there is nothing to drift.

## Design

### 1. The note: `characters/<Name>.md`

An Obsidian-native note. Filename derived from `identity.fullName` (slugified); the stable
`id` lives in frontmatter so renames are safe later.

- **Frontmatter (YAML)** — the stable key and the naturally list-shaped, queryable voice
  fields: `id`, `name`, `aliases`, `type: character`, `tags`, and under `voice:` —
  `mannerisms`, `common_phrases`, `verbal_habits`, `frequent_words`, `avoided_words`,
  `approved_examples`, `rejected_examples`.
- **Body (Markdown)** — the prose voice fields as readable `##` sections (Vocabulary,
  Sentence rhythm, Formality, Humour, Spoken-dialogue style, Under stress, When angry, …,
  Speaking to family). Each field maps to a fixed heading so the round-trip is lossless.

The mapping is deterministic in both directions (struct → markdown and markdown → struct) so
that a note authored/edited in Obsidian round-trips cleanly back into the Voice Lock tab.

### 2. Storage: vault owns the note; Voice Lock tab is repointed

- New backend functions in `src-tauri/src/vault.rs` (+ thin Tauri commands in
  `vault_commands.rs`): `read_character_note`, `write_character_note`, `list_character_notes`,
  serializing the `VoiceLock` struct ↔ the note format above.
- `src/lib/characterRepository.ts`: the Voice Lock tab's load/save route to these commands on
  the desktop path; `save_character` no longer persists `voiceLock`.
- Identity/Psychology tabs are untouched.
- A one-time, deterministic **seed**: on first load of a character that has legacy `voiceLock`
  data but no note, write the note from that data (migration), then the legacy blob drops it.

### 3. Capture: Lillith proposes voice updates (never silent)

- A **Capture voice** action (on the character, and/or requestable in chat) asks Lillith to
  read the character's recent manuscript appearances plus the current note and *propose*
  additions/edits to the voice note — freshly-noticed tics, exemplar lines pulled from the
  actual prose, refined descriptions.
- Output is a **reviewable proposal** the writer approves/edits/rejects before anything is
  written. Consistent with the manuscript safety rule: no silent/background canon writes.

### 4. Audit: a voice-aware Dialogue pass reads the note

- A **Dialogue audit** action, available on a selected manuscript passage. It resolves the
  speaker(s) — starting from the scene's POV character, with a manual speaker picker as
  fallback — loads that character's voice note, and asks the model to flag lines that break
  the established voice.
- Output is **issues only** (line reference · what's off · suggested direction), reviewable,
  **never an auto-applied rewrite**. Reuses the existing proposal/decision plumbing in
  issues-only mode where practical.

## Build phasing (for the implementation plan)

Shippable in order; each phase leaves the app working:

- **Phase A — Storage + single-owner note.** Note format, vault read/write, repoint Voice Lock
  tab, seed-from-legacy migration, drop `voiceLock` from `save_character`.
- **Phase B — Dialogue audit.** Voice-aware audit reads the note, returns reviewable issues.
- **Phase C — AI capture.** Lillith proposes voice-note updates from the manuscript.

Phase A+B deliver a working voice-aware dialogue audit; Phase C adds the "she remembers what
I'd forget" capture the writer most wants.

## Verification

- **Round-trip:** edit voice in the Voice Lock tab → `characters/<Name>.md` updates; edit the
  note's markdown by hand → the tab reflects it, losslessly.
- **Single-owner:** after migration, `save_character` payload contains no voice fields; the
  note is the only place voice lives.
- **Capture:** ask Lillith to capture voice → she proposes changes → approving writes the note;
  rejecting changes nothing.
- **Audit:** select a passage with an out-of-voice line → Dialogue audit flags it as a
  reviewable issue and never alters prose.
- **Obsidian:** open the vault in Obsidian → `characters/<Name>.md` reads as a clean,
  human-readable note. (Full relationship *graph* arrives when relationships migrate in a later
  slice; this slice proves the note is first-class and link-ready.)

## Out of scope (later slices)

- Migrating identity / psychology / relationships / arcs to notes.
- Relationship `[[wikilinks]]` and the Obsidian graph of the full cast.
- Atmosphere (places) and Author Polish (author voice) audits — same pattern, later.
- Retiring the legacy store (happens once the last category has moved).
