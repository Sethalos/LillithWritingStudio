use crate::repository::{ManuscriptNodeDto, ProjectDto, WorkspaceDto};
use crate::vault::{self, VaultError};
use std::path::Path;

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
