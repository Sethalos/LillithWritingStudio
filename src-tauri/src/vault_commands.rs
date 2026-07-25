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
