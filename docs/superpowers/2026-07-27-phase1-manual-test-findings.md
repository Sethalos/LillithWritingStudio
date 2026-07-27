# Phase 1 (Place Prose) — Manual Test Findings, 2026-07-27

Live desktop session against a real project. The core Phase 1 loop **works**: Lillith
proposed a world-building passage, the card rendered, **Approve** appended it to the
manuscript. Steps 1 and 2 of the manual checklist pass.

Five defects surfaced during the same session, listed worst-first.

---

## 1. Truncated reply renders as raw JSON (blocker)

**Symptom.** A long creature-list reply displayed in the chat bubble as literal JSON —
`{"text":"Great starting mix. ...` with visible `\n` escapes — and stopped mid-sentence
at "The **Grief Eaters** and **Unmoored** should be", with no closing quote or brace.

**Root cause — two layers.**

*Layer A, the truncation:* `src/components/AiPanel.tsx:172` hardcodes
`maxOutputTokens: 1200` (~900 words). The reply exceeded it, so the provider cut the
model off mid-string.

*Layer B, the raw-JSON display:* `parseAssistantMessage` in `src/lib/manuscriptProposal.ts`
treats "didn't parse as JSON" as "is plain prose" and returns the raw string. A *truncated*
JSON object is neither — it starts with `{`, fails `JSON.parse`, and falls through to the
plain-text branch, which dumps the wire format to the user. `parse_chat_output` in
`src-tauri/src/providers.rs` has the identical fallthrough.

**Why this is new.** Before Phase 1, replies were plain text and truncation merely lost the
tail — ugly but readable. Phase 1 wrapped *every* reply in JSON, so truncation went from
cosmetic to catastrophic. This is a robustness regression the plan introduced and the unit
tests missed: `treats malformed JSON as plain text` covers `'{"text":"broken'`, asserts the
raw string comes back, and calls that correct. It is correct for a model that never intended
JSON; it is wrong for a model that was cut off.

**Confirmed by reproduction** — truncated JSON throws `Unterminated string in JSON at
position 194` and falls through to the raw-text branch.

**Fix direction.** Raise the cap substantially (drafting prose needs far more than 1200
tokens; the desktop default in `src-tauri/src/lib.rs:215` is also 1200). Then make the
fallback truncation-aware: if the text starts with `{` and fails to parse, salvage the
`"text"` field rather than dumping the wire format, and mark the reply as incomplete.

## 2. Lillith denies she can add to the manuscript

**Symptom.** Asked to "add that Prologue to the story above," she replied "I can't directly
insert text into the manuscript window from here... ready to paste."

**Root cause.** `buildSystemPrompt` still carries the pre-Phase-1 instruction at
`AiPanel.tsx:51`: *"When the user asks for prose, produce usable text the user can paste
into the manuscript."* That directly contradicts the proposal contract added at line 54 and
teaches her the paste workflow. She has the capability and is telling the user she doesn't.

## 3. Drafted prose lands in `text` instead of `proposal`

**Symptom.** The prologue draft came back as conversational text with no card, so there was
nothing to approve. The world-building draft, asked for almost identically, *did* produce a
card.

**Root cause.** Likely the same contradiction as #2, plus the contract's "ONLY when" framing
being easy to under-trigger. Inconsistent between turns, so it needs a prompt-level fix and
a way to recover when she gets it wrong.

## 4. Lillith reads only the tail of the manuscript

**Symptom.** Asked for the first sentence she could see, she answered "did not make the
absence lighter" — mid-sentence, and she saw a POSTSCRIPT rather than the prologue.

**Root cause.** `AiPanel.tsx:46` — `chapter.slice(-16000)` keeps the **last** 16k characters.
Working as written, but tail-biased: on a long chapter she cannot see the opening, which is
exactly what a writer asks about when starting a novel. Behaves correctly and confusingly at
the same time; the "[Earlier text omitted]" marker is in the prompt but she doesn't surface
that limit to the user.

## 5. Missing cover artwork next to the title (cosmetic)

**Symptom.** Opening an existing file shows no artwork to the left of the title — just "ME"
and a book icon, i.e. the initials/placeholder fallback instead of the project's cover image.

Lowest priority, purely visual. Not yet investigated.

---

## Resolution (Plan A, 2026-07-27)

Items 1–4 are fixed by the manuscript-tree-and-toolbar plan (14 commits, `db7f811..5773271`).
Item 5 (missing cover artwork) is untouched and still open.

The truncation fix needed two rounds. The first pass raised the token cap and taught both
parsers to salvage prose from cut-off JSON — but a final whole-branch review found the
desktop path still broken: `parse_chat_output`'s fence-stripping chain used
`.strip_suffix("```").unwrap_or(raw.trim())`, and that fallback undid the prefix strip. With
no closing fence — exactly what truncation produces — `cleaned` reverted to the fenced
original, failed its `starts_with('{')` guard, and skipped the salvage entirely. The bug this
work existed to kill was still live on the path the writer actually uses. The per-task
reviews could not see it; only the whole-branch pass did.

A related regression was caught in the same review: the system prompt directs drafted prose
into `proposal.text`, so a long draft truncates *inside the proposal*. The salvage recovered
only the short conversational `text` and returned no proposal — leaving a cheerful one-liner,
no Approve card, and no warning, with the prose gone. Previously the writer at least saw raw
JSON containing it. A `truncated` flag now threads from the Rust parser through to a visible
"this reply was cut off" note on the message.

## Vault node operations (2026-07-27, second plan)

The manuscript tree could navigate but not much else, because `open_vault_project`
populates `VaultState` while `create_manuscript_node`, `update_manuscript_metadata`,
`reorder_manuscript_nodes` and the workflow-state commands are bound to
`AppState.repository` — 73 commands to 5. On a vault project every one failed with
"Open a project first". Create, rename, delete and project settings are now vault-native
(9 commits, `77ba6ed..bac6c7d`).

A whole-branch review caught a Critical the per-task reviews could not see: the pre-delete
git snapshot used `let _ = vault::git_commit(...)`, discarding the only thing protecting the
writer. A vault with no `.git` — copied to another machine, restored from a zip, or created
while `git` was off the PATH — would have deleted a chapter irrecoverably while the app
claimed to snapshot first. `vault::is_git_repo_root` now requires `rev-parse --show-toplevel`
to canonicalize to the vault itself, which also closes a second hole: a vault nested inside
another repo would have staged and committed the user's entire unrelated worktree.

**Renaming and deleting are scene-only.** `build_workspace` synthesizes `book-root` and a
`chapter-root` titled "Manuscript"; neither is a real file, so neither offers rename or
delete. Every real vault chapter is a `kind:"scene"` node beneath them — the vault is flat.

### Known-unpinned after the final review

Behaviour is correct and verified; these lack permanent regression tests:

- `scene_node_is_the_single_source_of_the_scene_dto` passes with its fix reverted, and does
  not touch the two `lib.rs` sites the finding was about.
- Both `workflowRepository.test.ts` first-run/propagation tests pass with their fix reverted.
  The load-bearing pin is the Rust `workflow_state_is_none_when_no_project_is_open`.
- The propagated-commit-failure branch of the delete precondition was verified by hand
  (a failing `pre-commit` hook) but has no permanent test.

### Known-live minors from that plan

- The header `+` targets the first chapter rather than the active one. Invisible on the vault
  path (flat, one synthetic chapter); reachable only in browser-preview mode.
- Two overlapping `saveWorkflow` calls can have a late rejection roll back the newer field.
  Self-corrects on the next successful save.
- A save-failure banner is cleared by the next manuscript edit, because the load effect
  depends on `nodes`. Nothing false is shown afterwards — the rollback already restored
  correct state — but the warning can vanish before it is read.

## Known-live minor issues

- **Spurious "Save conflict — reopen section".** Switching scenes while a debounced autosave
  is still in flight issues a second write at the same revision, which the backend rejects.
  No data loss — both writes carry identical text — but the banner is a false alarm.
- **`parse_editor_output` still carries the old fence-chain shape** (`providers.rs:138`). A
  complete editing proposal whose closing fence the model omitted is rejected rather than
  parsed. One-line fix using the new `strip_code_fence` helper; was out of the fix wave's
  scope.
- **`.chat-truncated-note` loses its styling** to `.chat-message p` on specificity
  (`styles.css:332` vs `:322`). The warning is legible, just not styled as intended.

## Open decision: scenes cannot be renamed

The tree creates scenes titled `"New scene"`, and there is no rename path anywhere in the
app — `updateManuscriptMetadata` covers goal, word goal, tags, POV, type and location, but
not `title`, and `EditorPane` renders `document.title` read-only. Rename and delete were
deliberately deferred from Plan A because they need new Tauri commands and destructive vault
file operations. Adding creation without rename means the tree fills with rows called
"New scene", which is the opposite of the plan's stated purpose. The final reviewer
recommends reopening that deferral before the tree sees real use.

## Checklist status

- [x] 1. Draft request → conversational reply plus a proposal card
- [x] 2. Approve → prose appends to the manuscript, card disappears
- [ ] 3. Discussion question → no card *(blocked by #1 — the discussion reply broke before a
      card could be judged; note that no spurious card appeared, so the risk originally
      flagged did not materialize)*
- [ ] 4. Draft then Discard
- [ ] 5. Post-Approve recovery from History
