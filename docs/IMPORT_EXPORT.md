# Import and export

Import and export protect portability and prevent proprietary lock-in. Format conversion is performed through a normalized document model and reviewed jobs rather than direct uncontrolled mutation.

## Supported formats

Import supports DOCX, Markdown, plain text, HTML, and EPUB where practical. Export supports DOCX, Markdown, plain text, standalone HTML, EPUB 3, PDF proof, Kindle EPUB, and print-oriented paperback/hardcover DOCX presets.

## Import flow

1. Copy or stage the source in a restricted job directory.
2. Normalize headings, chapters, scenes, breaks, inline emphasis, block quotes, and metadata.
3. Present a preview with detected structure, counts, and warnings.
4. Commit only after author confirmation.
5. Create normal manuscript nodes, section files, revisions, and index jobs.

Import never replaces an existing project tree without an explicit reviewed operation.

## Export flow

Exports follow binder order and read ordinary section files through the repository boundary. Project settings and credentials are excluded. Each format preserves the structures it can represent, including chapter headings, scene breaks, emphasis, block quotes, front matter, page breaks, and table-of-contents structure.

Publishing presets apply format-specific typography and production rules while preserving source manuscript files.

## Worker boundary

Rust supervises an isolated Python worker for formats where mature Python tooling is appropriate. The worker does not open SQLite and communicates through versioned JSON job contracts. System Python is currently required; a packaged runtime remains a release gate for dependency-free installation.

## Verification

- Golden fixtures cover formatting and scene boundaries.
- Import previews are deterministic.
- Export artifacts are opened or parsed in format-specific tests.
- Failures leave source projects unchanged and retain actionable diagnostics.
