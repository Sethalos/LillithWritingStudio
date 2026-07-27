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

## Checklist status

- [x] 1. Draft request → conversational reply plus a proposal card
- [x] 2. Approve → prose appends to the manuscript, card disappears
- [ ] 3. Discussion question → no card *(blocked by #1 — the discussion reply broke before a
      card could be judged; note that no spurious card appeared, so the risk originally
      flagged did not materialize)*
- [ ] 4. Draft then Discard
- [ ] 5. Post-Approve recovery from History
