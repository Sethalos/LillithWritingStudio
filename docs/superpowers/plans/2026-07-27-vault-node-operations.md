# Vault Node Operations — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Make the manuscript tree actually work on vault projects — create, rename, and delete nodes — and persist the dashboard's project settings, so the writer can see where they are and navigate.

**Architecture:** `open_vault_project` populates `VaultState` only, but `create_manuscript_node`, `update_manuscript_metadata`, `reorder_manuscript_nodes`, and the workflow-state commands are all bound to `AppState.repository`, which a vault project never populates — so every one fails with "Open a project first". This plan adds vault-native operations at the `vault.rs` layer, exposes them as `VaultState` commands, and routes the TypeScript repository to them. Scope is the manuscript tree plus workflow state; the other ~70 `AppState` commands are a separate migration.

**Tech Stack:** Rust (Tauri), React + TypeScript (Vite), cargo test, vitest + @testing-library/react.

## Global Constraints

- **Staging rule:** commit by **exact path only** — never `git add -A` / `git add .`.
- **Commit trailer:** end every commit message with `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.
- **Green gates:** `npx vitest run` AND `npm run build` AND `cargo test --manifest-path src-tauri/Cargo.toml --offline`. Vitest uses esbuild and does NOT typecheck — passing it alone is insufficient.
- **Destructive operations take a git snapshot first.** `vault::git_commit` exists; call it before any delete.
- **Filenames stay stable on rename.** The frontmatter `title` is authoritative for display (`build_workspace` reads `chapter_meta.title`). Renaming the file as well would break `find_chapter_path` mid-operation and any Obsidian links. Rewrite frontmatter only.
- **Never lose prose.** No operation may rewrite a chapter body. Rename touches frontmatter; delete removes a whole file after a snapshot.

## Vault model (established, do not re-derive)

- `manuscript/NN-slug.md`, each with frontmatter: `id` (UUID), `title`, `position`, `revision`, `updatedAt`.
- `build_workspace` (`vault_commands.rs:24`) synthesizes `book-root` (project title) and `chapter-root` (hardcoded `"Manuscript"`); every `.md` becomes a `kind:"scene"` node beneath it. The vault is **flat** — no real chapter hierarchy.
- Existing helpers in `vault.rs`: `list_chapters`, `find_chapter_path` (private), `read_chapter`, `save_chapter`, `append_imported_chapters`, `new_chapter_meta`, `write_chapter_file`, `parse_note`, `render_note`, `git_commit`, `now_iso`.

## File Structure

- Modify `src-tauri/src/vault.rs` — add `rename_chapter`, `delete_chapter`, `create_chapter`, `load_workflow_state` / `save_workflow_state`.
- Modify `src-tauri/src/lib.rs` — expose them as `VaultState` commands; register in `invoke_handler`.
- Modify `src/lib/repository.ts` — route create to the vault command; add `renameManuscriptNode`, `deleteManuscriptNode`.
- Modify `src/lib/workflowRepository.ts` — route to the vault commands.
- Modify `src/components/ManuscriptTree.tsx` — Rename and Delete row actions.
- Modify `src/components/ManuscriptTree.test.tsx` — cover them.
- Modify `src/App.tsx` — wire `onRename` / `onDelete`.

---

### Task 1: Vault-layer node operations

**Files:**
- Modify: `src-tauri/src/vault.rs`
- Test: the existing `mod tests` in `src-tauri/src/vault.rs`

**Interfaces:**
- Produces:
  - `pub fn create_chapter(root:&Path, title:&str) -> Result<ChapterMeta, VaultError>`
  - `pub fn rename_chapter(root:&Path, id:&str, title:&str) -> Result<ChapterMeta, VaultError>`
  - `pub fn delete_chapter(root:&Path, id:&str) -> Result<(), VaultError>`

- [ ] **Step 1: Write the failing tests**

Add to `mod tests` in `src-tauri/src/vault.rs`. Follow the existing tests' style for creating a temp project (see `snapshots_the_project_when_git_is_available` for the `tempfile::tempdir` + `create_project` pattern).

```rust
    #[test]
    fn creates_a_chapter_at_the_end(){let dir=tempfile::tempdir().unwrap();let root=create_project(dir.path(),"Test").unwrap();let first=create_chapter(&root,"Prologue").unwrap();let second=create_chapter(&root,"Chapter One").unwrap();assert!(second.position>first.position);let all=list_chapters(&root).unwrap();assert_eq!(all.last().unwrap().title,"Chapter One");}

    #[test]
    fn renames_a_chapter_without_touching_its_body(){let dir=tempfile::tempdir().unwrap();let root=create_project(dir.path(),"Test").unwrap();let meta=create_chapter(&root,"Imported Manuscript").unwrap();save_chapter(&root,&meta.id,"<p>The rain came sideways.</p>",meta.revision).unwrap();let renamed=rename_chapter(&root,&meta.id,"Prologue").unwrap();assert_eq!(renamed.title,"Prologue");let(read_meta,body)=read_chapter(&root,&meta.id).unwrap();assert_eq!(read_meta.title,"Prologue");assert_eq!(body,"<p>The rain came sideways.</p>");assert_eq!(read_meta.id,meta.id);}

    #[test]
    fn rename_rejects_an_empty_title(){let dir=tempfile::tempdir().unwrap();let root=create_project(dir.path(),"Test").unwrap();let meta=create_chapter(&root,"Chapter One").unwrap();assert!(rename_chapter(&root,&meta.id,"   ").is_err());assert_eq!(read_chapter(&root,&meta.id).unwrap().0.title,"Chapter One");}

    #[test]
    fn rename_preserves_position_and_revision(){let dir=tempfile::tempdir().unwrap();let root=create_project(dir.path(),"Test").unwrap();create_chapter(&root,"First").unwrap();let meta=create_chapter(&root,"Second").unwrap();save_chapter(&root,&meta.id,"<p>x</p>",meta.revision).unwrap();let before=read_chapter(&root,&meta.id).unwrap().0;let renamed=rename_chapter(&root,&meta.id,"Renamed").unwrap();assert_eq!(renamed.position,before.position);assert_eq!(renamed.revision,before.revision);}

    #[test]
    fn deletes_a_chapter_and_leaves_the_others(){let dir=tempfile::tempdir().unwrap();let root=create_project(dir.path(),"Test").unwrap();let keep=create_chapter(&root,"Keep").unwrap();let drop=create_chapter(&root,"Drop").unwrap();delete_chapter(&root,&drop.id).unwrap();let all=list_chapters(&root).unwrap();assert_eq!(all.len(),1);assert_eq!(all[0].id,keep.id);assert!(read_chapter(&root,&drop.id).is_err());}

    #[test]
    fn deleting_a_missing_chapter_errors(){let dir=tempfile::tempdir().unwrap();let root=create_project(dir.path(),"Test").unwrap();assert!(delete_chapter(&root,"no-such-id").is_err());}
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cargo test --manifest-path src-tauri/Cargo.toml --offline vault::tests`
Expected: FAIL to compile — `create_chapter`, `rename_chapter`, `delete_chapter` are not defined.

- [ ] **Step 3: Implement the three functions**

In `src-tauri/src/vault.rs`, add after `append_imported_chapters`. Reuse the existing private helpers rather than reimplementing frontmatter handling — `find_chapter_path`, `new_chapter_meta`, `write_chapter_file`, `parse_note`, `render_note`, `now_iso`, `list_chapters`.

```rust
/// Create an empty chapter positioned after every existing one.
pub fn create_chapter(root: &Path, title: &str) -> Result<ChapterMeta, VaultError> {
    let title = title.trim();
    if title.is_empty() { return Err(VaultError::InvalidTitle); }
    let position = list_chapters(root)?.iter().map(|c| c.position).max().map(|p| p + 1).unwrap_or(0);
    let meta = new_chapter_meta(title, position);
    write_chapter_file(root, &meta, "<p></p>")?;
    Ok(meta)
}

/// Rewrite a chapter's frontmatter title, leaving its body, id, position and
/// revision untouched. The filename is deliberately left alone: the frontmatter
/// title is what the workspace reads, and renaming files would break any
/// Obsidian links the writer has made into the vault.
pub fn rename_chapter(root: &Path, id: &str, title: &str) -> Result<ChapterMeta, VaultError> {
    let title = title.trim();
    if title.is_empty() { return Err(VaultError::InvalidTitle); }
    let path = find_chapter_path(root, id)?;
    let text = fs::read_to_string(&path)?;
    let (mut meta, body) = parse_note::<ChapterMeta>(&text)?;
    meta.title = title.to_string();
    meta.updated_at = now_iso();
    fs::write(&path, render_note(&meta, &body)?)?;
    Ok(meta)
}

/// Remove a chapter file. Callers are expected to snapshot first.
pub fn delete_chapter(root: &Path, id: &str) -> Result<(), VaultError> {
    let path = find_chapter_path(root, id)?;
    fs::remove_file(path)?;
    Ok(())
}
```

Add an `InvalidTitle` variant to `VaultError` beside the existing variants, with a message along the lines of `"A title cannot be empty"`. Match the enum's existing derive/display style exactly — read the enum before editing.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cargo test --manifest-path src-tauri/Cargo.toml --offline vault::tests`
Expected: PASS, including the six new tests and every pre-existing vault test.

- [ ] **Step 5: Commit**

```bash
git add src-tauri/src/vault.rs
git commit -m "$(printf 'Add vault create, rename and delete chapter operations\n\nCo-Authored-By: Claude Opus 5 <noreply@anthropic.com>')"
```

---

### Task 2: Vault-state Tauri commands and TypeScript routing

**Files:**
- Modify: `src-tauri/src/lib.rs`
- Modify: `src/lib/repository.ts`

**Interfaces:**
- Consumes: `vault::create_chapter`, `vault::rename_chapter`, `vault::delete_chapter` (Task 1); `vault::git_commit`; `vault_commands::build_workspace`.
- Produces: Tauri commands `create_vault_chapter`, `rename_vault_chapter`, `delete_vault_chapter`; TS `createManuscriptNode` routed to the vault, plus `renameManuscriptNode(id, title)` and `deleteManuscriptNode(id)`.

- [ ] **Step 1: Add the commands**

In `src-tauri/src/lib.rs`, beside `load_vault_workspace` (~line 85), add three commands. Follow that function's exact shape for locking `VaultState` and resolving the root:

```rust
#[tauri::command]
fn create_vault_chapter(state: tauri::State<'_, VaultState>, title: String) -> Result<repository::ManuscriptNodeDto, String> { … }

#[tauri::command]
fn rename_vault_chapter(state: tauri::State<'_, VaultState>, document_id: String, title: String) -> Result<repository::ManuscriptNodeDto, String> { … }

#[tauri::command]
fn delete_vault_chapter(state: tauri::State<'_, VaultState>, document_id: String) -> Result<(), String> { … }
```

Requirements for the bodies:
- Lock `state.project_root`, `ok_or_else(|| "No project is open".to_string())` — matching `load_vault_workspace`.
- `create` and `rename` must return a `ManuscriptNodeDto` shaped **exactly** as `build_workspace` builds its scene nodes (`vault_commands.rs:57-65`): `parent_id: Some("chapter-root")`, `kind: "scene"`, `content` from the chapter body, `word_count` via the same `word_count` helper. Read that block and mirror it — a mismatched shape breaks the tree silently.
- `delete_vault_chapter` MUST call `vault::git_commit(root, "Snapshot before deleting <title>")` **before** `vault::delete_chapter`, so the file is recoverable. Read the title first for the message. Ignore a git failure the way `create_vault_project` does (`let _ = …`) — a vault without git must still delete.
- Register all three in the `invoke_handler![…]` list at `lib.rs:323`.

- [ ] **Step 2: Verify the crate compiles**

Run: `cargo test --manifest-path src-tauri/Cargo.toml --offline --no-run`
Expected: builds with no errors.

- [ ] **Step 3: Route the TypeScript repository**

In `src/lib/repository.ts`, change `createManuscriptNode` (line 154) so the Tauri branch calls the vault command instead of the dead `create_manuscript_node`. The vault is flat, so `parentId` and `kind` have no effect there — pass the title through and keep the signature unchanged so existing callers still compile:

```ts
export async function createManuscriptNode(parentId: string, kind: "chapter" | "scene", title: string, projectId: string): Promise<ManuscriptNode> {
  if (isTauri()) return invoke<ManuscriptNode>("create_vault_chapter", { title });
  return { id: crypto.randomUUID(), projectId, parentId, kind, title, position: Date.now(), wordCount: 0, content: kind === "scene" ? "<p></p>" : undefined, revision: 0, updatedAt: new Date().toISOString() };
}
```

Then add beside it:

```ts
export async function renameManuscriptNode(node: ManuscriptNode, title: string): Promise<ManuscriptNode> {
  if (isTauri()) return invoke<ManuscriptNode>("rename_vault_chapter", { documentId: node.id, title });
  return { ...node, title, updatedAt: new Date().toISOString() };
}

export async function deleteManuscriptNode(node: ManuscriptNode): Promise<void> {
  if (isTauri()) return invoke("delete_vault_chapter", { documentId: node.id });
}
```

- [ ] **Step 4: Verify both gates**

Run: `npm run build` — expected clean.
Run: `npx vitest run` — expected PASS.

- [ ] **Step 5: Commit**

```bash
git add src-tauri/src/lib.rs src/lib/repository.ts
git commit -m "$(printf 'Route manuscript node create, rename and delete to the vault\n\nCo-Authored-By: Claude Opus 5 <noreply@anthropic.com>')"
```

---

### Task 3: Rename and delete in the tree

**Files:**
- Modify: `src/components/ManuscriptTree.tsx`
- Modify: `src/components/ManuscriptTree.test.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `renameManuscriptNode`, `deleteManuscriptNode` (Task 2).
- Produces: `ManuscriptTree` props gain `onRename: (id: Id, title: string) => void` and `onDelete: (id: Id) => void`.

- [ ] **Step 1: Write the failing tests**

Add to `src/components/ManuscriptTree.test.tsx`. Match the file's existing fixture and import style.

```tsx
  it("renames a scene from its row menu", () => {
    const onRename = vi.fn();
    render(<ManuscriptTree nodes={nodes} activeId="s1" onSelect={() => undefined} onCreate={() => undefined} onRename={onRename} onDelete={() => undefined} />);
    fireEvent.click(screen.getByRole("button", { name: /actions for Station XII/i }));
    fireEvent.click(screen.getByRole("button", { name: /^rename$/i }));
    const field = screen.getByRole("textbox", { name: /scene title/i });
    fireEvent.change(field, { target: { value: "Prologue" } });
    fireEvent.submit(field.closest("form")!);
    expect(onRename).toHaveBeenCalledWith("s1", "Prologue");
  });

  it("does not rename to an empty title", () => {
    const onRename = vi.fn();
    render(<ManuscriptTree nodes={nodes} activeId="s1" onSelect={() => undefined} onCreate={() => undefined} onRename={onRename} onDelete={() => undefined} />);
    fireEvent.click(screen.getByRole("button", { name: /actions for Station XII/i }));
    fireEvent.click(screen.getByRole("button", { name: /^rename$/i }));
    const field = screen.getByRole("textbox", { name: /scene title/i });
    fireEvent.change(field, { target: { value: "   " } });
    fireEvent.submit(field.closest("form")!);
    expect(onRename).not.toHaveBeenCalled();
  });

  it("asks for confirmation before deleting and names what goes", () => {
    const onDelete = vi.fn();
    render(<ManuscriptTree nodes={nodes} activeId="s1" onSelect={() => undefined} onCreate={() => undefined} onRename={() => undefined} onDelete={onDelete} />);
    fireEvent.click(screen.getByRole("button", { name: /actions for Station XII/i }));
    fireEvent.click(screen.getByRole("button", { name: /^delete$/i }));
    expect(screen.getByText(/delete .*Station XII/i)).toBeVisible();
    expect(onDelete).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /^delete scene$/i }));
    expect(onDelete).toHaveBeenCalledWith("s1");
  });

  it("cancels a delete without calling back", () => {
    const onDelete = vi.fn();
    render(<ManuscriptTree nodes={nodes} activeId="s1" onSelect={() => undefined} onCreate={() => undefined} onRename={() => undefined} onDelete={onDelete} />);
    fireEvent.click(screen.getByRole("button", { name: /actions for Station XII/i }));
    fireEvent.click(screen.getByRole("button", { name: /^delete$/i }));
    fireEvent.click(screen.getByRole("button", { name: /^cancel$/i }));
    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.queryByText(/delete .*Station XII/i)).not.toBeInTheDocument();
  });
```

Note the fixture's scene rows currently render no `⋮` menu — the existing component only shows the row menu for non-scene kinds. These tests require the menu on scene rows too. Extend the component accordingly, keeping the container menus working.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/components/ManuscriptTree.test.tsx`
Expected: FAIL — no rename/delete actions, and no `⋮` on scene rows.

- [ ] **Step 3: Implement in `ManuscriptTree.tsx`**

- Add `onRename` and `onDelete` to `Props`.
- Show the `⋮` menu on scene rows as well; scene menus offer **Rename** and **Delete**, container menus keep their existing New scene / New chapter and gain Rename where the node is a real (non-synthetic) node.
- Rename opens a small inline `<form>` with an `<input>` labelled `Scene title`, pre-filled with the current title, submitting on Enter and closing on Escape. Trim before calling back and do not fire on an empty result.
- Delete opens an inline confirmation naming the node (`Delete "Station XII"? This cannot be undone from the app.`) with **Delete scene** and **Cancel**. Only **Delete scene** fires `onDelete`.
- Keep the existing single-open-menu behavior, the outside-click/Escape dismissal, and `aria-expanded` on the twisties.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/components/ManuscriptTree.test.tsx`
Expected: PASS, including the four new tests and all pre-existing ones.

- [ ] **Step 5: Wire `App.tsx`**

Import `renameManuscriptNode` and `deleteManuscriptNode` from `./lib/repository`, then pass to `<ManuscriptTree>`:

- `onRename`: find the node, call `renameManuscriptNode`, update `nodes` with the returned node, and surface any failure through `setAiError`.
- `onDelete`: find the node, call `deleteManuscriptNode`, remove it from `nodes`. **If the deleted node is the open document, move `activeId` to another scene first** so `active`'s fallback does not silently jump. Surface failures through `setAiError`.

- [ ] **Step 6: Verify all three gates**

Run: `npx vitest run`, `npm run build`, `cargo test --manifest-path src-tauri/Cargo.toml --offline` — all expected to pass.

- [ ] **Step 7: Commit**

```bash
git add src/components/ManuscriptTree.tsx src/components/ManuscriptTree.test.tsx src/App.tsx
git commit -m "$(printf 'Add rename and delete to the manuscript tree\n\nCo-Authored-By: Claude Opus 5 <noreply@anthropic.com>')"
```

---

### Task 4: Persist project settings on vault projects

**Files:**
- Modify: `src-tauri/src/vault.rs`
- Modify: `src-tauri/src/lib.rs`
- Modify: `src/lib/workflowRepository.ts`

**Interfaces:**
- Produces: `vault::read_workflow_state(root) -> Result<Option<serde_json::Value>, VaultError>` and `vault::write_workflow_state(root, &Value)`; Tauri commands `load_vault_workflow_state` / `save_vault_workflow_state`.

**Why:** the dashboard's genre, POV and brief selections are written through `save_workflow_state`, which is bound to `AppState.repository`. A vault project never populates it, so every write fails with "Open a project first" and every reload falls back to inferred defaults. The writer's selections have never been persisted on a vault project.

- [ ] **Step 1: Write the failing test**

Add to `mod tests` in `src-tauri/src/vault.rs`:

```rust
    #[test]
    fn workflow_state_round_trips_through_the_vault(){let dir=tempfile::tempdir().unwrap();let root=create_project(dir.path(),"Test").unwrap();assert!(read_workflow_state(&root).unwrap().is_none());let state=serde_json::json!({"projectId":"p1","currentPhaseId":"idea_capture","projectBrief":{"genre":"Dark Fantasy","pov":"third-limited"}});write_workflow_state(&root,&state).unwrap();let loaded=read_workflow_state(&root).unwrap().expect("expected stored state");assert_eq!(loaded["projectBrief"]["genre"],"Dark Fantasy");assert_eq!(loaded["projectBrief"]["pov"],"third-limited");}
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cargo test --manifest-path src-tauri/Cargo.toml --offline workflow_state_round_trips_through_the_vault`
Expected: FAIL to compile — the functions do not exist.

- [ ] **Step 3: Implement in `vault.rs`**

Store as `workflow.json` at the project root — pretty-printed so git diffs stay readable, and a missing file reads as `None` rather than an error:

```rust
/// Read the stored workflow state, or None when the project has never saved one.
pub fn read_workflow_state(root: &Path) -> Result<Option<serde_json::Value>, VaultError> {
    let path = root.join("workflow.json");
    if !path.exists() { return Ok(None); }
    let text = fs::read_to_string(path)?;
    if text.trim().is_empty() { return Ok(None); }
    Ok(serde_json::from_str(&text).ok())
}

/// Write the workflow state as pretty JSON so vault diffs stay readable.
pub fn write_workflow_state(root: &Path, state: &serde_json::Value) -> Result<(), VaultError> {
    let text = serde_json::to_string_pretty(state).map_err(|_| VaultError::InvalidWorkflowState)?;
    fs::write(root.join("workflow.json"), text)?;
    Ok(())
}
```

Add an `InvalidWorkflowState` variant to `VaultError` in the enum's existing style.

- [ ] **Step 4: Run it to verify it passes**

Run: `cargo test --manifest-path src-tauri/Cargo.toml --offline workflow_state_round_trips_through_the_vault`
Expected: PASS.

- [ ] **Step 5: Add the commands**

In `src-tauri/src/lib.rs`, beside the other vault commands, add `load_vault_workflow_state` and `save_vault_workflow_state` taking `tauri::State<'_, VaultState>`, shaped like `load_vault_workspace` for locking and root resolution. Register both in `invoke_handler![…]`.

- [ ] **Step 6: Route the TypeScript**

In `src/lib/workflowRepository.ts`, change the Tauri branches to call the vault commands. Delete the stale comment `// Vault projects have no legacy workflow store yet; use the inferred state.` — that gap is what this task closes. Keep the `inferWorkflowState` merge over the stored state, and keep the browser localStorage path unchanged.

Important: `loadWorkflowState`'s existing `try/catch` swallows failures into inferred defaults, which is exactly what hid this bug. Keep a catch (a first-run project legitimately has no file), but make sure a genuine write failure in `persistWorkflowState` still propagates so `saveWorkflow`'s error handler can surface it.

- [ ] **Step 7: Verify all three gates**

Run: `npx vitest run`, `npm run build`, `cargo test --manifest-path src-tauri/Cargo.toml --offline`.

- [ ] **Step 8: Commit**

```bash
git add src-tauri/src/vault.rs src-tauri/src/lib.rs src/lib/workflowRepository.ts
git commit -m "$(printf 'Persist project settings on vault projects\n\nCo-Authored-By: Claude Opus 5 <noreply@anthropic.com>')"
```

---

## Manual verification (for the writer, later)

1. Open the Meret Vale project. The tree lists the book, `Manuscript`, and the scenes.
2. `⋮` on a scene → **Rename** → type `Prologue` → Enter. The row retitles; reopening the project keeps it.
3. `⋮` on a duplicate import → **Delete** → confirm. The row goes; `git log` in the vault shows a snapshot commit taken before the removal.
4. `+` → a new scene appears at the end (this previously failed with "Open a project first").
5. Dashboard → set genre and POV → reopen the project. They persist. `workflow.json` exists in the vault.

## Out of scope

- Migrating the other ~70 `AppState`-bound commands (characters, comments, research, history, pipelines). Separate spec.
- Reordering, drag-and-drop, and splitting an imported scene into chapters.
- Real chapter hierarchy in the vault — `build_workspace` synthesizes one flat `chapter-root`.
