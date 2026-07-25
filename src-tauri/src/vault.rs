use serde::{de::DeserializeOwned, Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum VaultError {
    #[error("filesystem error: {0}")] Io(#[from] std::io::Error),
    #[error("frontmatter error: {0}")] Yaml(#[from] serde_yaml::Error),
    #[error("note is missing its frontmatter block")] MissingFrontmatter,
    #[error("stale edit: expected revision {expected}, current revision is {actual}")]
    StaleRevision { expected: i64, actual: i64 },
    #[error("chapter {0} does not exist")] MissingChapter(String),
    #[error("project folder already exists: {0}")] AlreadyExists(String),
    #[error("not a project folder: {0}")] NotAProject(String),
}

/// Render a note as `---\n<yaml>---\n\n<body>\n`.
pub fn render_note<T: Serialize>(meta: &T, body: &str) -> Result<String, VaultError> {
    let yaml = serde_yaml::to_string(meta)?;
    Ok(format!("---\n{}---\n\n{}\n", yaml, body.trim_end_matches('\n')))
}

/// Parse a note into (frontmatter, body). Tolerates a leading BOM.
pub fn parse_note<T: DeserializeOwned>(text: &str) -> Result<(T, String), VaultError> {
    let trimmed = text.strip_prefix('\u{feff}').unwrap_or(text);
    let rest = trimmed.strip_prefix("---\n").ok_or(VaultError::MissingFrontmatter)?;
    let end = rest.find("\n---").ok_or(VaultError::MissingFrontmatter)?;
    let yaml = &rest[..end];
    let body = rest[end + 4..]
        .trim_start_matches(['\n', '\r'])
        .trim_end_matches(['\n', '\r']);
    let meta = serde_yaml::from_str::<T>(yaml)?;
    Ok((meta, body.to_string()))
}

/// Convert a title into a lowercase, ascii, dash-separated slug safe for folder/file names.
pub fn slugify(input: &str) -> String {
    let mut slug = String::new();
    let mut last_was_dash = false;
    for ch in input.trim().chars() {
        let mapped = match ch {
            'a'..='z' | '0'..='9' => Some(ch),
            'A'..='Z' => Some(ch.to_ascii_lowercase()),
            'à' | 'á' | 'â' | 'ä' | 'ã' | 'å' => Some('a'),
            'è' | 'é' | 'ê' | 'ë' => Some('e'),
            'ì' | 'í' | 'î' | 'ï' => Some('i'),
            'ò' | 'ó' | 'ô' | 'ö' | 'õ' => Some('o'),
            'ù' | 'ú' | 'û' | 'ü' => Some('u'),
            'ñ' => Some('n'),
            'ç' => Some('c'),
            _ => None,
        };
        match mapped {
            Some(c) => { slug.push(c); last_was_dash = false; }
            None => {
                if !last_was_dash && !slug.is_empty() { slug.push('-'); last_was_dash = true; }
            }
        }
    }
    let trimmed = slug.trim_matches('-').to_string();
    if trimmed.is_empty() { "untitled".to_string() } else { trimmed }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectMeta {
    pub format_version: u32,
    pub project_id: String,
    pub title: String,
    pub locale: String,
    pub created_at: String,
    pub updated_at: String,
}

fn now_iso() -> String {
    chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Secs, true)
}

/// Create a new project folder `<parent>/<slug>/` with project.md, an empty
/// manuscript/ folder, and a first chapter. Returns the project root path.
pub fn create_project(parent: &Path, title: &str) -> Result<PathBuf, VaultError> {
    let root = parent.join(slugify(title));
    if root.exists() {
        return Err(VaultError::AlreadyExists(root.to_string_lossy().into_owned()));
    }
    fs::create_dir_all(root.join("manuscript"))?;
    let now = now_iso();
    let meta = ProjectMeta {
        format_version: 1,
        project_id: uuid::Uuid::new_v4().to_string(),
        title: title.to_string(),
        locale: "en-US".to_string(),
        created_at: now.clone(),
        updated_at: now,
    };
    let body = format!("# {}\n\nProject notes.\n", title);
    fs::write(root.join("project.md"), render_note(&meta, &body)?)?;
    write_chapter_file(&root, &new_chapter_meta("Chapter One", 0), "")?;
    Ok(root)
}

/// Read the project.md frontmatter for an existing project folder.
pub fn read_project(root: &Path) -> Result<ProjectMeta, VaultError> {
    let path = root.join("project.md");
    if !path.is_file() {
        return Err(VaultError::NotAProject(root.to_string_lossy().into_owned()));
    }
    let text = fs::read_to_string(path)?;
    let (meta, _body) = parse_note::<ProjectMeta>(&text)?;
    Ok(meta)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChapterMeta {
    pub id: String,
    pub title: String,
    pub position: i64,
    pub revision: i64,
    pub updated_at: String,
}

pub(crate) fn new_chapter_meta(title: &str, position: i64) -> ChapterMeta {
    ChapterMeta {
        id: uuid::Uuid::new_v4().to_string(),
        title: title.to_string(),
        position,
        revision: 0,
        updated_at: now_iso(),
    }
}

fn chapter_filename(meta: &ChapterMeta) -> String {
    format!("{:02}-{}.md", meta.position + 1, slugify(&meta.title))
}

pub(crate) fn write_chapter_file(root: &Path, meta: &ChapterMeta, body: &str) -> Result<(), VaultError> {
    let path = root.join("manuscript").join(chapter_filename(meta));
    fs::write(path, render_note(meta, body)?)?;
    Ok(())
}

/// Return all chapters sorted by position, reading each file's frontmatter.
pub fn list_chapters(root: &Path) -> Result<Vec<ChapterMeta>, VaultError> {
    let dir = root.join("manuscript");
    let mut chapters = Vec::new();
    for entry in fs::read_dir(&dir)? {
        let path = entry?.path();
        if path.extension().and_then(|e| e.to_str()) != Some("md") { continue; }
        let text = fs::read_to_string(&path)?;
        let (meta, _body) = parse_note::<ChapterMeta>(&text)?;
        chapters.push(meta);
    }
    chapters.sort_by_key(|c| c.position);
    Ok(chapters)
}

fn find_chapter_path(root: &Path, id: &str) -> Result<PathBuf, VaultError> {
    let dir = root.join("manuscript");
    for entry in fs::read_dir(&dir)? {
        let path = entry?.path();
        if path.extension().and_then(|e| e.to_str()) != Some("md") { continue; }
        let text = fs::read_to_string(&path)?;
        let (meta, _body) = parse_note::<ChapterMeta>(&text)?;
        if meta.id == id { return Ok(path); }
    }
    Err(VaultError::MissingChapter(id.to_string()))
}

/// Read a single chapter's (frontmatter, body) by id.
pub fn read_chapter(root: &Path, id: &str) -> Result<(ChapterMeta, String), VaultError> {
    let text = fs::read_to_string(find_chapter_path(root, id)?)?;
    parse_note::<ChapterMeta>(&text)
}

/// Save chapter body if `expected_revision` matches the on-disk revision.
/// Bumps the revision, rewrites the file, and returns the new revision.
pub fn save_chapter(root: &Path, id: &str, body: &str, expected_revision: i64) -> Result<i64, VaultError> {
    let path = find_chapter_path(root, id)?;
    let text = fs::read_to_string(&path)?;
    let (mut meta, _body) = parse_note::<ChapterMeta>(&text)?;
    if meta.revision != expected_revision {
        return Err(VaultError::StaleRevision { expected: expected_revision, actual: meta.revision });
    }
    meta.revision += 1;
    meta.updated_at = now_iso();
    // Title/position unchanged here, so the filename is stable.
    fs::write(&path, render_note(&meta, body)?)?;
    Ok(meta.revision)
}

/// True when a `git` executable is on PATH.
pub fn git_available() -> bool {
    Command::new("git").arg("--version").output().map(|o| o.status.success()).unwrap_or(false)
}

fn run_git(root: &Path, args: &[&str]) -> Result<(), VaultError> {
    let output = Command::new("git").arg("-C").arg(root).args(args).output()?;
    if !output.status.success() {
        return Err(VaultError::Io(std::io::Error::other(
            String::from_utf8_lossy(&output.stderr).trim().to_string(),
        )));
    }
    Ok(())
}

/// Initialise a git repo in the project root with a local identity so commits
/// work even when the user has no global git config.
pub fn git_init(root: &Path) -> Result<(), VaultError> {
    run_git(root, &["init", "--quiet"])?;
    run_git(root, &["config", "user.email", "studio@lillith.local"])?;
    run_git(root, &["config", "user.name", "Lillith Writing Studio"])?;
    Ok(())
}

/// Stage everything and commit. A commit with no changes is treated as success.
pub fn git_commit(root: &Path, message: &str) -> Result<(), VaultError> {
    run_git(root, &["add", "-A"])?;
    let output = Command::new("git").arg("-C").arg(root)
        .args(["commit", "--quiet", "-m", message]).output()?;
    if output.status.success() { return Ok(()); }
    let stderr = String::from_utf8_lossy(&output.stderr);
    let stdout = String::from_utf8_lossy(&output.stdout);
    if stdout.contains("nothing to commit") || stderr.contains("nothing to commit") {
        return Ok(());
    }
    Err(VaultError::Io(std::io::Error::other(stderr.trim().to_string())))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[derive(Debug, PartialEq, Serialize, Deserialize)]
    struct Sample { name: String, count: i64 }

    #[test]
    fn frontmatter_round_trips() {
        let meta = Sample { name: "Peekaboo".into(), count: 3 };
        let text = render_note(&meta, "A quiet town.\n").unwrap();
        assert!(text.starts_with("---\n"));
        let (parsed, body): (Sample, String) = parse_note(&text).unwrap();
        assert_eq!(parsed, meta);
        assert_eq!(body, "A quiet town.");
    }

    #[test]
    fn parse_note_rejects_text_without_frontmatter() {
        let result = parse_note::<Sample>("just a body, no frontmatter");
        assert!(matches!(result, Err(VaultError::MissingFrontmatter)));
    }

    #[test]
    fn slugify_makes_safe_folder_names() {
        assert_eq!(slugify("The Chronicles of the Hollow Hills"), "the-chronicles-of-the-hollow-hills");
        assert_eq!(slugify("Book #1: The Rising Quiet!"), "book-1-the-rising-quiet");
        assert_eq!(slugify("   "), "untitled");
        assert_eq!(slugify("Café Déjà"), "cafe-deja");
    }

    #[test]
    fn create_then_read_project() {
        let parent = tempfile::tempdir().unwrap();
        let root = create_project(parent.path(), "The Hollow Hills").unwrap();
        assert!(root.join("project.md").is_file());
        assert!(root.join("manuscript").is_dir());
        assert_eq!(root.file_name().unwrap().to_str().unwrap(), "the-hollow-hills");

        let meta = read_project(&root).unwrap();
        assert_eq!(meta.title, "The Hollow Hills");
        assert!(!meta.project_id.is_empty());
        assert_eq!(meta.format_version, 1);
    }

    #[test]
    fn create_project_refuses_existing_folder() {
        let parent = tempfile::tempdir().unwrap();
        create_project(parent.path(), "Twice").unwrap();
        let second = create_project(parent.path(), "Twice");
        assert!(matches!(second, Err(VaultError::AlreadyExists(_))));
    }

    #[test]
    fn lists_reads_and_saves_chapters() {
        let parent = tempfile::tempdir().unwrap();
        let root = create_project(parent.path(), "Hills").unwrap();

        let chapters = list_chapters(&root).unwrap();
        assert_eq!(chapters.len(), 1);
        assert_eq!(chapters[0].title, "Chapter One");
        assert_eq!(chapters[0].revision, 0);
        let id = chapters[0].id.clone();

        let new_rev = save_chapter(&root, &id, "The rain fell on Peekaboo.", 0).unwrap();
        assert_eq!(new_rev, 1);

        let (meta, body) = read_chapter(&root, &id).unwrap();
        assert_eq!(meta.revision, 1);
        assert_eq!(body, "The rain fell on Peekaboo.");
    }

    #[test]
    fn save_chapter_rejects_stale_revision() {
        let parent = tempfile::tempdir().unwrap();
        let root = create_project(parent.path(), "Hills").unwrap();
        let id = list_chapters(&root).unwrap()[0].id.clone();
        save_chapter(&root, &id, "v1", 0).unwrap();
        let stale = save_chapter(&root, &id, "conflicting", 0);
        assert!(matches!(stale, Err(VaultError::StaleRevision { expected: 0, actual: 1 })));
    }

    #[test]
    fn snapshots_the_project_when_git_is_available() {
        if !git_available() { eprintln!("git not on PATH; skipping"); return; }
        let parent = tempfile::tempdir().unwrap();
        let root = create_project(parent.path(), "Hills").unwrap();
        git_init(&root).unwrap();
        assert!(root.join(".git").is_dir());
        let id = list_chapters(&root).unwrap()[0].id.clone();
        save_chapter(&root, &id, "New prose.", 0).unwrap();
        // Two commits should succeed without error.
        git_commit(&root, "Initial project").unwrap();
        git_commit(&root, "Write chapter one").unwrap();
    }
}
