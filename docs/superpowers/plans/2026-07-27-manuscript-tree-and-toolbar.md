# Manuscript Tree and Restored Toolbar — Implementation Plan (Plan A)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the Story window a document tree so the writer can see where they are, and un-bury the editing toolbar that CSS currently hides.

**Architecture:** Pure tree logic lives in `src/lib/manuscriptTree.ts` (no React); `src/components/ManuscriptTree.tsx` is a thin presentational component taking props and firing callbacks. `App.tsx` owns state and persistence. The toolbar is restored by narrowing one CSS rule, folding the orphaned underline button into the toolbar row, and clamping the chat dock so prose keeps a floor. Task 1 first fixes the truncation defect that makes the chat unusable for long replies.

**Tech Stack:** React + TypeScript (Vite), Rust (Tauri), vitest + @testing-library/react (jsdom), cargo test.

## Global Constraints

- **Staging rule:** commit by **exact path only** — never `git add -A` / `git add .`. This tree may carry unrelated WIP.
- **Commit trailer:** end every commit message with `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.
- **Green gates:** `npm run build` and `npx vitest run` must pass. For Rust changes, `cargo test --manifest-path src-tauri/Cargo.toml --offline` must pass.
- **No data migration.** `ManuscriptNode` in `src/domain/models.ts:25` already has `parentId`, `position`, `kind`, `wordCount`. Do not change it.
- **Scope is manuscript-only.** Characters and World & Story Bible keep their existing workspaces.
- **Never auto-apply.** Nothing in this plan writes to the manuscript without a click.

## File Structure

- Modify `src/lib/manuscriptProposal.ts` — salvage text from truncated JSON.
- Modify `src/lib/manuscriptProposal.test.ts` — truncation tests.
- Modify `src/components/AiPanel.tsx` — raise token cap, surface truncation, remove stale paste instruction.
- Modify `src-tauri/src/providers.rs` — mirror the salvage in Rust.
- Modify `src-tauri/src/lib.rs` — raise the desktop default token cap.
- Create `src/lib/manuscriptTree.ts` — `buildTree`, `rollupWordCount`, `describePath`.
- Create `src/lib/manuscriptTree.test.ts` — unit tests.
- Create `src/components/ManuscriptTree.tsx` — the tree UI.
- Create `src/components/ManuscriptTree.test.tsx` — component tests.
- Modify `src/App.tsx` — mount the tree, wire selection and creation.
- Modify `src/components/EditorPane.tsx` — fold underline into the toolbar, clamp dock height.
- Modify `src/styles.css` — three-column grid, tree styles, narrowed hide rule.

---

### Task 1: Unblock the chat — truncation-safe parsing

**Files:**
- Modify: `src/lib/manuscriptProposal.ts`
- Modify: `src/lib/manuscriptProposal.test.ts`
- Modify: `src/components/AiPanel.tsx` (lines 51, 172)
- Modify: `src-tauri/src/providers.rs` (`parse_chat_output`)
- Modify: `src-tauri/src/lib.rs:215` (default cap)

**Interfaces:**
- Produces: `ParsedAssistantMessage { text: string; proposal: ManuscriptProposal | null; truncated: boolean }`.

- [ ] **Step 1: Write the failing tests**

Add to `src/lib/manuscriptProposal.test.ts` inside the existing `describe`:

```ts
  it("salvages the text field from JSON cut off mid-string", () => {
    const raw = '{"text":"Great starting mix.\\n\\n### 1. Gazer Maw\\nA pallid creature that';
    const result = parseAssistantMessage(raw);
    expect(result.text).toBe("Great starting mix.\n\n### 1. Gazer Maw\nA pallid creature that");
    expect(result.proposal).toBeNull();
    expect(result.truncated).toBe(true);
  });

  it("decodes escaped quotes while salvaging", () => {
    const raw = '{"text":"She said \\"no\\" and left the';
    expect(parseAssistantMessage(raw).text).toBe('She said "no" and left the');
  });

  it("marks complete replies as not truncated", () => {
    const raw = JSON.stringify({ text: "All done." });
    const result = parseAssistantMessage(raw);
    expect(result.text).toBe("All done.");
    expect(result.truncated).toBe(false);
  });

  it("still treats non-JSON prose as plain text", () => {
    const result = parseAssistantMessage("Just thinking out loud.");
    expect(result.text).toBe("Just thinking out loud.");
    expect(result.truncated).toBe(false);
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/manuscriptProposal.test.ts`
Expected: FAIL — `truncated` is undefined; the salvage tests return the raw JSON string.

- [ ] **Step 3: Implement the salvage in `src/lib/manuscriptProposal.ts`**

Add this function above `parseAssistantMessage`:

```ts
// Walk the value of the first `"text":"..."` pair, decoding escapes, and stop at
// the closing quote or at the end of the string. A reply cut off by the output
// token cap never closes its quote, so this recovers the prose the writer would
// otherwise see as raw JSON.
function salvageText(cleaned: string): string | null {
  const opener = /"text"\s*:\s*"/.exec(cleaned);
  if (!opener) return null;
  let out = "";
  let index = opener.index + opener[0].length;
  while (index < cleaned.length) {
    const character = cleaned[index];
    if (character === "\\") {
      const escape = cleaned[index + 1];
      if (escape === undefined) break;
      if (escape === "u") {
        const code = cleaned.slice(index + 2, index + 6);
        if (code.length < 4) break;
        out += String.fromCharCode(parseInt(code, 16));
        index += 6;
        continue;
      }
      out += escape === "n" ? "\n" : escape === "t" ? "\t" : escape === "r" ? "\r" : escape;
      index += 2;
      continue;
    }
    if (character === '"') break;
    out += character;
    index += 1;
  }
  const trimmed = out.trim();
  return trimmed ? trimmed : null;
}
```

Replace the `ParsedAssistantMessage` interface and the body of `parseAssistantMessage`:

```ts
export interface ParsedAssistantMessage {
  text: string;
  proposal: ManuscriptProposal | null;
  truncated: boolean;
}

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
      if (text) return { text, proposal: validateProposal(json.proposal), truncated: false };
    } catch {
      const salvaged = salvageText(cleaned);
      if (salvaged) return { text: salvaged, proposal: null, truncated: true };
    }
  }
  return { text: raw.trim(), proposal: null, truncated: false };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/manuscriptProposal.test.ts`
Expected: PASS (11 tests).

- [ ] **Step 5: Raise the token cap and drop the contradictory instruction**

In `src/components/AiPanel.tsx`, find line 172:

```ts
        maxOutputTokens: 1200,
```

Replace with:

```ts
        maxOutputTokens: 4096,
```

Then find, in `buildSystemPrompt`, line 51:

```ts
    "When the user asks for prose, produce usable text the user can paste into the manuscript.",
```

Replace with:

```ts
    "When the user asks for prose, produce usable text and offer it as a proposal the writer can approve into the manuscript with one click. Never tell the writer to copy or paste it themselves — you cannot edit the manuscript directly, but an approved proposal is applied for them.",
```

- [ ] **Step 6: Raise the desktop default cap**

In `src-tauri/src/lib.rs:215`, find:

```rust
let max_output_tokens=request.max_output_tokens.unwrap_or(1200);
```

Replace with:

```rust
let max_output_tokens=request.max_output_tokens.unwrap_or(4096);
```

- [ ] **Step 7: Write the failing Rust test**

In `src-tauri/src/providers.rs`, inside `mod tests`, add:

```rust
    #[test]
    fn salvages_text_from_truncated_chat_json(){let output=parse_chat_output("{\"text\":\"Great starting mix.\\n\\nA pallid creature that").unwrap();assert_eq!(output.text,"Great starting mix.\n\nA pallid creature that");assert!(output.proposal.is_none());}
```

- [ ] **Step 8: Run it to verify it fails**

Run: `cargo test --manifest-path src-tauri/Cargo.toml --offline salvages_text_from_truncated_chat_json`
Expected: FAIL — the raw JSON string is returned instead of the salvaged prose.

- [ ] **Step 9: Implement the Rust salvage**

In `src-tauri/src/providers.rs`, add above `parse_chat_output`:

```rust
fn salvage_chat_text(cleaned:&str)->Option<String>{let marker=cleaned.find("\"text\"")?;let rest=&cleaned[marker+6..];let quote=rest.find('"')?;let mut chars=rest[quote+1..].chars();let mut out=String::new();while let Some(character)=chars.next(){if character=='\\'{match chars.next(){Some('n')=>out.push('\n'),Some('t')=>out.push('\t'),Some('r')=>out.push('\r'),Some(other)=>out.push(other),None=>break}continue}if character=='"'{break}out.push(character)}let trimmed=out.trim();if trimmed.is_empty(){None}else{Some(trimmed.to_string())}}
```

Then in `parse_chat_output`, replace the final fallthrough line:

```rust
Ok(ChatOutput{text:cleaned.to_string(),proposal:None})
```

with:

```rust
if cleaned.starts_with('{'){if let Some(text)=salvage_chat_text(cleaned){return Ok(ChatOutput{text,proposal:None})}}Ok(ChatOutput{text:cleaned.to_string(),proposal:None})
```

- [ ] **Step 10: Run all gates**

Run: `cargo test --manifest-path src-tauri/Cargo.toml --offline` — expected PASS (66 tests).
Run: `npx vitest run` — expected PASS.
Run: `npm run build` — expected clean.

- [ ] **Step 11: Commit**

```bash
git add src/lib/manuscriptProposal.ts src/lib/manuscriptProposal.test.ts src/components/AiPanel.tsx src-tauri/src/providers.rs src-tauri/src/lib.rs
git commit -m "$(printf 'Salvage prose from replies truncated by the token cap\n\nCo-Authored-By: Claude Opus 5 <noreply@anthropic.com>')"
```

---

### Task 2: Tree logic

**Files:**
- Create: `src/lib/manuscriptTree.ts`
- Test: `src/lib/manuscriptTree.test.ts`

**Interfaces:**
- Consumes: `ManuscriptNode` from `src/domain/models.ts`.
- Produces: `interface TreeNode { node: ManuscriptNode; children: TreeNode[]; words: number }`; `buildTree(nodes: ManuscriptNode[]): TreeNode[]`; `describePath(nodes: ManuscriptNode[], id: string): string`.

- [ ] **Step 1: Write the failing test**

Create `src/lib/manuscriptTree.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildTree, describePath } from "./manuscriptTree";
import type { ManuscriptNode } from "../domain/models";

const node = (id: string, kind: ManuscriptNode["kind"], title: string, parentId: string | undefined, position: number, wordCount = 0): ManuscriptNode =>
  ({ id, projectId: "p1", parentId, kind, title, position, wordCount, revision: 0, updatedAt: "2026-07-27T00:00:00Z" });

const fixture: ManuscriptNode[] = [
  node("book", "book", "Meret Vale", undefined, 0),
  node("c2", "chapter", "Chapter Two", "book", 1),
  node("c1", "chapter", "Chapter One", "book", 0),
  node("s2", "scene", "The Sluice Crew", "c1", 1, 220),
  node("s1", "scene", "Station XII", "c1", 0, 310),
];

describe("buildTree", () => {
  it("nests scenes under chapters under the book", () => {
    const tree = buildTree(fixture);
    expect(tree).toHaveLength(1);
    expect(tree[0].node.id).toBe("book");
    expect(tree[0].children.map((child) => child.node.id)).toEqual(["c1", "c2"]);
    expect(tree[0].children[0].children.map((child) => child.node.id)).toEqual(["s1", "s2"]);
  });

  it("orders siblings by position, not array order", () => {
    expect(buildTree(fixture)[0].children[0].node.title).toBe("Chapter One");
  });

  it("rolls word counts up into containers", () => {
    const tree = buildTree(fixture);
    expect(tree[0].children[0].words).toBe(530);
    expect(tree[0].words).toBe(530);
  });

  it("attaches orphans at the root instead of dropping them", () => {
    const orphan = node("lost", "scene", "Lost Scene", "missing-chapter", 0, 40);
    const tree = buildTree([...fixture, orphan]);
    expect(tree.map((item) => item.node.id)).toContain("lost");
  });

  it("returns an empty array for no nodes", () => {
    expect(buildTree([])).toEqual([]);
  });
});

describe("describePath", () => {
  it("names the chain from chapter to scene", () => {
    expect(describePath(fixture, "s2")).toBe("Chapter One › The Sluice Crew");
  });

  it("returns the title alone for a top-level node", () => {
    expect(describePath(fixture, "c1")).toBe("Chapter One");
  });

  it("returns an empty string for an unknown id", () => {
    expect(describePath(fixture, "nope")).toBe("");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/manuscriptTree.test.ts`
Expected: FAIL — cannot resolve `./manuscriptTree`.

- [ ] **Step 3: Implement `src/lib/manuscriptTree.ts`**

```ts
import type { Id, ManuscriptNode } from "../domain/models";

export interface TreeNode {
  node: ManuscriptNode;
  children: TreeNode[];
  words: number;
}

// Nest a flat node array by parentId and order siblings by position. A node whose
// parent is missing attaches at the root, so an inconsistent vault still renders
// every scene the writer has rather than silently hiding some.
export function buildTree(nodes: ManuscriptNode[]): TreeNode[] {
  const byParent = new Map<string, ManuscriptNode[]>();
  const known = new Set(nodes.map((node) => node.id));
  for (const node of nodes) {
    const key = node.parentId && known.has(node.parentId) ? node.parentId : "";
    const bucket = byParent.get(key);
    if (bucket) bucket.push(node);
    else byParent.set(key, [node]);
  }
  const build = (parentKey: string): TreeNode[] =>
    [...(byParent.get(parentKey) ?? [])]
      .sort((left, right) => left.position - right.position)
      .map((node) => {
        const children = build(node.id);
        const words = children.length
          ? children.reduce((total, child) => total + child.words, 0)
          : node.wordCount;
        return { node, children, words };
      });
  return build("");
}

// "Chapter One › The Sluice Crew" — the writer-facing name for a location in the
// manuscript. Shared by the tree and the proposal card so the two cannot disagree.
export function describePath(nodes: ManuscriptNode[], id: Id): string {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const parts: string[] = [];
  let current = byId.get(id);
  const seen = new Set<string>();
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    if (current.kind !== "book") parts.unshift(current.title);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return parts.join(" › ");
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/manuscriptTree.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/manuscriptTree.ts src/lib/manuscriptTree.test.ts
git commit -m "$(printf 'Add manuscript tree logic\n\nCo-Authored-By: Claude Opus 5 <noreply@anthropic.com>')"
```

---

### Task 3: The tree component

**Files:**
- Create: `src/components/ManuscriptTree.tsx`
- Test: `src/components/ManuscriptTree.test.tsx`

**Interfaces:**
- Consumes: `buildTree` and `TreeNode` from Task 2.
- Produces: `<ManuscriptTree nodes activeId onSelect onCreate />` where `onCreate: (kind: "chapter" | "scene", parentId: string) => void`.

- [ ] **Step 1: Write the failing test**

Create `src/components/ManuscriptTree.test.tsx`:

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ManuscriptTree } from "./ManuscriptTree";
import type { ManuscriptNode } from "../domain/models";

const node = (id: string, kind: ManuscriptNode["kind"], title: string, parentId: string | undefined, position: number, wordCount = 0): ManuscriptNode =>
  ({ id, projectId: "p1", parentId, kind, title, position, wordCount, revision: 0, updatedAt: "2026-07-27T00:00:00Z" });

const nodes: ManuscriptNode[] = [
  node("book", "book", "Meret Vale", undefined, 0),
  node("c1", "chapter", "Chapter One", "book", 0),
  node("s1", "scene", "Station XII", "c1", 0, 310),
  node("s2", "scene", "The Sluice Crew", "c1", 1, 220),
];

describe("ManuscriptTree", () => {
  it("lists chapters and scenes with word counts", () => {
    render(<ManuscriptTree nodes={nodes} activeId="s1" onSelect={() => undefined} onCreate={() => undefined} />);
    expect(screen.getByText("Chapter One")).toBeVisible();
    expect(screen.getByText("Station XII")).toBeVisible();
    expect(screen.getByText("530")).toBeVisible();
    expect(screen.getByText("310")).toBeVisible();
  });

  it("marks the active scene as current", () => {
    render(<ManuscriptTree nodes={nodes} activeId="s2" onSelect={() => undefined} onCreate={() => undefined} />);
    expect(screen.getByRole("button", { name: /The Sluice Crew/ })).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("button", { name: /Station XII/ })).not.toHaveAttribute("aria-current", "true");
  });

  it("selects a scene when its row is clicked", () => {
    const onSelect = vi.fn();
    render(<ManuscriptTree nodes={nodes} activeId="s1" onSelect={onSelect} onCreate={() => undefined} />);
    fireEvent.click(screen.getByRole("button", { name: /The Sluice Crew/ }));
    expect(onSelect).toHaveBeenCalledWith("s2");
  });

  it("adds a scene to the chapter that owns the row menu", () => {
    const onCreate = vi.fn();
    render(<ManuscriptTree nodes={nodes} activeId="s1" onSelect={() => undefined} onCreate={onCreate} />);
    fireEvent.click(screen.getByRole("button", { name: /actions for Chapter One/i }));
    fireEvent.click(screen.getByRole("button", { name: /new scene/i }));
    expect(onCreate).toHaveBeenCalledWith("scene", "c1");
  });

  it("invites the writer to start when the manuscript is empty", () => {
    render(<ManuscriptTree nodes={[]} activeId="" onSelect={() => undefined} onCreate={() => undefined} />);
    expect(screen.getByText(/no chapters yet/i)).toBeVisible();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/ManuscriptTree.test.tsx`
Expected: FAIL — cannot resolve `./ManuscriptTree`.

- [ ] **Step 3: Implement `src/components/ManuscriptTree.tsx`**

```tsx
import { useState } from "react";
import { ChevronDown, ChevronRight, FileText, FolderOpen, MoreVertical, Plus } from "lucide-react";
import type { Id, ManuscriptNode } from "../domain/models";
import { buildTree, type TreeNode } from "../lib/manuscriptTree";

interface Props {
  nodes: ManuscriptNode[];
  activeId: Id;
  onSelect: (id: Id) => void;
  onCreate: (kind: "chapter" | "scene", parentId: Id) => void;
}

export function ManuscriptTree({ nodes, activeId, onSelect, onCreate }: Props) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [menuFor, setMenuFor] = useState("");
  const tree = buildTree(nodes);
  const bookId = nodes.find((node) => node.kind === "book")?.id ?? "";

  const toggle = (id: string) =>
    setCollapsed((all) => {
      const next = new Set(all);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const renderRow = (item: TreeNode, depth: number) => {
    const { node, children, words } = item;
    const isContainer = children.length > 0 || node.kind !== "scene";
    const isCollapsed = collapsed.has(node.id);
    return (
      <li key={node.id}>
        <div className={`tree-row ${node.id === activeId ? "current" : ""}`} style={{ paddingLeft: `${8 + depth * 14}px` }}>
          {isContainer ? (
            <button className="tree-twisty" aria-label={`${isCollapsed ? "Expand" : "Collapse"} ${node.title}`} onClick={() => toggle(node.id)}>
              {isCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
            </button>
          ) : (
            <span className="tree-twisty" />
          )}
          <button className="tree-label" aria-current={node.id === activeId ? "true" : undefined} onClick={() => onSelect(node.id)}>
            {node.kind === "scene" ? <FileText size={12} /> : <FolderOpen size={12} />}
            <span>{node.title}</span>
          </button>
          <span className="tree-words">{words.toLocaleString()}</span>
          {node.kind !== "scene" && (
            <button className="tree-menu-toggle" aria-label={`Actions for ${node.title}`} onClick={() => setMenuFor(menuFor === node.id ? "" : node.id)}>
              <MoreVertical size={12} />
            </button>
          )}
        </div>
        {menuFor === node.id && (
          <div className="tree-menu" role="menu">
            {node.kind === "chapter" && (
              <button onClick={() => { onCreate("scene", node.id); setMenuFor(""); }}>New scene</button>
            )}
            <button onClick={() => { onCreate("chapter", bookId || node.id); setMenuFor(""); }}>New chapter</button>
          </div>
        )}
        {children.length > 0 && !isCollapsed && <ul>{children.map((child) => renderRow(child, depth + 1))}</ul>}
      </li>
    );
  };

  return (
    <nav className="manuscript-tree panel" aria-label="Manuscript contents">
      <header className="tree-header">
        <span>Manuscript</span>
        <button aria-label="New chapter" onClick={() => onCreate("chapter", bookId)} disabled={!bookId}>
          <Plus size={13} />
        </button>
      </header>
      <div className="tree-scroll">
        {tree.length ? <ul>{tree.map((item) => renderRow(item, 0))}</ul> : <p className="tree-empty">No chapters yet. Use + to start one.</p>}
      </div>
    </nav>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/ManuscriptTree.test.tsx`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/ManuscriptTree.tsx src/components/ManuscriptTree.test.tsx
git commit -m "$(printf 'Add the manuscript tree component\n\nCo-Authored-By: Claude Opus 5 <noreply@anthropic.com>')"
```

---

### Task 4: Mount the tree in the app shell

**Files:**
- Modify: `src/App.tsx` (imports, render)
- Modify: `src/styles.css` (grid + tree styles)

**Interfaces:**
- Consumes: `<ManuscriptTree />` from Task 3; the existing `createNode` at `App.tsx:90` and `setActiveId`.

- [ ] **Step 1: Import the component**

In `src/App.tsx`, after the `EditorPane` import on line 4, add:

```ts
import { ManuscriptTree } from "./components/ManuscriptTree";
```

- [ ] **Step 2: Let `createNode` accept an explicit parent**

`createNode` (`App.tsx:90`) derives the parent from whatever scene is currently open. The tree must be able to say "new scene in *this* chapter" regardless of where the writer is standing — otherwise clicking "New scene" on Chapter One while Chapter Two is open creates it in Chapter Two, which is the exact misplacement this plan exists to prevent.

In `src/App.tsx`, find the start of line 90:

```ts
  const createNode = async (kind: "chapter" | "scene", title: string) => { const activeChapter = active.kind === "scene" ? active.parentId : active.kind === "chapter" ? active.id : undefined; const parentId = kind === "chapter" ? nodes.find((node) => node.kind === "book")?.id : activeChapter ?? nodes.find((node) => node.kind === "chapter")?.id;
```

Replace that portion with:

```ts
  const createNode = async (kind: "chapter" | "scene", title: string, explicitParentId?: string) => { const activeChapter = active.kind === "scene" ? active.parentId : active.kind === "chapter" ? active.id : undefined; const parentId = explicitParentId ?? (kind === "chapter" ? nodes.find((node) => node.kind === "book")?.id : activeChapter ?? nodes.find((node) => node.kind === "chapter")?.id);
```

Leave the rest of the function unchanged. Existing callers pass two arguments and keep today's behavior.

- [ ] **Step 3: Render the tree beside the binder**

In `src/App.tsx`, find the `<Binder` element opening on line 164 and locate its closing `/>`. Immediately **after** the closing `/>` of `<Binder ... />`, insert:

```tsx
    {inspector === "manuscript" && (
      <ManuscriptTree
        nodes={nodes}
        activeId={active.id}
        onSelect={setActiveId}
        onCreate={(kind, parentId) => { void createNode(kind, kind === "scene" ? "New scene" : "New chapter", parentId).catch((error) => setAiError(String(error))); }}
      />
    )}
```

- [ ] **Step 4: Add the three-column grid and tree styles**

In `src/styles.css`, replace line 6:

```css
.app-frame { display:grid; grid-template-columns:218px 1fr; height:100vh; overflow:hidden; background:#1a130b; color:#f3ede1; }
```

with:

```css
.app-frame { display:grid; grid-template-columns:218px 1fr; height:100vh; overflow:hidden; background:#1a130b; color:#f3ede1; }
.app-frame:has(.manuscript-tree) { grid-template-columns:218px 232px 1fr; }
```

Then append at the end of `src/styles.css`:

```css
.manuscript-tree { display:flex; flex-direction:column; min-height:0; overflow:hidden; border-right:1px solid #382c1d; background:linear-gradient(180deg,#12191f,#1a130b); }
.tree-header { flex:none; display:flex; align-items:center; justify-content:space-between; height:42px; padding:0 10px 0 14px; border-bottom:1px solid #382c1d; color:#8e98a3; font-size:9px; letter-spacing:.16em; text-transform:uppercase; font-weight:600; }
.tree-header button { border:0; background:transparent; color:#c79543; cursor:pointer; display:grid; place-items:center; width:22px; height:22px; border-radius:4px; }
.tree-header button:hover:not(:disabled) { background:#241a0e; }
.tree-header button:disabled { opacity:.35; cursor:default; }
.tree-scroll { flex:1; min-height:0; overflow:auto; padding:6px 0 12px; scrollbar-gutter:stable; }
.manuscript-tree ul { list-style:none; margin:0; padding:0; }
.tree-row { display:flex; align-items:center; gap:2px; padding-right:6px; height:26px; }
.tree-row:hover { background:#1b232d; }
.tree-row.current { background:#241a0e; box-shadow:inset 2px 0 0 #c98f34; }
.tree-twisty { flex:none; width:16px; height:16px; display:grid; place-items:center; border:0; background:transparent; color:#7d8894; cursor:pointer; padding:0; }
.tree-label { flex:1; min-width:0; display:flex; align-items:center; gap:6px; border:0; background:transparent; color:#d9d0c2; font-size:11px; text-align:left; cursor:pointer; padding:0; overflow:hidden; }
.tree-label span { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.tree-row.current .tree-label { color:#f5e9d4; }
.tree-words { flex:none; color:#7d8894; font-size:9px; font-variant-numeric:tabular-nums; }
.tree-menu-toggle { flex:none; width:18px; height:18px; display:grid; place-items:center; border:0; background:transparent; color:#7d8894; cursor:pointer; padding:0; border-radius:3px; }
.tree-menu-toggle:hover { background:#2a3540; color:#f0e6d6; }
.tree-menu { margin:2px 8px 4px 30px; border:1px solid #4a3a26; border-radius:6px; background:#1d1509; overflow:hidden; }
.tree-menu button { display:block; width:100%; border:0; background:transparent; color:#d9d0c2; font-size:11px; text-align:left; padding:6px 10px; cursor:pointer; }
.tree-menu button:hover { background:#2a1f10; color:#f5e9d4; }
.tree-empty { margin:14px; color:#7d8894; font-size:11px; line-height:1.5; }
@media (max-width:1400px) { .app-frame:has(.manuscript-tree) { grid-template-columns:205px 208px 1fr; } }
@media (max-width:1100px) { .app-frame:has(.manuscript-tree) { grid-template-columns:205px 1fr; } .manuscript-tree { display:none; } }
```

- [ ] **Step 5: Keep focus mode hiding the tree**

In `src/styles.css` line 560, find:

```css
.app-frame:has(.editor-shell.focus-mode)>.binder { display:none; }
```

Replace with:

```css
.app-frame:has(.editor-shell.focus-mode)>.binder,.app-frame:has(.editor-shell.focus-mode)>.manuscript-tree { display:none; }
```

- [ ] **Step 6: Verify the build and full suite**

Run: `npm run build` — expected clean.
Run: `npx vitest run` — expected PASS.

- [ ] **Step 7: Commit**

```bash
git add src/App.tsx src/styles.css
git commit -m "$(printf 'Mount the manuscript tree in the app shell\n\nCo-Authored-By: Claude Opus 5 <noreply@anthropic.com>')"
```

---

### Task 5: Restore the editing toolbar

**Files:**
- Modify: `src/styles.css:744` (narrow the hide rule), `:752` (drop the orphan positioning)
- Modify: `src/components/EditorPane.tsx` (fold underline in, clamp the dock)

**Interfaces:**
- Consumes: nothing from earlier tasks. Independent of Tasks 2–4.

- [ ] **Step 1: Narrow the hide rule**

In `src/styles.css`, replace line 744:

```css
.editor-shell.with-ai-dock .editor-topbar,.editor-shell.with-ai-dock .toolbar,.editor-shell.with-ai-dock .editor-footer,.editor-shell.with-ai-dock .underline-tool{display:none}
```

with:

```css
.editor-shell.with-ai-dock .editor-topbar{display:none}
```

- [ ] **Step 2: Remove the orphaned absolute positioning**

In `src/styles.css`, delete these two rules at lines 752–753:

```css
.manuscript-column>.underline-tool { position:absolute; z-index:4; top:61px; left:154px; width:30px; height:30px; display:grid; place-items:center; border:0; border-radius:3px; color:#aab5bf; background:#101820; }
.manuscript-column>.underline-tool:hover,.manuscript-column>.underline-tool.on { color:#ffc15b; background:#1c2b36; }
```

- [ ] **Step 3: Fold Underline into the toolbar row**

In `src/components/EditorPane.tsx`, delete line 37 entirely (the standalone underline button):

```tsx
        <button className={`underline-tool ${editor?.isActive("underline")?"on":""}`} title="Underline" aria-label="Underline" onClick={()=>editor?.chain().focus().toggleUnderline().run()}><Underline size={16}/></button>
```

Then in the toolbar on line 38, find the Italic button and the `<i/>` divider that follows it:

```tsx
<button title="Italic" aria-label="Italic" className={editor?.isActive("italic")?"on":""} onClick={()=>editor?.chain().focus().toggleItalic().run()}><Italic size={16}/></button>
```

Insert immediately after it:

```tsx
<button title="Underline" aria-label="Underline" className={editor?.isActive("underline")?"on":""} onClick={()=>editor?.chain().focus().toggleUnderline().run()}><Underline size={16}/></button>
```

- [ ] **Step 4: Clamp the dock so prose keeps a floor**

In `src/components/EditorPane.tsx` line 13, find:

```ts
  const preferredChatHeight=()=>Math.max(340,Math.min(520,Math.round(window.innerHeight*.38)));const maxChatHeight=()=>Math.max(520,Math.round(window.innerHeight*.72));
```

Replace with:

```ts
  // The toolbar, header and footer take fixed vertical chrome; the dock may not grow
  // so far that the prose area drops below PROSE_FLOOR. A height stored on a large
  // monitor is re-clamped on load and on resize so it cannot crush a laptop screen.
  const PROSE_FLOOR=240;const CHROME=48+40+31+6;
  const preferredChatHeight=()=>Math.max(340,Math.min(520,Math.round(window.innerHeight*.38)));
  const maxChatHeight=()=>Math.max(300,Math.min(Math.round(window.innerHeight*.72),window.innerHeight-CHROME-PROSE_FLOOR));
```

- [ ] **Step 5: Re-clamp on window resize**

In `src/components/EditorPane.tsx`, immediately after the `useEffect` that persists the dock height (line 22, ending `},[aiDockHeight,document.projectId]);`), add:

```ts
  useEffect(()=>{const onResize=()=>setAiDockHeight(height=>Math.max(300,Math.min(height,maxChatHeight())));window.addEventListener("resize",onResize);return()=>window.removeEventListener("resize",onResize)},[]);
```

- [ ] **Step 6: Write the failing test**

jsdom does not load `src/styles.css`, so `toBeVisible()` cannot detect the `display:none` rule — those assertions would pass identically before and after this task and verify nothing. Test the two things that can actually fail: the DOM move, and the stylesheet rule itself.

Create `src/components/editorToolbar.test.tsx`:

```tsx
import { readFileSync } from "node:fs";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EditorPane } from "./EditorPane";
import type { ManuscriptNode } from "../domain/models";

const document: ManuscriptNode = { id: "s1", projectId: "p1", kind: "scene", title: "Station XII", position: 0, wordCount: 0, revision: 0, updatedAt: "2026-07-27T00:00:00Z", content: "<p>The door opened.</p>" };

const renderPane = () =>
  render(<EditorPane document={document} content="<p>The door opened.</p>" characters={[]} onChange={() => undefined} onAi={() => undefined} onComment={() => undefined} onMetadata={async () => undefined} embeddedAi={<div>chat</div>} />);

describe("editor toolbar with the AI dock mounted", () => {
  it("puts Underline in the toolbar row rather than floating it over the prose", () => {
    const { container } = renderPane();
    const toolbar = container.querySelector(".toolbar");
    expect(toolbar).not.toBeNull();
    expect(within(toolbar as HTMLElement).getByRole("button", { name: /^underline$/i })).toBeInTheDocument();
    expect(container.querySelector(".manuscript-column > .underline-tool")).toBeNull();
  });

  it("keeps the formatting tools in the toolbar", () => {
    const { container } = renderPane();
    const toolbar = within(container.querySelector(".toolbar") as HTMLElement);
    expect(toolbar.getByRole("button", { name: /^bold$/i })).toBeInTheDocument();
    expect(toolbar.getByRole("button", { name: /^italic$/i })).toBeInTheDocument();
    expect(toolbar.getByRole("button", { name: /find and replace/i })).toBeInTheDocument();
  });

  it("no longer hides the toolbar when the AI dock is mounted", () => {
    const css = readFileSync("src/styles.css", "utf8");
    expect(css).not.toMatch(/with-ai-dock\s+\.toolbar\s*,/);
    expect(css).not.toMatch(/with-ai-dock\s+\.toolbar\s*\{[^}]*display\s*:\s*none/);
  });
});
```

- [ ] **Step 7: Run the test**

Run: `npx vitest run src/components/editorToolbar.test.tsx`
Expected: PASS (3 tests). If Step 1 was missed the stylesheet test fails; if Step 3 was missed the Underline test fails.

- [ ] **Step 8: Run all gates**

Run: `npx vitest run` — expected PASS.
Run: `npm run build` — expected clean.

- [ ] **Step 9: Commit**

```bash
git add src/styles.css src/components/EditorPane.tsx src/components/editorToolbar.test.tsx
git commit -m "$(printf 'Restore the editing toolbar in the AI dock layout\n\nCo-Authored-By: Claude Opus 5 <noreply@anthropic.com>')"
```

---

## Manual desktop verification (after Task 5)

Run `npm run tauri dev`, open the Meret Vale project, land on Manuscript:

1. The tree column sits between the app nav and the Story window, listing the book, chapters and scenes with word counts.
2. The open scene is highlighted; clicking another row opens it and the highlight follows.
3. The `+` button and a chapter's `⋮` menu create a chapter and a scene; the tree grows.
4. The toolbar is visible above the prose — Bold, Italic, Underline, Quote, List, Find, Split, Focus, Scene details, Comment, Ask Lillith — and Underline sits inline, not floating over the text.
5. Drag the chat dock to its maximum: at least ~240px of prose stays visible.
6. Ask Lillith for a long list (the creature prompt that previously broke). The reply reads as prose, not raw JSON.

## Deferred to a follow-up plan

- **Rename and delete.** Neither exists today in `src/lib/repository.ts` or on the Rust side; both need new Tauri commands and destructive vault file operations (with a git snapshot taken first). Kept out of this plan so the navigation and editing win is not held up by new backend surface.
- **Collapse-to-rail.** The spec calls for a header toggle collapsing the tree to a rail, persisted per project. This plan handles narrow screens with the 1100px media query instead. The toggle is worth adding once the column has been lived with, since its right width is easier to judge in use than in advance.
- **Targeted Approve** — Plan B, per the spec.
- Drag-to-reorder, per-scene status marks, the visual redesign.
