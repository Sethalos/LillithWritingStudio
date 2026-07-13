# First vertical slice

## User outcome

A user can create/open a local project, organize a book into chapters and scenes, edit one section with autosave, create a psychologically rich character and Voice Lock, select dialogue, inspect character-aware context, request an OpenAI-compatible rewrite, and accept or reject the proposed replacement. They can import or export a DOCX through a reviewed document job.

## Included

- Tauri desktop shell, project launcher, and React/TipTap workspace.
- Versioned SQLite schema and local project-folder contract.
- SQLite-backed binder metadata with project creation/opening and chapter/scene creation.
- One-section-at-a-time editing, word count, autosave status.
- Persistent multi-character Identity, Psychology, and complete versioned Voice Lock editing surfaces.
- Generic OpenAI-compatible connection configuration and task routing.
- Selection rewrite and dialogue/Voice Lock review request contracts.
- Inspectable context drawer with provenance and token estimates.
- Immutable AI proposal with before/after comparison and accept/reject/defer.
- Revision/snapshot records.
- DOCX import/export job boundary, then python-docx worker.

## Acceptance criteria

1. A project survives close/reopen with text, binder, and character fields intact.
2. At least 100 chapters and 2,000 scenes can be listed without loading bodies.
3. A failed save never destroys the last durable section file.
4. A rewrite cannot alter canonical text before acceptance.
5. The UI identifies every context item sent and its source/version.
6. Voice Lock examples and stress modes appear in dialogue-review context.
7. Rejection/defer decisions persist and influence later context.
8. Exported DOCX preserves headings, scene breaks, emphasis, and block quotes.
9. Secrets are absent from SQLite, logs, exports, and frontend state.

## Out of slice

Vector retrieval, relationship graph, dynamic state editing, arc visualization, pacing maps, specialized non-compatible provider adapters, EPUB/PDF/KDP, series memory, plugins, and autonomous review rooms remain later milestones.
