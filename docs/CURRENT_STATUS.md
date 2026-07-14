# Current project status

Last updated: 2026-07-14

## Current checkpoint

The command-center foundation and safe AI-review foundation are complete. The application has now entered hands-on usability testing of the first authoring slice using a newly created project and a short four-character dungeon story.

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

## Verification at pause point

- Production frontend build: passing.
- Frontend test suite: 42 tests passing.
- Rust/backend test suite: 42 tests passing.
- Focused editor and Comments & Notes tests: passing.
- Git whitespace/error check: passing.
- `cargo fmt --check` is unavailable because the Rust `rustfmt` component is not installed in this environment; no dependency was installed solely for formatting.

## Known follow-up work

1. Perform a second visual/usability pass on the repaired screens using the new test project.
2. Add project-cover replacement/removal for an existing project. The original failed cover selection could not be recovered because the older build never persisted it.
3. Improve Research empty-state language so it is explicit that the search box filters saved sources and is not an internet search engine.
4. Explain or progressively disclose optional Story Bible structured facts; keep them because structured retrieval and continuity checks use them.
5. Isolate AI-assisted Story Bible extraction more clearly from manual Story Bible editing and improve provider-error messages.
6. Configure and verify an actual AI provider/model. The observed Ollama HTTP 404 indicates an endpoint/model configuration problem, not a requirement for manual pages to depend on Ollama.
7. Exercise the central acceptance path: select manuscript text, invoke a character-aware tracked rewrite, inspect context, accept/reject/edit/regenerate, and confirm the accepted snapshot.
8. Continue the improved tracked-change interface: inline small-change review and partial segment decisions remain the next major implementation milestone.

## Exact restart point

Open the newly created test project and repeat the first pass through Dashboard, Manuscript, Comments & Notes, Research, Revision History, Characters, Story Bible, and Timeline/Relationships. Record any remaining readability or navigation defects. Then configure a provider in Models and run the first end-to-end character-aware tracked rewrite before expanding feature scope.

