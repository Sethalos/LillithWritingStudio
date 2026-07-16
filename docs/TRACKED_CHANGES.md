# Tracked-change workflow

```text
canonical revision N
  -> capture selection + hash
  -> assemble and persist context package
  -> execute AI run
  -> validate response
  -> immutable proposal (pending)
       | reject/defer: decision only; manuscript unchanged
       | edit: create child proposal with author-edited replacement
       ` accept: verify revision/hash -> snapshot -> apply -> revision N+1
```

Each proposal records document ID, base revision/hash, exact range, before/after, issue, rationale, evidence, strategies, context package, prompt/model/run, and decision history. Comparison is semantic at the proposal range and displayed side by side; later phases add inline word-level diff.

Accept is a single backend operation. It re-reads the current section and rejects a stale proposal if its base revision/hash or target text does not match. On success it writes a recoverable snapshot, atomically saves the new section content, creates a revision row with parent revision, records an accepted decision, and queues indexing. Undo creates a new revision; history is never rewritten.

Each `document_revisions.snapshot_path` points to the content of that exact revision and its SHA-256 hash. Before replacement, the prior revision snapshot is ensured; after atomic replacement, the new revision receives its own snapshot. History restore reads the selected snapshot and writes it as a new revision with source `undo`.

Multi-change operations are change sets. The user may accept items independently. Overlapping accepted changes require rebase/review. A project rule created from a decision is a separate explicit action with provenance back to the decision.

## Editing modes

- **Suggest Only** records evidence and repair strategies without replacement text.
- **Tracked Rewrite** produces a reviewable proposal and remains the default.
- **Direct Apply** requires explicit author enablement and still creates revision history and a snapshot.

These modes are implemented for selection-level AI operations. Suggest Only instructs the model to return the original selection unchanged and exposes findings/strategies without an apply action. Direct Apply requires a fresh acknowledgement for each operation; it still creates an auditable proposal and uses the same backend revision, hash, unique-target, and snapshot checks as tracked acceptance.

## Granular review

Small plain-text revisions are now decomposed into whitespace-preserving insert/delete/replace hunks with unchanged anchors. The review surface supports accepting or rejecting individual hunks and editing the composed proposed version. The exact reviewed text is submitted to the desktop backend and must pass the proposal's document revision, content hash, and unique-target checks before the snapshot-backed save occurs. Paragraph and scene rewrites continue to use side-by-side comparison.

Granular choices are stored as ordered, independently queryable segment records linked to the final proposal decision. Each record preserves its before/after text and whether the author accepted it, rejected it, left it unchanged, or replaced it with an explicit edit. The backend recomposes the submitted segment map and rejects acceptance unless it exactly matches the reviewed replacement. Revision History exposes these decisions after the review. Regeneration with additional instructions is implemented: every regenerated proposal stores its parent proposal, instruction, and editing mode, and the backend rejects cross-document lineage.

The rich-text segment representation remains an explicit unresolved design decision. It must preserve supported formatting marks, comments, scene breaks, annotations, and metadata, and it must fail closed when anchors no longer match.
