# Combined local and GitHub integration

Verified on 15 October 2026 against upstream main `e1c9fca` and local feature
checkpoint `9594071`, on `codex/integrate-reader-developer-workflow`.
GitHub PR #1 was already merged upstream; this integration retains its work.

## Combined behavior

- Retains article investigations and their nine sections, reader search state,
  sign-in return destinations, developer console, and publication staging.
- Retains upstream Project Lab, private Casebook, bounded corpus graph,
  article embeddings, evidence provenance, context-aware comparisons, and
  pipeline recovery. Graph node inspectors still open article details.
- Retains the two approved developer accounts' server-side authorization:
  active administrator plus the exact backend allowlist. The new operations
  endpoints also enforce that gate. Graph synchronization and recovery require
  local pipeline execution to be enabled. UI controls wait for server access
  and pipeline capability checks.
- Serves one article detail endpoint. Static `/articles/recent` resolves before
  UUID article routes. Adds regression coverage for both navigation and access.
- Preserves the published migration chain `gmee03 -> gmee04 -> gmee05` and
  moves the unpublished local upload migration to `gmee06`, producing one head.

## Verification

| Check | Result |
| --- | --- |
| Backend default suite | 630 passed; 16 integration/model tests deselected |
| Backend coverage | 83.99%, above the 70% gate |
| Fresh PostgreSQL + pgvector integration | 13 passed, no skips |
| Fresh migrations | Entire baseline-to-gmee06 chain passed |
| Existing-data rehearsal | Separate restored copy retained 700 articles, 1,548 claims, four users and one staged upload |
| Frontend | 186 tests passed across 32 files |
| Production build and frontend lint | Passed |
| Backend lint and strict typing | Ruff passed; mypy passed for 190 app/test/script files |
| Infrastructure tests | 25 passed, six subtests passed |
| Static deployment contracts | Passed |
| PowerShell script parsing | Passed |
| Production preview in browser | Existing developer sign-in, Casebook, Project Lab and developer console verified; article detail and preserved search return checked locally |

The local Vite development session reset in-memory sign-in during verification.
The production build preview retained the session across advanced tabs and
developer navigation. No persistence of tokens was introduced. The preview uses
a separate database restore and API on loopback; original databases were not
migrated or overwritten. Neo4j is deliberately disabled in this isolated preview;
Neo4j-backed views report service unavailability instead of fabricated results.

## Private prototype migration rehearsal

The old local upload prototype used revision `gmee04`, conflicting with upstream's
different `gmee04` article embedding migration. Only the isolated restored copy
was reconciled: verify its old upload table and absence of Casebook, preserve the
upload table under a temporary name, return that copy's revision to `gmee03`,
apply upstream `gmee04`, `gmee05`, then upload `gmee06`, and copy the staged rows
into the new upload table. Row counts were verified before and after. This is
not a general instruction to stamp a live database or bypass migrations.

Local evidence, database identifiers, screenshots and a backup are under ignored
`output/merge-check-20261015/`; credentials and data dumps are excluded from Git.

## Verification boundaries

Real pretrained-model smoke tests and the complete Docker HTTP smoke were not
rerun for this merge. The required CI jobs retain those checks. No new accuracy
claim, scientific validation, public deployment, or research benchmark is implied
by the engineering tests above.
