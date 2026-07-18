# Current project status

Last updated: 2026-07-18

## Current checkpoint

The visible product is being simplified around the author’s actual loop: **Dashboard → Project Workflow → Manuscript + Lillith**. The primary navigation now exposes those three destinations. Project Workflow is a seven-stage visual path—Idea, Story Development, Manuscript, Revisions, Production, Publishing, and Marketing—rather than the former sixteen-phase form carousel. The active stage is derived from project evidence and displayed in orange; each stage opens its owning workspace.

The Manuscript workspace remains the canonical story surface above a larger persistent project-wide Lillith conversation. Assistant responses can be explicitly kept in the manuscript; ordinary brainstorming stays conversational until the author chooses to keep it. The unrelated right-hand context rail has been removed. Story Bible navigation now precedes Writing in the sidebar because characters, world knowledge, timeline, and relationships are supporting project memory rather than the author’s main data-entry path.

The embedded Manuscript conversation is now a single conventional chat surface rather than a secondary AI control panel. Review tabs, routing/cost banners, context toggles, reset controls, and canned prompt buttons are absent from this workspace. The composer accepts multiple images and readable text/Markdown/CSV/JSON/HTML documents up to 10 MB each. OpenAI Responses requests send images as vision input and include readable document contents; non-vision text providers still receive readable document text. PDF and DOCX chat extraction remain a follow-up because those formats require the isolated document worker rather than browser text decoding.

The intended next architecture is for accepted collaboration decisions to update structured project memory immediately and record a quiet activity note, while rejected or exploratory brainstorming never enters canon. Image generation is an approved later capability for character portraits, maps, chapter art, and cover production, with project-wide visual identity and explicit generation requests.

The command-center foundation and safe AI-review foundation are complete. Granular tracked-review decisions now persist as queryable audit records and appear in Revision History. The application remains in hands-on usability testing of the first authoring slice using a newly created project and a short four-character dungeon story.

The desktop application remains runnable. Local project creation, manuscript autosave, character records, Story Bible records, research, revision history, timeline, relationships, AI provider configuration, tracked proposals, Obsidian synchronization, import/export, and backups have implemented data paths rather than decorative mock data.

## Repairs completed from the first usability test

- Restored a persistent guided **Next** action in the global top bar. It routes through the workflow recommendation rather than assuming a rigid sequence.
- Bounded the manuscript editor and Ask Lillith dock independently so a long manuscript cannot push the chat controls off screen.
- Added underline support to the TipTap manuscript editor.
- Persisted project cover images for newly created native projects and displayed them on the dashboard.
- Allowed free scene notes in Comments & Notes without requiring an anchored manuscript selection; anchored comments remain supported.
- Made character list fields accept ordinary phrases with spaces and comma- or newline-separated multiple values.
- Added visible Character Save errors and explicit full-name validation guidance.
- Reconciled the legacy light/tan panels with the current dark blue visual system.
- Increased undersized text and improved field, dropdown, button, and option contrast in Characters, Story Bible, Research, Revision History, Timeline, and Relationships.
- Corrected a project-settings repository recursion exposed while adding cover persistence.

## Tracked-review audit milestone

- Added migration 15 for ordered proposal-segment decisions.
- Persisted accepted, rejected, unchanged, and author-edited segments with the proposal decision instead of flattening partial review into a general note.
- Required the Rust backend to recompose the submitted segment map and reject it when it does not exactly match the reviewed replacement text.
- Exposed the stored segment outcome in Revision History with applied, kept-original, and author-edited labels.
- Preserved the existing revision/hash, unique-target, snapshot, and single-decision guards.

## Existing-project cover milestone

- Added a Project Identity settings surface with a live cover preview.
- Added guarded PNG, JPEG, and WebP replacement for existing local projects, limited to 6 MB.
- Added explicit cover removal and immediate dashboard/project-state refresh without reopening the project.
- Added backend validation and replace/remove persistence coverage.

## Verification at pause point

- Production frontend build: passing.
- Frontend test suite: 43 tests passing.
- Rust/backend test suite: 44 tests passing.
- Python document-worker test suite: 4 tests passing.
- Focused editor and Comments & Notes tests: passing.
- Git whitespace/error check: passing.
- `cargo fmt --check` is unavailable because the Rust `rustfmt` component is not installed in this environment; no dependency was installed solely for formatting.

## Known follow-up work

1. Perform a second visual/usability pass on the repaired screens using the new test project.
2. Improve Research empty-state language so it is explicit that the search box filters saved sources and is not an internet search engine.
3. Explain or progressively disclose optional Story Bible structured facts; keep them because structured retrieval and continuity checks use them.
4. Isolate AI-assisted Story Bible extraction more clearly from manual Story Bible editing and improve provider-error messages.
5. Configure and verify an actual AI provider/model. The observed Ollama HTTP 404 indicates an endpoint/model configuration problem, not a requirement for manual pages to depend on Ollama.
6. Exercise the central acceptance path: select manuscript text, invoke a character-aware tracked rewrite, inspect context, accept/reject/edit/regenerate, and confirm the accepted snapshot.
7. Continue the improved tracked-change interface: persisted partial segment decisions are complete; rich-text mark-aware segmentation and broader change-set review remain.

## Exact restart point

Open the newly created test project and repeat the first pass through Dashboard, Manuscript, Comments & Notes, Research, Revision History, Characters, Story Bible, and Timeline/Relationships. Record any remaining readability or navigation defects. Then configure a provider in Models and run the first end-to-end character-aware tracked rewrite before expanding feature scope.
