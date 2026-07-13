# Document worker

This optional sidecar will normalize DOCX/HTML/EPUB input into Lillith's section document model and render exports. It communicates with Rust using newline-delimited JSON over stdio, performs no network access, and never opens the project database directly.

Phase 1 job methods: `inspect_import`, `import_docx`, `export_docx`, and `health`. Import first returns a preview of heading/scene segmentation and warnings; only an approved manifest is committed by Rust. `python-docx` is pinned after golden round-trip fixtures are established.
