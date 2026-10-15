# Cloud publishing verification

Implementation branch: `codex/cloud-publication-flow`.

The default backend suite includes release isolation, access gates, fingerprint
validation, unchanged active release after invalid upload, exact retries,
replacement and rollback, completed-analysis export boundaries and fresh-process
AI import isolation. A PostgreSQL concurrency test verifies exactly one winner
for two publishes with the same expected active revision.

Observed checks during implementation:

- 14 real PostgreSQL/pgvector integration tests passed after a fresh migration
  through gmee07, including concurrent publication.
- 187 frontend tests passed. Coverage before the final connection-state UI
  refinement: 83.45% statements, 74.94% branches, 75.86% functions, 88.32% lines.
- Frontend production build and ESLint passed. Strict mypy covers app, tests and
  scripts; Ruff and offline deployment validation pass.
- Standalone cloud dependencies installed in a fresh environment. No torch,
  spaCy, transformers, sentence-transformers, BERTopic, sklearn, numpy or pandas
  were loaded by that minimal runtime. The dedicated cloud CI installs that lock.
- Linux cloud Docker image built. With managed Neon/Upstash and a 384 MiB memory
  cap, readiness, approved developer login and upload access passed. A single
  post-login memory observation was 109.3 MiB. This is an engineering smoke
  measurement, not a concurrent-load capacity guarantee.
- Fresh Neon schema and its publication singleton migrated successfully. Upstash
  native Redis over TLS authenticated. The two previously approved developer
  identities were provisioned privately; accounts, passwords, sessions and full
  source text are excluded from publication JSON and Git.

Local evidence is in ignored `output/cloud-publishing/`. Cloud connection secrets
are outside the repository. Existing source databases have not been replaced.
No publication-v1 file is scientific gold merely because these checks pass.

Remaining release verification: final GitHub checks, Render backend deployment,
frontend API/CSP cutover, real browser sign-in and publication, and reading the
cloud release while local analysis services are disconnected. Published-data
backup/restore rehearsal and long-running quota monitoring remain operational
work; no zero-cost uptime guarantee is claimed.
