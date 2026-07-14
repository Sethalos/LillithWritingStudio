# Risk register

This is the authoritative product risk register. `RISKS.md` is retained as a compatibility pointer.

| Risk | Likelihood | Impact | Required mitigation |
| --- | --- | --- | --- |
| Section file and SQLite diverge after interruption | Medium | High | Atomic saves, hashes, WAL transactions, startup reconciliation |
| Rich-text round trips lose formatting | Medium | High | Normalized document model and golden fixtures |
| AI overwrites author work | Low | Critical | Proposal default, revision preconditions, snapshot before mutation |
| Remote provider receives unintended prose | Medium | Critical | Exact context inspection, bounded retrieval, explicit execution |
| Credential exposure | Low | Critical | OS credential store, opaque references, secret-scanning tests |
| Context retrieval is plausible but wrong | High | High | Provenance, exclusions, story-position filters, pins, relevance explanations |
| Future character knowledge leaks backward | Medium | High | Validity intervals and temporal query tests |
| Dashboard scores create false authority | Medium | High | Findings first; disclose formula, evidence, scope, confidence, and analysis method |
| Dashboard duplicates or contradicts module data | Medium | Medium | Derived read models query owning modules; no duplicate canon |
| Obsidian sync overwrites manual notes | Medium | Critical | Generated delimiters, hash checks, atomic writes, conflict-and-skip policy |
| External generated-section edits are lost | Medium | High | Store base/observed hashes and require explicit conflict resolution |
| Vault path escapes configured root | Low | Critical | Canonicalization, relative-path validation, symlink tests |
| Two-way sync creates competing canon | Medium | Critical | Version 1 one-way only; future imports enter a proposal queue |
| Local model returns invalid structured output | High | Medium | One repair attempt, visible failure, never auto-apply |
| Provider APIs change | High | Medium | Typed adapters and recorded contract fixtures |
| SQLite migration damages a project | Low | Critical | Verified backup, transactional migration, read-only failure mode |
| Python runtime is missing or incompatible | Medium | Medium | Diagnostics now; embedded runtime before dependency-free claim |
| Large projects become sluggish | Medium | High | Section loading, virtual lists, incremental indexes, performance fixtures |
| Backups silently corrupt | Low | Critical | Hash manifests, verification, restore tests, preserve last verified backup |
| Scope expansion weakens the writing workflow | High | High | Follow approved order and keep Character Studio/AI Editor as product heart |

Critical risks block a release claim until their mitigation is covered by a repeatable test.
