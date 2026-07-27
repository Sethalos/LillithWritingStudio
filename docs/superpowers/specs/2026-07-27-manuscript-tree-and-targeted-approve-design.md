# Manuscript Tree and Targeted Approve — Design

**Date:** 2026-07-27
**Status:** Approved for planning

## Problem

The Story window and the AI chat have distinct jobs. The chat **creates** — brainstorm,
draft chapters, invent characters and locations. The Story window **assembles and polishes**
— the place prose is arranged and worked over with the editing tools. Two defects break that
division today.

**You cannot see where you are.** `Binder.tsx` is named for Scrivener's binder but renders a
static list of app workspaces. Nothing anywhere shows the manuscript's structure. Meanwhile
`App.tsx:56` resolves the open document as:

```ts
const active = useMemo(() => nodes.find(n => n.id === activeId && n.kind === "scene")
  ?? nodes.find(n => n.kind === "scene")!, [activeId, nodes]);
```

The Story window edits exactly one scene, and an unresolvable `activeId` falls back silently
to the project's *first* scene. `keepChatText` appends to whatever that is. Approving a
drafted chapter can therefore place it somewhere unintended, with nothing in the UI naming
the destination.

**You cannot edit.** `EditorPane.tsx:38` already builds a full toolbar — undo/redo, bold,
italic, blockquote, bullet list, find & replace, split view, focus mode, scene details,
comment, Ask Lillith — plus underline. `styles.css:744` then hides all of it whenever the AI
dock is mounted, which is the only layout in normal use. The tools are built and buried.

## What this does not change

The wire contract. `ManuscriptProposal` stays `{action:"append", text}`. Destination is
chosen in the front end, so Lillith never picks where prose lands and the "never auto-apply"
rule from Phase 1 holds unchanged.

No data migration. `src/domain/models.ts:3` already defines
`"book" | "part" | "act" | "chapter" | "scene" | "interlude" | "note" | "research"` with
`parentId`, `position`, and `wordCount` on every node. The tree is a UI build over a model
that already describes it.

Scope is manuscript-only. Characters and World & Story Bible keep their existing workspaces
rather than being absorbed into the tree.

---

## Architecture

### `src/lib/manuscriptTree.ts` (new)

Pure functions, no React. This is where the logic lives so the component stays thin and both
consumers share one definition of structure.

- `buildTree(nodes: ManuscriptNode[]): TreeNode[]` — nests a flat array by `parentId`,
  orders siblings by `position`. Nodes with a missing parent attach at root so an
  inconsistent vault still renders.
- `rollupWordCount(node: TreeNode): number` — a container's count is the sum of its
  descendants; a leaf's is its own `wordCount`.
- `describePath(nodes: ManuscriptNode[], id: Id): string` — `"Chapter Two › The Sluice Crew"`.
  Used by the tree for tooltips and by the proposal card for its destination label. One
  function, so the two can never disagree.

Unit-tested against fixture arrays: nesting, ordering, orphans, rollups, path strings.

### `src/components/ManuscriptTree.tsx` (new)

Presentational. Props in, callbacks out, no fetching and no persistence.

```ts
interface Props {
  nodes: ManuscriptNode[];
  activeId: Id;
  onSelect: (id: Id) => void;
  onCreate: (kind: "chapter" | "scene", parentId: Id) => void;
  onRename: (id: Id, title: string) => void;
  onDelete: (id: Id) => void;
}
```

Rows show title and word count, with the active row highlighted. A per-row menu offers New
scene, New chapter, Rename, Delete. Deleting a node with children asks for confirmation and
names what will be removed. Testable in isolation against a fixture array.

### Layout

`.app-frame` becomes a three-column grid. The tree column mounts only in the Manuscript
workspace; every other workspace keeps today's two-column shape.

```
┌──────────────┬──────────────────┬────────────────────────────┐
│ Lillith      │ MANUSCRIPT       │  Story    ACCEPTED MS      │
│ AUTHOR OS    │ Meret Vale 1,250 │  ┌──────────────────────┐  │
│ Dashboard    │ ├─ Prologue  656 │  │ B  toolbar restored  │  │
│ Workflow     │ ├─ Ch. One   530 │  │ ─────────────────────│  │
│ Characters   │ │  ├─ Station 310│  │ Beneath Narrowdeep,  │  │
│ World Bible  │ │  └─ Sluice ◀220│  │ the city ceased...   │  │
│ ▸ Manuscript │ └─ Ch. Two    65 │  └──────────────────────┘  │
│              │              [+] ├────────────────────────────┤
│              │                  │  Lillith        chat dock  │
└──────────────┴──────────────────┴────────────────────────────┘
```

The column is 232px, collapsible to a rail via a header toggle, with the collapsed state
persisted per project in `localStorage`. At the existing 1400px breakpoint
(`styles.css:135`) it narrows to 208px; below 1100px it starts collapsed. It scrolls
internally and inherits the viewport pin — `height:100vh; overflow:hidden` on `.app-frame`
stays untouched.

Focus mode already hides `.binder` via `:has()` at `styles.css:560`; the tree column hides
with it.

---

## Restoring the editing toolbar

Narrow the `styles.css:744` rule to hide only `.editor-topbar`, which `story-window-header`
already replaces. Toolbar, footer, and underline return.

Two collisions this creates, both of which the implementation must handle:

**Vertical budget.** Toolbar (40px) plus footer (31px) is 71px of permanent new chrome, on
top of the 48px header. `EditorPane`'s dock already grows to `max(520, 72% of viewport)`, so
on a 768px-tall screen at maximum dock the prose area would fall to roughly 96px. Clamp
`maxChatHeight()` so the prose area retains a 240px floor. The dock's stored height is
re-clamped on load and on window resize, so a height saved on a large monitor cannot crush
the editor on a laptop.

**The orphaned underline button.** `.underline-tool` is absolutely positioned at
`top:61px; left:154px` (`styles.css:752`) — it floats precisely *because* the toolbar was
hidden. Un-hiding the toolbar without addressing it leaves a button sitting over the prose.
Fold Underline into the toolbar beside Bold and Italic, delete the absolute positioning, and
render it from the toolbar row in `EditorPane.tsx:38` rather than as the separate element at
line 37.

---

## Targeted Approve

The proposal card gains a destination, defaulting to the scene selected in the tree.

```
╭─ Lillith wants to add this to your manuscript ─╮
│  "Beneath Narrowdeep, the city ceased…"        │
│                                                │
│  Add to: [ Chapter Two › The Sluice Crew ▾ ]   │
│           └ append to end of scene             │
│           └ + New scene in Chapter Two         │
│           └ + New chapter after Chapter Two    │
│                                                │
│  [ ✓ Approve ]  [ ✕ Discard ]                  │
╰────────────────────────────────────────────────╯
```

The destination is always visible in words, so nothing lands unlabelled.

**The new mechanism.** `keepChatText` (`App.tsx:153`) mutates the `content` state of the
*open* document — it can only write where the editor already stands. Retargeting requires
writing to a node the editor does not hold. `onKeepText` is therefore replaced by:

```ts
onPlaceText: (text: string, target:
  | { mode: "append"; nodeId: Id }
  | { mode: "new-scene"; parentId: Id }
  | { mode: "new-chapter"; afterId: Id }
) => Promise<void>;
```

`onKeepText` has two other roles that this rename must preserve, both easy to miss:

- **The "Keep in manuscript" header button.** `keepChatSelection` (`AiPanel.tsx:201`) appends
  a highlighted chat selection. It routes through `onPlaceText` with
  `{mode:"append", nodeId: <open scene>}`, so its behavior is unchanged and it gains the
  same revision guarantees.
- **The building-chat mode discriminator.** `AiPanel.tsx:272` branches on
  `if (onKeepText) { … }` to decide whether to render the simple building chat or the full
  editor panel. That check becomes `if (onPlaceText)`. Missing it would silently render the
  wrong panel.

`App.tsx` implements it:

- **append to the open scene** — today's path unchanged, keeping the autosave and revision
  behavior Phase 1 relies on for reversibility.
- **append to another scene** — read that node's content, append, `saveDocument` against
  that node id, update `nodes`. It does not disturb the editor's buffer or `lastSaved`.
- **new scene / new chapter** — `createManuscriptNode` (already used by `createNode` at
  `App.tsx:90`), write the prose, then select the new node so the tree and editor follow the
  writer to what they just created.

Every branch goes through `saveDocument`, so each placement produces a revision and stays
recoverable from History exactly as Phase 1 promised.

**Failure handling.** A save that fails surfaces in the chat error line and leaves the
proposal card in place, so the prose is never lost to a failed write. Approving into a
deleted node falls back to the card's selector with the target cleared rather than writing
somewhere arbitrary.

---

## Testing

- `manuscriptTree.ts` — nesting, sibling ordering, orphan attachment, word-count rollups,
  path strings.
- `ManuscriptTree.tsx` — renders a fixture hierarchy, highlights the active row, fires each
  callback, confirms before destructive delete.
- Targeted approve — appending to a non-open scene writes to the right node and leaves the
  editor buffer alone; new-scene and new-chapter create, place, and select; a failing save
  keeps the card.
- Layout — the prose floor holds when the dock is dragged to maximum on a short viewport.

## Sequencing

Two plans. The first is useful on its own; the second depends on `describePath` and on the
tree existing to select a destination.

| Plan | Deliverable |
|---|---|
| **A** | Tree, navigation, create/rename/delete, toolbar restored — *see where you are and edit* |
| **B** | Targeted Approve — *steer where prose lands* |

The truncation and raw-JSON defects in
`docs/superpowers/2026-07-27-phase1-manual-test-findings.md` should land before either.
Approve is hard to exercise while long replies break, and both plans are tested through it.

## Out of scope

Drag-to-reorder and per-scene status marks (draft/revised/done). Characters, Locations, and
Research as tree sections. The broader visual redesign, which the writer has deferred.
