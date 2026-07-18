# Obsidian integration

Obsidian is Lillith's human-readable knowledge layer. SQLite remains authoritative for structured project data and canon.

## Vault modes

Lillith supports two configurations:

1. **Master vault with project folders — default.** One `Lillith Studio Vault` contains reusable `_Master` knowledge and one folder per project.
2. **Independent project vault.** A project may point to a dedicated vault instead.

Suggested default layout:

```text
Lillith Studio Vault/
  _Master/
    Writing Craft/
    Research/
    Publishing/
    Style Guides/
    Reusable Knowledge/
  <Project Title>/
    Characters/
    World/
    Timeline/
    Research/
    Revision Notes/
    Project Memory/
```

Machine-specific absolute vault paths belong in application/project settings, never portable `project.json` data.

## Version 1 authority and direction

Version 1 is conservative one-way synchronization from Lillith to Obsidian.

- Only approved structured data is exported.
- Lillith does not automatically import external edits into canon.
- Manual Obsidian notes are preserved.
- External edits to generated material are detected and reported as conflicts.
- Conflicts require an explicit author decision; sync does not silently overwrite them.
- The engine records enough base/hash information for controlled two-way synchronization later.

## Generated Markdown

Each managed page contains stable generated-section delimiters. The synchronizer may replace only the generated region after confirming the expected prior hash. Content outside those delimiters is author-owned.

```markdown
# David Chen

<!-- lillith:generated:start record=character:<id> version=<n> -->
## Overview
...
## Psychology
...
## Voice Lock
...
<!-- lillith:generated:end -->

## Author Notes

This section is never replaced by synchronization.
```

Generated content may include overview, psychology, Voice Lock, current-state summary, directional relationships, arc, appearances, approved quotes, open threads, and approved AI observations. Wiki links should use stable configured paths and readable titles.

## Safe sync algorithm

1. Resolve and validate the configured vault root.
2. Build a deterministic projection from approved SQLite records.
3. Read the existing target file without modifying it.
4. Separate generated and manual regions.
5. Compare the stored base hash, observed generated hash, and new projection hash.
6. If the generated region changed externally, create a conflict and skip the write.
7. Otherwise replace only the generated region through a temporary file and atomic rename.
8. Record mappings, hashes, result, diagnostics, and timestamp.

New files are created without overwriting unrelated paths. Renames use stable mappings rather than title-only discovery. Deleted or superseded records should be archived or marked according to an explicit policy; they are not silently deleted in Version 1.

## Proposed persistence

- `obsidian_vault_configs`
- `obsidian_record_mappings`
- `obsidian_sync_runs`
- `obsidian_sync_items`
- `obsidian_sync_conflicts`

Mappings store project/entity IDs, relative paths, generated/base hashes, last observed file hash, and last successful sync. Conflict records store expected, observed, and proposed hashes plus a human-readable reason; manuscript or sensitive content should not be duplicated into logs.

## Security and portability

Vault access is restricted to an explicitly selected canonical root. Relative paths are normalized and cannot escape the vault. Symlink handling must be deliberate and tested. The sync preview lists every create/update/skip/conflict action before a manual full sync when practical.

## Future controlled two-way sync

The design reserves a future import-review queue. External changes may eventually be parsed into proposed structured changes, but they must pass validation and author approval before entering SQLite canon. Version 1 does not implement this behavior.
