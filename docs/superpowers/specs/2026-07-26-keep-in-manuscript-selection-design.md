# Keep-in-manuscript: chat-header action, selection-based

**Date:** 2026-07-26
**Status:** Approved (design)
**Surface:** The *building* chat — the embedded Lillith chat inside the manuscript view (`lillith-chat-simple` in `src/components/AiPanel.tsx`).

## Context

Lillith Writing Studio presents two chat surfaces with distinct jobs:

- **Building chat** (drafting / brainstorming): the embedded Lillith chat in the manuscript
  view. The writer generates prose here and *lifts finished text up into the manuscript*.
- **Polishing chat** (editing existing prose): the editorial flow that operates on a
  manuscript selection and proposes tracked changes to accept/reject. Its output goes back
  into existing prose as reviewed edits, not appended text — so it has no "Keep" action.

"Keep in manuscript" therefore belongs only to the building chat.

## Problem

Today every assistant message bubble carries its own **"Keep in manuscript"** button
(`AiPanel.tsx`, the `lillith-chat-simple` transcript), and each button appends the message's
*entire* text to the manuscript via `keepChatText` (`App.tsx`). Two issues:

1. The per-bubble buttons clutter the transcript.
2. It's all-or-nothing — the writer can't keep just the good sentence out of a longer reply.

## Design

**Placement**
- Remove the per-message "Keep in manuscript" button from every assistant bubble.
- Add a **single** "Keep in manuscript" button to the Lillith chat header
  (`lillith-chat-header`), right-aligned next to the model label.

**What it transfers**
- On click, read the live selection via `window.getSelection()`.
- Accept the selection **only if** it is non-empty **and** anchored inside the chat
  transcript element (`.chat-transcript`). This prevents grabbing a stray selection in the
  manuscript editor or the composer.
- Pass the selected plain text (`selection.toString()`) through the existing `keepChatText`
  logic unchanged: paragraph-wrap on blank lines, append to the current manuscript content.
- A selection spanning multiple messages is fine — the writer keeps exactly the highlighted
  run.

**No-selection case (chosen behavior: hint)**
- If there is no valid chat selection, append nothing. Show a brief, auto-clearing hint —
  **"Highlight text in the chat first"** — in the chat-notice area beneath the transcript
  (same region as the existing `simple-chat-error`). The hint clears itself after a few
  seconds.

**Validity check**
- A small local helper reads the current selection and returns the kept text, or `null` when
  the selection is empty or falls outside `.chat-transcript`. Kept inline in `AiPanel.tsx`;
  verified live rather than unit-tested, since it depends on live DOM selection with no pure
  data seam worth mocking.

## Out of scope / guardrails

- No change to `keepChatText`'s insertion or paragraph formatting.
- No change to how the manuscript stores text.
- No change to the standalone (non-embedded) `AiPanel` variant or the polishing/editorial flow.
- No new backend or Tauri command; this is front-end only.

## Verification

Manual desktop check:
1. Highlight part of a Lillith reply → **Keep** → only the highlighted text appends to the
   manuscript, paragraph-formatted.
2. Highlight across two messages → **Keep** → both highlighted runs append.
3. Click **Keep** with nothing highlighted → hint appears, nothing appends.
4. Select text in the manuscript editor (not the chat) → **Keep** → treated as no chat
   selection → hint appears.
