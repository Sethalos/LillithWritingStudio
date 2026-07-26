# Agentic manuscript editing (safe): Lillith proposes, you approve

**Date:** 2026-07-26
**Status:** Approved (design); pending written-spec review
**Surface:** The *building* chat — the embedded Lillith chat in the manuscript view.

## Why

Today Lillith can *read* the open chapter but can only get prose into the manuscript when the
writer highlights her text and clicks **Keep in manuscript**. The writer wants Lillith herself
to place, rewrite, and restructure manuscript content *on request* — the "cut and paste info
into the manuscript" capability — across the full action set (place new prose, rewrite existing
prose, add/retitle chapters).

An earlier **unsafe** version exists on `wip/chat-manuscript-action` (commit `7640b93`): chat
replies returned structured JSON (`text` + `manuscriptAction: append|replace` + `manuscriptText`
+ `intent`) and the app **auto-applied** it. `replace` could silently overwrite prose — a direct
violation of the "never silently overwrite the manuscript" safety rule. We keep that version's
*good bone* (a structured signal marking which part of a reply is meant for the manuscript) and
replace **auto-apply** with **propose → approve → git-reversible**.

## Core mechanism: the proposal card

Every manuscript action Lillith wants to take surfaces as a **card in the chat transcript** —
never as a silent mutation.

- Lillith replies normally. When part of her response is meant *for the manuscript*, the
  structured output attaches a **proposal** to that message.
- The card states **what** and **where**, with a **preview** (a text block, or a before/after
  **diff** for a rewrite) and **[Approve]** / **[Discard]**.
- **Approve** applies the change through a safe path that first writes a **local git snapshot**,
  so every applied change is one-undo reversible. **Discard** dismisses the proposal.
- Nothing reaches the manuscript without an explicit approve click. No background or automatic
  application, ever.

## Actions and safe targeting

| Action | Target | Apply path (existing infra) | Preview |
|---|---|---|---|
| **Place prose** (append) | end of the current chapter | `keepChatText` (append) | text block |
| **Rewrite** (replace) | the writer's **current manuscript selection** | tracked change: `acceptTrackedProposal` + git snapshot | before/after diff |
| **Add chapter** | after the current chapter / at end | `createManuscriptNode` | "New chapter: '…'" |
| **Retitle chapter** | a named or the current chapter | `updateManuscriptMetadata` | "Ch N → '…'" |

**Rewrite targets only the writer's highlighted selection** — Lillith rewrites what the writer
has pointed at, never a span she locates herself. This is the central guardrail on the
destructive path: no selection → no rewrite proposal (Lillith asks the writer to highlight the
passage first).

## Structured output

Extend the chat output (frontend `ChatResponse` in `src/domain/ai.ts`; backend `ChatOutput` in
`src-tauri/src/providers.rs`, parsed by `parse_chat_output`) with an optional `proposal`:

- `action`: `"append" | "replace" | "add-chapter" | "retitle"`
- `text?`: prose for append/replace
- `title?`: title for add-chapter/retitle
- The reply `text` (Lillith's conversational message) is always separate from proposal payload.

The backend validates/normalizes the proposal (invalid or empty → no proposal, plain chat), the
same defensive way `parse_chat_output` already handles malformed JSON. The frontend renders the
card and owns the apply-on-approve logic; the backend never applies anything.

## Relationship to the two-chat model

The building chat's **rewrite** and the polishing chat's **editorial passes** share the *same*
tracked-change substrate and git-snapshot apply path — two entry points, one safe mechanism. The
building chat is the conversational door ("Lillith, tighten this paragraph"); the polishing chat
is the structured-pass door. No duplication of the apply logic.

## Build phasing (each shippable, safest + highest-value first)

1. **Place prose.** Structured proposal → card → approve → append via `keepChatText` + snapshot.
   Answers the original request and builds the proposal-card infrastructure everything reuses.
2. **Rewrite selection.** Diff-preview card → approve → tracked-change apply (`acceptTrackedProposal`).
   The destructive path, done after the card infra is proven; selection-gated.
3. **Structure.** Add chapter / retitle, via the existing node-mutation repository functions.

## Safety invariants (hold for every phase)

- No manuscript mutation without an explicit per-proposal **Approve** click.
- Every applied change is preceded by a **local git snapshot** (one-undo reversible).
- **Rewrite/replace requires an active manuscript selection**; it can only replace that span.
- The backend parses/validates but **never applies**; application is front-end, user-gated.

## Verification

- **Place:** ask Lillith to draft a paragraph → card appears → Approve appends it; Discard leaves
  the manuscript untouched.
- **Rewrite:** highlight a passage, ask her to revise it → card shows a before/after diff →
  Approve replaces only the selection with a snapshot taken first; with no selection, she asks
  for one instead of proposing.
- **Add chapter / retitle:** request each → card previews the structural change → Approve mutates
  the chapter tree; Discard does nothing.
- **Reversibility:** after any approve, the prior state is recoverable from the git snapshot /
  History.
- **No auto-apply:** a reply carrying a proposal never changes the manuscript until Approve.

## Out of scope

- Silent/background application (excluded by design).
- Lillith locating rewrite targets herself (selection-gated only).
- Multi-chapter / whole-manuscript sweeping edits in one proposal (single-target per card).
