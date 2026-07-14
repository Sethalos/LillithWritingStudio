# Project folder structure

```text
My Novel.lillith/
  project.json
  manuscript/
    sections/<document-id>.html
    notes/<document-id>.md
  assets/
    images/
    references/
  database/
    project.sqlite3
  snapshots/
    <yyyy-mm-dd>/<revision-id>/
  exports/
  backups/
  indexes/
    vectors/                 optional adapter-owned files
  .lillith/
    locks/
    jobs/
    recovery/
```

`project.json` contains `formatVersion`, project UUID, title, timestamps, default locale, and relative paths only. It contains no API keys or machine-specific absolute paths.

Section names use stable UUIDs; human-readable titles live in SQLite and export manifests. This prevents renames and reorder operations from breaking links. HTML is the Phase 1 rich-text interchange format and must remain sanitized, UTF-8, and readable outside the application. Markdown notes remain ordinary files.

The `.lillith` folder is disposable operational state. `database`, `manuscript`, and `assets` are essential. Backups exclude caches and locks, include a manifest of SHA-256 hashes, and are verified before retention removes older copies.

## Obsidian vault location

Obsidian vaults normally live outside the portable `.lillith` project. The default application configuration points to one master `Lillith Studio Vault` with a `_Master` folder and a folder per project. A project may instead use an independent vault. Absolute vault paths and sync diagnostics are machine-local settings; portable project data stores stable configuration IDs and relative managed paths only.

Generated Markdown remains a derived projection and is not required to recover the structured project. See [OBSIDIAN_INTEGRATION.md](OBSIDIAN_INTEGRATION.md).
