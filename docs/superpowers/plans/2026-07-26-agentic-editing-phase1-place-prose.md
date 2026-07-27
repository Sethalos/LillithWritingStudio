# Agentic Manuscript Editing — Phase 1 (Place Prose) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Status (2026-07-27):** Tasks 1–3 implemented and committed (`b373eea`, `a334706`, `d18ac0d`), plus a code-review consistency pass (`8514924`). Automated gates green: 51 vitest tests across 23 files, 65 cargo tests, `npm run build` clean. **Remaining:** the manual desktop verification below.

**Goal:** Let Lillith (the building chat) propose *adding* drafted prose to the manuscript as an approve/discard card — never auto-applied.

**Architecture:** The model returns a JSON reply with an optional `proposal: {action:"append", text}`. Both the desktop path (Rust `parse_chat_output`) and the browser path (TS `parseAssistantMessage`) validate it and surface `ChatResponse.proposal`. The building chat stores it on the assistant `ChatEntry` and renders a proposal card; **Approve** reuses the existing, git-reversible `keepChatText` append (via the `onKeepText` prop); **Discard** dismisses it. Nothing touches the manuscript without a click.

**Tech Stack:** React + TypeScript (Vite), Rust (Tauri), vitest + @testing-library/react (jsdom), cargo test.

## Global Constraints

- **Never auto-apply.** No manuscript mutation without an explicit per-proposal Approve click. The backend parses/validates but never applies; application is front-end and user-gated.
- **Reversibility is inherited.** Approve appends via the existing `keepChatText` path, which autosaves and creates a document revision (one-undo recoverable via History). Phase 1 adds no new snapshot code.
- **Phase 1 action vocabulary is `append` only.** Reject any other `action` value (kept for later phases).
- **Staging rule (this branch):** commit by **exact path only** — never `git add -A` / `git add .`. This working tree may carry unrelated WIP.
- **Commit trailer:** end every commit message with `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- **Green gates:** `npm run build` (tsc + vite) and, for Rust changes, `cargo test --manifest-path src-tauri/Cargo.toml --offline` must pass.

## File Structure

- Create `src/lib/manuscriptProposal.ts` — the `ManuscriptProposal` parser/validator for the browser path and shared use.
- Create `src/lib/manuscriptProposal.test.ts` — unit tests for the parser.
- Modify `src/domain/ai.ts` — add the `ManuscriptProposal` type and `ChatResponse.proposal`.
- Modify `src/lib/providerBrowserApi.ts` — `browserChat` attaches a parsed proposal.
- Modify `src-tauri/src/providers.rs` — `ChatOutput.proposal` + `parse_chat_output` + tests.
- Modify `src-tauri/src/lib.rs` — `run_ai_chat` maps `proposal` into its JSON result.
- Modify `src/components/AiPanel.tsx` — `ChatEntry.proposal`, `sendChat` wiring, system-prompt contract, the proposal card + approve/discard, persist-strip.
- Modify `src/components/AiPanel.test.tsx` — a building-chat proposal-card test.
- Modify `src/styles.css` — proposal-card styles.

---

### Task 1: Shared TypeScript proposal parser + type

**Files:**
- Modify: `src/domain/ai.ts` (add `ManuscriptProposal`, extend `ChatResponse`)
- Create: `src/lib/manuscriptProposal.ts`
- Test: `src/lib/manuscriptProposal.test.ts`

**Interfaces:**
- Produces: `interface ManuscriptProposal { action: "append"; text: string }` (in `src/domain/ai.ts`); `ChatResponse.proposal?: ManuscriptProposal`; `parseAssistantMessage(raw: string): { text: string; proposal: ManuscriptProposal | null }` (in `src/lib/manuscriptProposal.ts`).

- [x] **Step 1: Write the failing test**

Create `src/lib/manuscriptProposal.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { parseAssistantMessage } from "./manuscriptProposal";

describe("parseAssistantMessage", () => {
  it("returns plain text with no proposal for a non-JSON reply", () => {
    const result = parseAssistantMessage("Here are three ideas for the opening.");
    expect(result.text).toBe("Here are three ideas for the opening.");
    expect(result.proposal).toBeNull();
  });

  it("extracts an append proposal from a JSON reply", () => {
    const raw = JSON.stringify({ text: "I drafted the opening.", proposal: { action: "append", text: "The rain came sideways that night." } });
    const result = parseAssistantMessage(raw);
    expect(result.text).toBe("I drafted the opening.");
    expect(result.proposal).toEqual({ action: "append", text: "The rain came sideways that night." });
  });

  it("ignores a proposal with an unsupported action", () => {
    const raw = JSON.stringify({ text: "Revised.", proposal: { action: "replace", text: "x" } });
    expect(parseAssistantMessage(raw).proposal).toBeNull();
  });

  it("ignores an append proposal with empty text", () => {
    const raw = JSON.stringify({ text: "Ok.", proposal: { action: "append", text: "   " } });
    expect(parseAssistantMessage(raw).proposal).toBeNull();
  });

  it("strips a ```json code fence before parsing", () => {
    const raw = "```json\n" + JSON.stringify({ text: "Done.", proposal: { action: "append", text: "A line." } }) + "\n```";
    const result = parseAssistantMessage(raw);
    expect(result.text).toBe("Done.");
    expect(result.proposal).toEqual({ action: "append", text: "A line." });
  });

  it("treats malformed JSON as plain text", () => {
    const result = parseAssistantMessage('{"text":"broken');
    expect(result.text).toBe('{"text":"broken');
    expect(result.proposal).toBeNull();
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/manuscriptProposal.test.ts`
Expected: FAIL — cannot resolve `./manuscriptProposal`.

- [x] **Step 3: Add the type to `src/domain/ai.ts`**

Find the existing `ChatResponse` interface:

```ts
export interface ChatResponse {
  text: string;
  inputTokens?: number;
  outputTokens?: number;
}
```

Replace it with:

```ts
export interface ManuscriptProposal {
  action: "append";
  text: string;
}
export interface ChatResponse {
  text: string;
  proposal?: ManuscriptProposal;
  inputTokens?: number;
  outputTokens?: number;
}
```

- [x] **Step 4: Create `src/lib/manuscriptProposal.ts`**

```ts
import type { ManuscriptProposal } from "../domain/ai";

export interface ParsedAssistantMessage {
  text: string;
  proposal: ManuscriptProposal | null;
}

// A validated append proposal, or null. Phase 1 honors only "append" with non-empty text.
function validateProposal(value: unknown): ManuscriptProposal | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (record.action !== "append") return null;
  const text = typeof record.text === "string" ? record.text.trim() : "";
  if (!text) return null;
  return { action: "append", text };
}

// Interpret a raw assistant response. If it is a JSON object with a non-empty
// `text` field, use that as the reply and extract any valid `proposal`;
// otherwise treat the whole string as a plain-text reply with no proposal.
export function parseAssistantMessage(raw: string): ParsedAssistantMessage {
  const cleaned = raw
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  if (cleaned.startsWith("{")) {
    try {
      const json = JSON.parse(cleaned) as Record<string, unknown>;
      const text = typeof json.text === "string" ? json.text.trim() : "";
      if (text) return { text, proposal: validateProposal(json.proposal) };
    } catch {
      // fall through to plain-text handling
    }
  }
  return { text: raw.trim(), proposal: null };
}
```

- [x] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/lib/manuscriptProposal.test.ts`
Expected: PASS (6 passing).

- [x] **Step 6: Commit**

```bash
git add src/domain/ai.ts src/lib/manuscriptProposal.ts src/lib/manuscriptProposal.test.ts
git commit -m "$(printf 'Add manuscript append-proposal type and parser\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

### Task 2: Desktop path — parse the proposal in Rust

**Files:**
- Modify: `src-tauri/src/providers.rs` (`ChatOutput`, `parse_chat_output`, tests)
- Modify: `src-tauri/src/lib.rs` (`run_ai_chat` JSON mapping, ~line 215)

**Interfaces:**
- Consumes: the chat JSON contract (`{text, proposal:{action,text}}`).
- Produces: `ChatOutput.proposal: Option<ManuscriptProposal>` where `ManuscriptProposal { action: String, text: String }`, serialized camelCase into the `run_ai_chat` result as `proposal`.

- [x] **Step 1: Write the failing tests**

In `src-tauri/src/providers.rs`, inside `mod tests { ... }` (starts at the `mod tests` line), add these four tests next to the existing `parses_chat_output_as_plain_text` test:

```rust
    #[test]
    fn parses_append_proposal(){let output=parse_chat_output("{\"text\":\"I drafted it.\",\"proposal\":{\"action\":\"append\",\"text\":\"The door opened.\"}}").unwrap();assert_eq!(output.text,"I drafted it.");let proposal=output.proposal.expect("expected a proposal");assert_eq!(proposal.action,"append");assert_eq!(proposal.text,"The door opened.");}
    #[test]
    fn ignores_unsupported_proposal_action(){let output=parse_chat_output("{\"text\":\"Revised.\",\"proposal\":{\"action\":\"replace\",\"text\":\"x\"}}").unwrap();assert!(output.proposal.is_none());}
    #[test]
    fn ignores_empty_proposal_text(){let output=parse_chat_output("{\"text\":\"Ok.\",\"proposal\":{\"action\":\"append\",\"text\":\"   \"}}").unwrap();assert!(output.proposal.is_none());}
    #[test]
    fn plain_text_reply_has_no_proposal(){let output=parse_chat_output("Just thinking out loud.").unwrap();assert_eq!(output.text,"Just thinking out loud.");assert!(output.proposal.is_none());}
```

- [x] **Step 2: Run tests to verify they fail**

Run: `cargo test --manifest-path src-tauri/Cargo.toml --offline parses_append_proposal ignores_unsupported_proposal_action ignores_empty_proposal_text plain_text_reply_has_no_proposal`
Expected: FAIL to compile — `ChatOutput` has no field `proposal`.

- [x] **Step 3: Add the `ManuscriptProposal` struct and the `proposal` field**

In `src-tauri/src/providers.rs`, find:

```rust
#[derive(Debug, Serialize, Deserialize)]
pub struct ChatOutput {
    pub text: String,
}
```

Replace with:

```rust
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ManuscriptProposal {
    pub action: String,
    pub text: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ChatOutput {
    pub text: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub proposal: Option<ManuscriptProposal>,
}
```

- [x] **Step 4: Update `parse_chat_output` to extract the proposal**

In `src-tauri/src/providers.rs`, replace the whole `parse_chat_output` function (currently one line) with:

```rust
fn parse_manuscript_proposal(value:&Value)->Option<ManuscriptProposal>{let action=value.get("action").and_then(Value::as_str)?;if action!="append"{return None}let text=value.get("text").and_then(Value::as_str)?.trim();if text.is_empty(){return None}Some(ManuscriptProposal{action:"append".to_string(),text:text.to_string()})}
fn parse_chat_output(raw:&str)->Result<ChatOutput,String>{let cleaned=raw.trim().strip_prefix("```json").or_else(||raw.trim().strip_prefix("```")).unwrap_or(raw.trim()).strip_suffix("```").unwrap_or(raw.trim()).trim();if cleaned.is_empty(){return Err("The model returned an empty response".into())}if let Ok(json)=serde_json::from_str::<Value>(cleaned){if let Some(text)=json.get("text").and_then(Value::as_str){if !text.trim().is_empty(){let proposal=json.get("proposal").and_then(parse_manuscript_proposal);return Ok(ChatOutput{text:text.trim().to_string(),proposal})}}}Ok(ChatOutput{text:cleaned.to_string(),proposal:None})}
```

- [x] **Step 5: Run tests to verify they pass**

Run: `cargo test --manifest-path src-tauri/Cargo.toml --offline parses_append_proposal ignores_unsupported_proposal_action ignores_empty_proposal_text plain_text_reply_has_no_proposal`
Expected: PASS (4 passing). Also run the existing suite to confirm no regression: `cargo test --manifest-path src-tauri/Cargo.toml --offline parse_chat_output` — the existing `parses_chat_output_as_plain_text` still passes.

- [x] **Step 6: Map the proposal into the `run_ai_chat` result**

In `src-tauri/src/lib.rs`, find the `run_ai_chat` result line (~215):

```rust
Ok(serde_json::json!({"text":generated.output.text,"inputTokens":generated.input_tokens,"outputTokens":generated.output_tokens}))
```

Replace with:

```rust
Ok(serde_json::json!({"text":generated.output.text,"proposal":generated.output.proposal,"inputTokens":generated.input_tokens,"outputTokens":generated.output_tokens}))
```

- [x] **Step 7: Verify the desktop crate still compiles**

Run: `cargo test --manifest-path src-tauri/Cargo.toml --offline --no-run`
Expected: builds with no errors.

- [x] **Step 8: Commit**

```bash
git add src-tauri/src/providers.rs src-tauri/src/lib.rs
git commit -m "$(printf 'Parse manuscript append-proposal on the desktop chat path\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

### Task 3: Building-chat proposal card (browser wiring + UI + approve/discard)

**Files:**
- Modify: `src/lib/providerBrowserApi.ts` (`browserChat` returns the parsed proposal)
- Modify: `src/components/AiPanel.tsx` (`ChatEntry.proposal`, `sendChat`, `buildSystemPrompt`, card + handlers, persist-strip)
- Modify: `src/styles.css` (card styles)
- Test: `src/components/AiPanel.test.tsx`

**Interfaces:**
- Consumes: `parseAssistantMessage` (Task 1); `ChatResponse.proposal` (Task 1); the existing `onKeepText?: (text:string)=>void` prop (the safe append).
- Produces: a proposal card rendered under an assistant message when `entry.proposal` is set; `approveProposal(entryId)` / `discardProposal(entryId)` handlers.

- [x] **Step 1: Write the failing test**

In `src/components/AiPanel.test.tsx`, add this test inside the `describe("ai workspace", ...)` block (after the last `it`):

```ts
  it("shows an append proposal card in the building chat and applies it on approve", async () => {
    localStorage.setItem(
      "lillith:model-config:v1",
      JSON.stringify({
        providers: [
          { id: "p1", kind: "openai-compatible", location: "local", label: "Local", baseUrl: "http://127.0.0.1:8080/v1", hasCredential: false, enabled: true, headers: {} },
        ],
        routes: [
          { task: "brainstorm", label: "Brainstorming", description: "Ideas", providerId: "p1", modelId: "demo-model" },
        ],
      }),
    );
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{ message: { content: JSON.stringify({ text: "I drafted the opening for you.", proposal: { action: "append", text: "The rain came sideways that night." } }) } }],
          usage: { prompt_tokens: 8, completion_tokens: 20 },
        }),
      } as Response)),
    );

    const onKeepText = vi.fn();
    render(<AiPanel workflow={workflow} context={context} decision="pending" modelLabel="Local · demo-model" onDecision={() => undefined} onRun={() => undefined} running={false} selectedText="" onKeepText={onKeepText} currentManuscript="" />);

    fireEvent.change(screen.getByPlaceholderText(/message lillith/i), { target: { value: "Draft the opening paragraph" } });
    fireEvent.click(screen.getByRole("button", { name: /send message/i }));

    await waitFor(() => expect(screen.getByText(/wants to add this to your manuscript/i)).toBeVisible());
    expect(screen.getByText(/The rain came sideways that night\./)).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: /approve/i }));
    expect(onKeepText).toHaveBeenCalledWith("The rain came sideways that night.");
    await waitFor(() => expect(screen.queryByText(/wants to add this to your manuscript/i)).not.toBeInTheDocument());
  });
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/AiPanel.test.tsx`
Expected: FAIL — no "wants to add this to your manuscript" text (card not implemented; the browser path also does not yet surface a proposal).

- [x] **Step 3: Surface the proposal from the browser chat path**

In `src/lib/providerBrowserApi.ts`, add the import near the top (with the other `./` imports):

```ts
import { parseAssistantMessage } from "./manuscriptProposal";
```

Then find, at the end of `browserChat`:

```ts
  const payload = await parseJsonResponse(response, configuration.label);
  const text = responseText(payload, kind);
  if (!text) throw new Error("Provider returned no chat content.");
  const usage = usageCounts(payload, kind);
  return {
    text,
    inputTokens: usage.inputTokens ?? estimateTokens(system + messages.map((message) => message.content).join("")),
    outputTokens: usage.outputTokens ?? estimateTokens(text),
  };
```

Replace with:

```ts
  const payload = await parseJsonResponse(response, configuration.label);
  const raw = responseText(payload, kind);
  if (!raw) throw new Error("Provider returned no chat content.");
  const parsed = parseAssistantMessage(raw);
  const usage = usageCounts(payload, kind);
  return {
    text: parsed.text,
    proposal: parsed.proposal ?? undefined,
    inputTokens: usage.inputTokens ?? estimateTokens(system + messages.map((message) => message.content).join("")),
    outputTokens: usage.outputTokens ?? estimateTokens(parsed.text),
  };
```

- [x] **Step 4: Carry the proposal on the assistant chat entry**

In `src/components/AiPanel.tsx`, add `ManuscriptProposal` to the domain import. Find:

```ts
import type { ChangeProposal, ChatAttachment, ContextPackage, EditingMode, ProposalDecision } from "../domain/ai";
```

Replace with:

```ts
import type { ChangeProposal, ChatAttachment, ContextPackage, EditingMode, ManuscriptProposal, ProposalDecision } from "../domain/ai";
```

Then find the `ChatEntry` interface:

```ts
interface ChatEntry {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  attachments?: ChatAttachment[];
}
```

Replace with:

```ts
interface ChatEntry {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  attachments?: ChatAttachment[];
  proposal?: ManuscriptProposal;
}
```

- [x] **Step 5: Store the proposal when the reply arrives**

In `src/components/AiPanel.tsx`, inside `sendChat`, find:

```ts
      setChatEntries((all) => [
        ...all,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: response.text,
          createdAt: new Date().toISOString(),
        },
      ]);
```

Replace with:

```ts
      setChatEntries((all) => [
        ...all,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: response.text,
          createdAt: new Date().toISOString(),
          proposal: response.proposal ?? undefined,
        },
      ]);
```

- [x] **Step 6: Add the approve/discard handlers**

In `src/components/AiPanel.tsx`, immediately after the `keepChatSelection` function (it ends with `setKeepHint("");\n  };`), add:

```ts
  const approveProposal = (entryId: string) => {
    const entry = chatEntries.find((item) => item.id === entryId);
    if (!entry?.proposal || !onKeepText) return;
    onKeepText(entry.proposal.text);
    setChatEntries((all) => all.map((item) => item.id === entryId ? { ...item, proposal: undefined } : item));
  };

  const discardProposal = (entryId: string) => {
    setChatEntries((all) => all.map((item) => item.id === entryId ? { ...item, proposal: undefined } : item));
  };
```

- [x] **Step 7: Render the proposal card**

In `src/components/AiPanel.tsx`, inside the `if(onKeepText){return ...}` building-chat block, find the transcript `map` line and its end `:null}</article>)}`. Replace:

```tsx
:null}</article>)}
```

with:

```tsx
:null}{entry.role==="assistant"&&entry.proposal?<div className="manuscript-proposal" role="group" aria-label="Manuscript proposal"><div className="proposal-label"><Sparkles size={13}/> Lillith wants to add this to your manuscript</div><div className="proposal-preview">{entry.proposal.text}</div><div className="proposal-actions"><button type="button" className="proposal-approve" onClick={()=>approveProposal(entry.id)}><Check size={13}/> Approve</button><button type="button" className="proposal-discard" onClick={()=>discardProposal(entry.id)}><X size={13}/> Discard</button></div></div>:null}</article>)}
```

- [x] **Step 8: Keep proposals out of persisted history**

In `src/components/AiPanel.tsx`, find the persist mapping (in the `useEffect` that writes `storedKey`):

```ts
    const persistent=chatEntries.map(entry=>({...entry,attachments:entry.attachments?.map(({dataUrl:_,text:__,...attachment})=>attachment)}));
```

Replace with:

```ts
    const persistent=chatEntries.map(entry=>({...entry,proposal:undefined,attachments:entry.attachments?.map(({dataUrl:_,text:__,...attachment})=>attachment)}));
```

- [x] **Step 9: Run the component test to verify it passes**

Run: `npx vitest run src/components/AiPanel.test.tsx`
Expected: PASS (all tests, including the new proposal-card test).

- [x] **Step 10: Add the system-prompt contract (manual-verified)**

In `src/components/AiPanel.tsx`, in `buildSystemPrompt`, find the line:

```ts
    "Never overwrite manuscript text silently.",
```

Insert immediately after it:

```ts
    "Reply with a single JSON object. Always include a \"text\" field with your conversational message to the writer. ONLY when the writer has asked you to write or draft new prose to add to the manuscript, also include a \"proposal\" object: {\"action\":\"append\",\"text\":\"<the prose to add>\"}. Put that prose in proposal.text, not in text. Never include a proposal when brainstorming, outlining, discussing, or answering questions, and never invent a proposal the writer did not ask for.",
```

- [x] **Step 11: Add the card styles**

In `src/styles.css`, immediately after the `.keep-hint { ... }` rule (added in the prior keep-in-manuscript work), add:

```css
.manuscript-proposal { margin-top:10px; border:1px solid #c98f34; border-radius:10px; background:#231a0e; padding:10px 11px; }
.manuscript-proposal .proposal-label { display:flex; align-items:center; gap:6px; color:#f3ca79; font-size:11px; margin-bottom:7px; }
.manuscript-proposal .proposal-preview { max-height:150px; overflow:auto; white-space:pre-wrap; color:#ece2d0; font-size:12px; line-height:1.5; border-left:2px solid #c98f34; padding:2px 0 2px 9px; margin-bottom:9px; }
.manuscript-proposal .proposal-actions { display:flex; gap:8px; }
.manuscript-proposal .proposal-approve { display:flex; align-items:center; gap:5px; border:0; border-radius:8px; background:#e5a540; color:#1a1206; padding:6px 11px; font-size:11px; cursor:pointer; }
.manuscript-proposal .proposal-discard { display:flex; align-items:center; gap:5px; border:1px solid #5a4a34; border-radius:8px; background:transparent; color:#c9b48f; padding:6px 11px; font-size:11px; cursor:pointer; }
```

- [x] **Step 12: Full build gate**

Run: `npm run build`
Expected: tsc + vite build succeed with no errors.

- [x] **Step 13: Commit**

```bash
git add src/lib/providerBrowserApi.ts src/components/AiPanel.tsx src/components/AiPanel.test.tsx src/styles.css
git commit -m "$(printf 'Add building-chat append-proposal card (propose, approve, discard)\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

## Manual desktop verification (after Task 3)

Run `npm run tauri dev`, open a vault project, land in the manuscript view with Lillith's chat, then:

- [ ] 1. Ask Lillith to "draft the opening paragraph" → she replies conversationally **and** a card appears: "Lillith wants to add this to your manuscript" with the prose preview.
- [ ] 2. Click **Approve** → the prose appends to the manuscript (same behavior as Keep); the card disappears.
- [ ] 3. Ask her a discussion question (no prose request) → reply appears with **no** card.
- [ ] 4. Ask her to draft something, then click **Discard** → nothing is added; the card disappears.
- [ ] 5. Undo check: after an Approve, the pre-append state is recoverable from **History**.

**Known risk to watch for in step 3:** the JSON-reply contract in `buildSystemPrompt` now applies to *every* building-chat turn. If a model ignores it and answers in prose, the parsers fall through to plain text (covered by tests), but a model that wraps a normal chat answer in a stray `proposal` would show a spurious card. Note which model/route you test with.

## Out of scope (later phases)

- Rewrite/replace (Phase 2) and add-chapter/retitle (Phase 3).
- Any `action` other than `append`.
- Inserting at a cursor position (Phase 1 appends to the current chapter, exactly like Keep).
