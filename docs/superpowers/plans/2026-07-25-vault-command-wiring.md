# Vault Command Wiring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the desktop app read and write a real markdown Obsidian vault end-to-end: create/open a vault project, load its manuscript, and autosave chapter edits back to markdown files with git snapshots — using the `vault` module built in the previous plan.

**Architecture:** A pure `build_workspace(root)` function (new `src-tauri/src/vault_commands.rs`) maps a vault folder (`project.md` + `manuscript/*.md`) into the existing `WorkspaceDto` contract the frontend already consumes — one synthetic `book` + one synthetic `chapter` wrapping one `scene` node per manuscript markdown file. Thin Tauri command handlers in `lib.rs` hold the open project's root path in a new managed state and delegate to `vault` + `vault_commands`. The frontend `repository.ts` Tauri branch is repointed from the SQLite `*_project`/`save_document` commands to new `*_vault_*` commands. The SQLite `ProjectRepository` and its commands are left in place (unused for these operations) and removed in a later plan.

**Tech Stack:** Rust (Tauri commands, `serde`), the `vault` module from the prior plan, TypeScript (`repository.ts`), `cargo test` + `npm test` + `tsc`.

**Key mapping decisions (flagged for review):**
- **Vault file = UI "scene".** Each `manuscript/NN-title.md` becomes one `scene` node (the editable unit with content + revision). A single synthetic `book` (`id: "book-root"`) and `chapter` (`id: "chapter-root"`) wrap them so the existing Binder/EditorPane keep working unchanged. The richer tree is a later cockpit concern.
- **Content stored verbatim.** The TipTap editor currently emits HTML; this plan stores whatever string the editor provides as the chapter body. Pure-markdown editing is a later manuscript-editor phase. The vault frontmatter+body mechanism is content-agnostic, so this is forward-compatible.
- **New command names** (`create_vault_project`, `open_vault_project`, `load_vault_workspace`, `save_vault_document`) rather than reusing the SQLite command names, so both can coexist until SQLite is removed.

**Scope note:** No SQLite code is deleted. `App.tsx` is NOT modified (it already consumes `WorkspaceDto` via `repository.ts`; the browser dev path is unchanged). Only `repository.ts`'s `isTauri()` branches change.

---

## File structure

- **Create:** `src-tauri/src/vault_commands.rs` — the pure `build_workspace(root) -> WorkspaceDto` mapper + unit tests. One responsibility: vault→DTO translation.
- **Modify:** `src-tauri/src/lib.rs` — add `mod vault_commands;`, a `VaultState` managed state, four command handlers, and their registration in `generate_handler!`.
- **Modify:** `src-tauri/src/repository.rs` — make `ProjectDto`, `ManuscriptNodeDto`, `WorkspaceDto` constructible from another module (they already have `pub` fields; confirm and, if needed, add a small constructor). No behavior change.
- **Modify:** `src/lib/repository.ts` — repoint the four `isTauri()` branches to the new vault commands.

---

### Task 1: Pure `build_workspace` vault→WorkspaceDto mapper

**Files:**
- Create: `src-tauri/src/vault_commands.rs`
- Modify: `src-tauri/src/lib.rs` (add `mod vault_commands;`)

- [ ] **Step 1: Register the module**

In `src-tauri/src/lib.rs`, below the existing `mod vault;` line (line 4), add:

```rust
mod vault_commands;
```

- [ ] **Step 2: Write the failing test**

Create `src-tauri/src/vault_commands.rs` with:

```rust
use crate::repository::{ManuscriptNodeDto, ProjectDto, WorkspaceDto};
use crate::vault::{self, VaultError};
use std::path::Path;

fn word_count(text: &str) -> i64 {
    text.split_whitespace().count() as i64
}

/// Map a vault project folder into the WorkspaceDto the frontend consumes:
/// one synthetic book + chapter, and one `scene` node per manuscript markdown file.
pub fn build_workspace(root: &Path) -> Result<WorkspaceDto, VaultError> {
    let meta = vault::read_project(root)?;
    let project = ProjectDto {
        id: meta.project_id.clone(),
        title: meta.title.clone(),
        author: None,
        cover_image_data_url: None,
        locale: meta.locale.clone(),
        created_at: meta.created_at.clone(),
        updated_at: meta.updated_at.clone(),
        root_path: root.to_string_lossy().into_owned(),
    };

    let book = ManuscriptNodeDto {
        id: "book-root".into(), project_id: meta.project_id.clone(), parent_id: None,
        kind: "book".into(), title: meta.title.clone(), synopsis: None,
        scene_goal: None, scene_type: None, scene_location: None, word_goal: None,
        tags: vec![], position: 0, pov_character_id: None, word_count: 0,
        content: None, revision: 0, updated_at: meta.updated_at.clone(),
    };
    let chapter = ManuscriptNodeDto {
        id: "chapter-root".into(), project_id: meta.project_id.clone(),
        parent_id: Some("book-root".into()), kind: "chapter".into(),
        title: "Manuscript".into(), synopsis: None, scene_goal: None, scene_type: None,
        scene_location: None, word_goal: None, tags: vec![], position: 0,
        pov_character_id: None, word_count: 0, content: None, revision: 0,
        updated_at: meta.updated_at.clone(),
    };

    let mut nodes = vec![book, chapter];
    for chapter_meta in vault::list_chapters(root)? {
        let (_m, body) = vault::read_chapter(root, &chapter_meta.id)?;
        nodes.push(ManuscriptNodeDto {
            id: chapter_meta.id.clone(), project_id: meta.project_id.clone(),
            parent_id: Some("chapter-root".into()), kind: "scene".into(),
            title: chapter_meta.title.clone(), synopsis: None, scene_goal: None,
            scene_type: None, scene_location: None, word_goal: None, tags: vec![],
            position: chapter_meta.position, pov_character_id: None,
            word_count: word_count(&body), content: Some(body), revision: chapter_meta.revision,
            updated_at: chapter_meta.updated_at.clone(),
        });
    }
    Ok(WorkspaceDto { project, nodes })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn build_workspace_maps_project_and_chapters() {
        let parent = tempfile::tempdir().unwrap();
        let root = vault::create_project(parent.path(), "Hollow Hills").unwrap();
        let id = vault::list_chapters(&root).unwrap()[0].id.clone();
        vault::save_chapter(&root, &id, "The rain fell.", 0).unwrap();

        let ws = build_workspace(&root).unwrap();
        assert_eq!(ws.project.title, "Hollow Hills");
        assert_eq!(ws.nodes[0].kind, "book");
        assert_eq!(ws.nodes[1].kind, "chapter");
        let scenes: Vec<_> = ws.nodes.iter().filter(|n| n.kind == "scene").collect();
        assert_eq!(scenes.len(), 1);
        assert_eq!(scenes[0].content.as_deref(), Some("The rain fell."));
        assert_eq!(scenes[0].revision, 1);
        assert_eq!(scenes[0].word_count, 3);
    }
}
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `cargo test --manifest-path src-tauri/Cargo.toml --offline vault_commands::`
Expected: FAIL to compile — the `ManuscriptNodeDto`/`ProjectDto`/`WorkspaceDto` fields may not all be constructible from another module (see Task 2 if a privacy error appears), or the test simply fails to find the module until wired. If the compiler reports private fields on the DTO structs, complete Task 2 first, then return here.

- [ ] **Step 4: Run the test to verify it passes (after any Task 2 visibility fix)**

Run: `cargo test --manifest-path src-tauri/Cargo.toml --offline vault_commands::tests::build_workspace_maps_project_and_chapters`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src-tauri/src/vault_commands.rs src-tauri/src/lib.rs
git commit -m "feat(vault): map vault folder to frontend WorkspaceDto"
```

---

### Task 2: Ensure DTO structs are constructible from `vault_commands`

**Files:**
- Modify: `src-tauri/src/repository.rs`

Context: `ProjectDto`, `ManuscriptNodeDto`, and `WorkspaceDto` (in `repository.rs` around lines 44-54) already declare their fields `pub`. Rust struct *fields* being `pub` plus the struct being `pub` means another module in the same crate can construct them — UNLESS a field type or the struct is not `pub`. This task verifies and, only if needed, fixes visibility. Do NOT change any behavior.

- [ ] **Step 1: Attempt to build and read the compiler output**

Run: `cargo build --manifest-path src-tauri/Cargo.toml --offline 2>&1 | grep -A3 "private" || echo "no privacy errors"`
Expected: either "no privacy errors" (then this task is a no-op — skip to Step 3) or specific `field X of struct Y is private` errors.

- [ ] **Step 2: If (and only if) privacy errors appeared, make the named items pub**

For each private field or struct the compiler named, add `pub` to it in `src-tauri/src/repository.rs`. Example: if it reports `word_goal` is private, change `word_goal: Option<i64>` to `pub word_goal: Option<i64>` in `ManuscriptNodeDto`. Change nothing else.

- [ ] **Step 3: Verify the whole crate builds**

Run: `cargo build --manifest-path src-tauri/Cargo.toml --offline`
Expected: builds (dead-code warnings are fine).

- [ ] **Step 4: Commit (skip if Step 1 said "no privacy errors" and nothing changed)**

```bash
git add src-tauri/src/repository.rs
git commit -m "chore(repository): expose DTO fields for vault mapping"
```

---

### Task 3: Vault-backed Tauri command handlers

**Files:**
- Modify: `src-tauri/src/lib.rs`

- [ ] **Step 1: Add the managed state and imports**

In `src-tauri/src/lib.rs`, find the existing `struct AppState { repository: Mutex<Option<ProjectRepository>> }` (near line 11). Immediately after it, add a second managed state for the open vault project root:

```rust
struct VaultState { project_root: std::sync::Mutex<Option<std::path::PathBuf>> }
```

- [ ] **Step 2: Add the four command handlers**

In `src-tauri/src/lib.rs`, add these functions (place them next to the other `#[tauri::command]` functions, e.g. just after the existing `load_workspace` command near line 60):

```rust
#[tauri::command]
fn create_vault_project(state: tauri::State<'_, VaultState>, parent_path: String, title: String) -> Result<repository::WorkspaceDto, String> {
    let root = vault::create_project(std::path::Path::new(&parent_path), &title).map_err(|e| e.to_string())?;
    let _ = vault::git_init(&root);
    let _ = vault::git_commit(&root, "Create project");
    let workspace = vault_commands::build_workspace(&root).map_err(|e| e.to_string())?;
    *state.project_root.lock().map_err(|_| "Vault lock poisoned".to_string())? = Some(root);
    Ok(workspace)
}

#[tauri::command]
fn open_vault_project(state: tauri::State<'_, VaultState>, project_path: String) -> Result<repository::WorkspaceDto, String> {
    let root = std::path::PathBuf::from(&project_path);
    let workspace = vault_commands::build_workspace(&root).map_err(|e| e.to_string())?;
    *state.project_root.lock().map_err(|_| "Vault lock poisoned".to_string())? = Some(root);
    Ok(workspace)
}

#[tauri::command]
fn load_vault_workspace(state: tauri::State<'_, VaultState>) -> Result<repository::WorkspaceDto, String> {
    let guard = state.project_root.lock().map_err(|_| "Vault lock poisoned".to_string())?;
    let root = guard.as_ref().ok_or_else(|| "No project is open".to_string())?;
    vault_commands::build_workspace(root).map_err(|e| e.to_string())
}

#[tauri::command]
fn save_vault_document(state: tauri::State<'_, VaultState>, document_id: String, content: String, expected_revision: i64) -> Result<i64, String> {
    let guard = state.project_root.lock().map_err(|_| "Vault lock poisoned".to_string())?;
    let root = guard.as_ref().ok_or_else(|| "Open a project before saving".to_string())?;
    let revision = vault::save_chapter(root, &document_id, &content, expected_revision).map_err(|e| e.to_string())?;
    let _ = vault::git_commit(root, &format!("Edit {document_id}"));
    Ok(revision)
}
```

- [ ] **Step 3: Register the state and commands**

In `src-tauri/src/lib.rs`, in the `run()` function's builder chain, find `.manage(AppState { repository: Mutex::new(None) })` and add after it:

```rust
        .manage(VaultState { project_root: std::sync::Mutex::new(None) })
```

Then in the `tauri::generate_handler![ ... ]` list, add these four names to the list (e.g. right after `load_workspace,`):

```rust
create_vault_project, open_vault_project, load_vault_workspace, save_vault_document,
```

- [ ] **Step 4: Verify the crate builds**

Run: `cargo build --manifest-path src-tauri/Cargo.toml --offline`
Expected: builds successfully (dead-code warnings fine).

- [ ] **Step 5: Confirm all Rust tests still pass**

Run: `cargo test --manifest-path src-tauri/Cargo.toml --offline`
Expected: PASS — all vault, vault_commands, providers, and repository tests pass.

- [ ] **Step 6: Commit**

```bash
git add src-tauri/src/lib.rs
git commit -m "feat(vault): add vault-backed project commands"
```

---

### Task 4: Repoint the frontend to the vault commands

**Files:**
- Modify: `src/lib/repository.ts`

- [ ] **Step 1: Repoint `saveDocument`**

In `src/lib/repository.ts`, the current `saveDocument` (line 83-88) has:

```ts
export async function saveDocument(node: ManuscriptNode, content: string): Promise<number> {
  if (isTauri()) return invoke<number>("save_document", { documentId: node.id, content, expectedRevision: node.revision });
  localStorage.setItem(`lillith:document:${node.id}`, content);
  await new Promise((resolve) => setTimeout(resolve, 220));
  return node.revision + 1;
}
```

Change the invoke line's command name from `"save_document"` to `"save_vault_document"`:

```ts
  if (isTauri()) return invoke<number>("save_vault_document", { documentId: node.id, content, expectedRevision: node.revision });
```

- [ ] **Step 2: Repoint `chooseAndOpenProject`**

In `src/lib/repository.ts` (line 133-138), change the invoke command name from `"open_project"` to `"open_vault_project"`:

```ts
  return invoke<WorkspaceData>("open_vault_project", { projectPath: selected });
```

- [ ] **Step 3: Repoint `chooseAndCreateProject`**

In `src/lib/repository.ts` (line 148), change the invoke command from `"create_project"` to `"create_vault_project"` and drop the `coverImageDataUrl` argument (the vault create command does not take it):

```ts
  return invoke<WorkspaceData>("create_vault_project", { parentPath: selected, title });
```

- [ ] **Step 4: Repoint `loadCurrentWorkspace`'s Tauri path**

In `src/lib/repository.ts`, `loadCurrentWorkspace` (line 95-97) currently only returns the browser `loadWorkspace()`. In Tauri, the open project must be loaded via the backend. Change it to:

```ts
export function loadCurrentWorkspace(): WorkspaceData | null {
  return loadWorkspace();
}

export async function loadTauriWorkspace(): Promise<WorkspaceData | null> {
  if (!isTauri()) return null;
  try {
    return await invoke<WorkspaceData>("load_vault_workspace");
  } catch {
    return null;
  }
}
```

(Adding `loadTauriWorkspace` as a new export leaves the synchronous browser path untouched; App-level use of it is a later cockpit task and out of scope here.)

- [ ] **Step 5: Type-check and run the frontend tests**

Run: `npm run build 2>&1 | tail -20`
Expected: `tsc -b` passes with no type errors, and the Vite build completes.

Run: `npm test`
Expected: PASS — the existing 49 tests still pass (the browser dev path is unchanged).

- [ ] **Step 6: Commit**

```bash
git add src/lib/repository.ts
git commit -m "feat(vault): repoint frontend repository to vault commands"
```

---

### Task 5: Integration checkpoint

**Files:**
- None (verification only)

- [ ] **Step 1: Full Rust test + build**

Run: `cargo test --manifest-path src-tauri/Cargo.toml --offline && cargo build --manifest-path src-tauri/Cargo.toml --offline`
Expected: all tests pass; crate builds.

- [ ] **Step 2: Full frontend build + test**

Run: `npm run build && npm test`
Expected: type-check + build succeed; 49 tests pass.

- [ ] **Step 3: Confirm the commits are scoped (no WIP swept in)**

Run: `git diff --stat f79a1e3..HEAD -- src src-tauri | tail -20` then review that only `vault.rs`, `vault_commands.rs`, `lib.rs`, `repository.rs`, and `repository.ts` appear — no `App.tsx`, `AiPanel.tsx`, `providers.rs`, etc.
Expected: only the intended files.

---

## Self-review

**Spec coverage (spec §14 phase 1 "get manuscript reading/writing markdown; app runs on the vault", plus §3/§4):**
- Create/open a vault project → Task 3 `create_vault_project`/`open_vault_project`. ✓
- Load manuscript from markdown → Task 1 `build_workspace` + Task 3 `load_vault_workspace`. ✓
- Autosave chapter edits back to markdown with git snapshot → Task 3 `save_vault_document` (calls `vault::save_chapter` + `git_commit`). ✓
- Preserve the existing `WorkspaceDto` frontend contract → Task 1 maps to it; App.tsx untouched. ✓
- Revision-staleness safety preserved → `save_vault_document` passes `expected_revision` through to `vault::save_chapter`. ✓
- **Deferred (correctly out of scope):** HTML→markdown editor conversion (manuscript-editor phase); richer book/chapter tree & chapter-filename scheme for add/reorder (cockpit phase); wiring `loadTauriWorkspace` into `App.tsx` startup (cockpit phase); removing SQLite commands (later cleanup); multi-project switching (§8).

**Placeholder scan:** No "TBD"/"handle errors"/"similar to". Every code step is complete. The one conditional task (Task 2) is explicitly gated on compiler output with a "no-op if clean" path.

**Type consistency:** `build_workspace(root) -> Result<WorkspaceDto, VaultError>` is used identically in Task 1 and Task 3. Command names introduced in Task 3 (`create_vault_project`, `open_vault_project`, `load_vault_workspace`, `save_vault_document`) match exactly the names the frontend invokes in Task 4. `ManuscriptNodeDto` field names used in Task 1 match the struct in `repository.rs:50`. `VaultState.project_root` field name is consistent across state definition, handlers, and registration.
