# Risk register

| Risk | Likelihood | Impact | Mitigation / trigger |
| --- | --- | --- | --- |
| Section file and DB diverge after interruption | Medium | High | Atomic rename, hashes, WAL transaction, startup reconciliation |
| Rich-text round trips lose formatting | Medium | High | Canonical normalized model, golden DOCX fixtures, reviewed import preview |
| AI overwrites author work | Low | Critical | Proposal-only API, revision precondition hash, snapshot before accept |
| Sensitive prose leaks to remote provider | Medium | Critical | Exact context preview, local-first routing, explicit execution, redacted logs |
| Credential exposure | Low | Critical | OS keyring, opaque credential IDs, secret scanning tests |
| Native vector dependency breaks packaging | Medium | Medium | Port abstraction; ship FTS first; packaging spike before selection |
| 500k-word projects become sluggish | Medium | High | Section loading, virtual binder, background incremental indexing, benchmarks |
| Context retrieval is plausible but wrong | High | High | Provenance, point-in-story filters, pinned context, relevance explanations |
| Character state uses future knowledge | Medium | High | story-position validity intervals and temporal query tests |
| Voice Lock stereotypes dialect/culture | Medium | Medium | author-owned examples, avoid phonetic caricature defaults, review controls |
| Provider API/schema changes | High | Medium | capability adapters, contract fixtures, versioned request normalization |
| Local model returns invalid structured output | High | Medium | schema repair once, visible raw fallback, never auto-apply |
| Model prompt injection in manuscript | Medium | High | manuscript is quoted data, fixed instruction boundary, provider output validation |
| SQLite migration damages a project | Low | Critical | automatic verified backup, transactional migration, read-only failure mode |
| Python sidecar unavailable or mismatched | Medium | Medium | optional worker, version handshake, actionable diagnostics |
| Token/cost estimate is inaccurate | High | Low | mark approximate, provider-specific tokenizer, reconcile usage after response |
| Scope prevents a stable first release | High | High | strict vertical slice, milestone exit criteria, feature flags |
| Tauri platform inconsistencies | Medium | Medium | CI matrix and packaging smoke tests on target OS first |
| Backups silently corrupt | Low | Critical | hash manifests, periodic restore test, never delete last verified backup |

Risk owners are the module maintainers. Critical risks block release until their testable mitigation is present.
