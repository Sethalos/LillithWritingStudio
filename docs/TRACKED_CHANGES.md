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
