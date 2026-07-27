use crate::repository::{ManuscriptNodeDto, ProjectDto, WorkspaceDto};
use crate::vault::{self, ChapterMeta, VaultError};
use std::path::Path;

pub(crate) const NOT_VERSIONED: &str = "This project isn't under version control, so a deleted scene couldn't be recovered. Initialise git in the project folder (git init) before deleting anything.";

// NOTE: chapter bodies are stored verbatim (currently TipTap HTML). Converting
// bodies to true markdown is a later manuscript-editor phase; until then we strip
// tags here so word counts reflect readable prose, not markup.
pub(crate) fn word_count(text: &str) -> i64 {
    let mut plain = String::with_capacity(text.len());
    let mut inside = false;
    for ch in text.chars() {
        match ch {
            '<' => inside = true,
            '>' => { inside = false; plain.push(' '); }
            _ if !inside => plain.push(ch),
            _ => {}
        }
    }
    plain.split_whitespace().count() as i64
}

/// The single definition of a vault scene as the frontend sees it. Every command
/// that returns a scene (workspace load, create, rename) must build it here: the
/// frontend replaces a whole node with the returned DTO, so a field populated in
/// one site and hardcoded in another silently erases it on the other paths.
pub(crate) fn scene_node(project_id: &str, meta: &ChapterMeta, body: &str) -> ManuscriptNodeDto {
    ManuscriptNodeDto {
        id: meta.id.clone(), project_id: project_id.to_string(),
        parent_id: Some("chapter-root".into()), kind: "scene".into(),
        title: meta.title.clone(), synopsis: None, scene_goal: None,
        scene_type: None, scene_location: None, word_goal: None, tags: vec![],
        position: meta.position, pov_character_id: None,
        word_count: word_count(body), content: Some(body.to_string()),
        revision: meta.revision, updated_at: meta.updated_at.clone(),
    }
}

/// Delete a scene, but only once a snapshot the writer could actually recover
/// from exists. The snapshot is a precondition, never a courtesy: if the vault
/// is not its own git repo, or the commit fails, nothing is deleted. Prose is
/// irreplaceable and this is the only destructive path in the app.
pub(crate) fn delete_chapter_with_snapshot(root: &Path, document_id: &str) -> Result<(), String> {
    let (meta, _body) = vault::read_chapter(root, document_id).map_err(|e| e.to_string())?;
    if !vault::is_git_repo_root(root) {
        return Err(NOT_VERSIONED.to_string());
    }
    vault::git_commit(root, &format!("Snapshot before deleting {}", meta.title))
        .map_err(|e| format!("Could not snapshot this project before deleting, so nothing was deleted: {e}"))?;
    vault::delete_chapter(root, document_id).map_err(|e| e.to_string())
}

/// Read the stored workflow state. With no project open there is genuinely no
/// state to load — that is `None`, not an error, so the frontend never has to
/// recognise a first-run condition by string-matching an error message.
pub(crate) fn workflow_state(root: Option<&Path>) -> Result<Option<serde_json::Value>, String> {
    match root {
        None => Ok(None),
        Some(root) => vault::read_workflow_state(root).map_err(|e| e.to_string()),
    }
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

    // "book-root"/"chapter-root" are safe synthetic ids: real scene ids are UUIDs from the vault, so they cannot collide.
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
        nodes.push(scene_node(&meta.project_id, &chapter_meta, &body));
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

    #[test]
    fn word_count_ignores_html_tags() {
        let parent = tempfile::tempdir().unwrap();
        let root = vault::create_project(parent.path(), "Html").unwrap();
        let id = vault::list_chapters(&root).unwrap()[0].id.clone();
        // The attribute (space inside the tag) makes the naive split_whitespace
        // count differ from the tag-stripped count, so this test actually guards
        // the HTML stripping: raw would count 4 tokens, stripped counts 3 words.
        vault::save_chapter(&root, &id, "<p style=\"m\">The rain fell.</p>", 0).unwrap();
        let ws = build_workspace(&root).unwrap();
        let scene = ws.nodes.iter().find(|n| n.kind == "scene").unwrap();
        assert_eq!(scene.word_count, 3);
    }

    #[test]
    fn build_workspace_orders_scenes_by_position() {
        let parent = tempfile::tempdir().unwrap();
        let root = vault::create_project(parent.path(), "Ordered").unwrap();
        let c2 = vault::new_chapter_meta("Second", 1);
        vault::write_chapter_file(&root, &c2, "two").unwrap();
        let c3 = vault::new_chapter_meta("Third", 2);
        vault::write_chapter_file(&root, &c3, "three").unwrap();
        let ws = build_workspace(&root).unwrap();
        let positions: Vec<i64> = ws.nodes.iter().filter(|n| n.kind == "scene").map(|n| n.position).collect();
        assert_eq!(positions, vec![0, 1, 2]);
        let titles: Vec<&str> = ws.nodes.iter().filter(|n| n.kind == "scene").map(|n| n.title.as_str()).collect();
        assert_eq!(titles, vec!["Chapter One", "Second", "Third"]);
    }

    #[test]
    fn delete_refuses_and_keeps_the_prose_when_the_vault_has_no_git_repo() {
        let parent = tempfile::tempdir().unwrap();
        let root = vault::create_project(parent.path(), "No Repo").unwrap();
        let doomed = vault::create_chapter(&root, "Doomed").unwrap();
        vault::save_chapter(&root, &doomed.id, "<p>3000 irreplaceable words.</p>", 0).unwrap();

        let result = delete_chapter_with_snapshot(&root, &doomed.id);

        assert_eq!(result.unwrap_err(), NOT_VERSIONED);
        let (_meta, body) = vault::read_chapter(&root, &doomed.id).expect("the scene must still be on disk");
        assert_eq!(body, "<p>3000 irreplaceable words.</p>");
    }

    #[test]
    fn delete_refuses_when_only_an_ancestor_folder_is_a_git_repo() {
        if !vault::git_available() { eprintln!("git not on PATH; skipping"); return; }
        let parent = tempfile::tempdir().unwrap();
        // The writer keeps ~/writing under git; the vault itself is not a repo.
        vault::git_init(parent.path()).unwrap();
        let root = vault::create_project(parent.path(), "Nested").unwrap();
        let doomed = vault::create_chapter(&root, "Doomed").unwrap();

        let result = delete_chapter_with_snapshot(&root, &doomed.id);

        assert_eq!(result.unwrap_err(), NOT_VERSIONED);
        assert!(vault::read_chapter(&root, &doomed.id).is_ok());
    }

    #[test]
    fn delete_snapshots_then_removes_the_scene_in_a_versioned_vault() {
        if !vault::git_available() { eprintln!("git not on PATH; skipping"); return; }
        let parent = tempfile::tempdir().unwrap();
        let root = vault::create_project(parent.path(), "Versioned").unwrap();
        vault::git_init(&root).unwrap();
        let doomed = vault::create_chapter(&root, "Doomed").unwrap();

        delete_chapter_with_snapshot(&root, &doomed.id).unwrap();

        assert!(vault::read_chapter(&root, &doomed.id).is_err());
        let log = std::process::Command::new("git").arg("-C").arg(&root).args(["log", "--oneline"]).output().unwrap();
        assert!(String::from_utf8_lossy(&log.stdout).contains("Snapshot before deleting Doomed"));
    }

    #[test]
    fn workflow_state_is_none_when_no_project_is_open() {
        assert_eq!(workflow_state(None).unwrap(), None);
    }

    #[test]
    fn workflow_state_reads_an_open_project_and_still_surfaces_corruption() {
        let parent = tempfile::tempdir().unwrap();
        let root = vault::create_project(parent.path(), "Workflow").unwrap();
        assert_eq!(workflow_state(Some(&root)).unwrap(), None);
        vault::write_workflow_state(&root, &serde_json::json!({"projectBrief": {"genre": "Dark Fantasy"}})).unwrap();
        let loaded = workflow_state(Some(&root)).unwrap().expect("stored state");
        assert_eq!(loaded["projectBrief"]["genre"], "Dark Fantasy");
        std::fs::write(root.join("workflow.json"), "{ not valid json").unwrap();
        assert!(workflow_state(Some(&root)).is_err());
    }

    #[test]
    fn scene_node_is_the_single_source_of_the_scene_dto() {
        let parent = tempfile::tempdir().unwrap();
        let root = vault::create_project(parent.path(), "Shared DTO").unwrap();
        let meta = vault::create_chapter(&root, "Second").unwrap();
        vault::save_chapter(&root, &meta.id, "<p>Rain fell.</p>", 0).unwrap();
        let (meta, body) = vault::read_chapter(&root, &meta.id).unwrap();
        let project_id = vault::read_project(&root).unwrap().project_id;

        let direct = scene_node(&project_id, &meta, &body);
        let from_workspace = build_workspace(&root).unwrap().nodes.into_iter().find(|n| n.id == meta.id).unwrap();

        assert_eq!(serde_json::to_value(&direct).unwrap(), serde_json::to_value(&from_workspace).unwrap());
        assert_eq!(direct.word_count, 2);
    }

    #[test]
    fn build_workspace_handles_empty_manuscript() {
        let parent = tempfile::tempdir().unwrap();
        let root = vault::create_project(parent.path(), "Bare").unwrap();
        for entry in std::fs::read_dir(root.join("manuscript")).unwrap() {
            std::fs::remove_file(entry.unwrap().path()).unwrap();
        }
        let ws = build_workspace(&root).unwrap();
        assert_eq!(ws.nodes.iter().filter(|n| n.kind == "scene").count(), 0);
        assert_eq!(ws.nodes.len(), 2);
    }
}
