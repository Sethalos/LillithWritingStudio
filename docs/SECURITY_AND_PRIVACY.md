# Security and privacy

Lillith is private and local-first, but optional model providers and external vaults create explicit trust boundaries.

## Data boundaries

- Manuscripts, structured project memory, indexes, revisions, and operation history are stored locally.
- Remote provider calls occur only after the author configures a provider and runs an operation.
- The exact assembled context is inspectable before or alongside execution.
- Obsidian synchronization writes only inside a selected canonical vault root.
- The Python document worker receives job files, not direct SQLite access or provider credentials.

## Credentials

API secrets are stored in the operating-system credential store. SQLite and frontend state contain only opaque credential references. Secrets are excluded from projects, logs, backups, exports, and vault Markdown.

## Filesystem safety

Project and vault paths are canonicalized. Relative paths cannot traverse outside their configured roots. Section saves and generated Markdown updates use temporary files and atomic replacement. Existing generated content is hash-checked before replacement.

## AI safety

Manuscript and retrieved text are quoted as untrusted data beneath fixed system instructions. Provider output is schema-validated. Model output never silently becomes manuscript text or canon. Logs are metadata-only unless diagnostic logging is explicitly enabled and clearly warns about content exposure.

## Recovery

SQLite uses foreign keys, WAL, busy timeout, and transactional migrations. Manuscript acceptance uses revision/hash preconditions and creates a snapshot. Backups include hash manifests and are verified. Recovery creates a new project rather than overwriting an existing one.

## Offline behavior

Core project editing, structured memory, deterministic analysis, FTS, bundled semantic retrieval, backups, history, and Obsidian projection should work without internet access. Remote AI operations fail visibly and do not block local editing.

## Threats requiring tests

- Path traversal and symlink escape
- Credential leakage into durable data or logs
- Prompt injection through manuscript or research content
- Stale revision acceptance
- Obsidian generated-region overwrite after external edits
- Malformed import archives and document-worker input
- Migration interruption and backup corruption

See [RISK_REGISTER.md](RISK_REGISTER.md) for the maintained risk list.
