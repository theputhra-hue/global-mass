# Cloud publishing verification

Implementation: PR #4 merged as `23f4a46f0422693104f9a8e0aefee87741baaa25`.
Deployment verification date: 2026-10-16 (Asia/Kolkata).

The default backend suite includes release isolation, access gates, fingerprint
validation, unchanged active release after invalid upload, exact retries,
replacement and rollback, completed-analysis export boundaries and fresh-process
AI import isolation. A PostgreSQL concurrency test verifies exactly one winner
for two publishes with the same expected active revision.

Observed checks during implementation:

- 643 default backend tests passed, with 17 integration/model tests deselected;
  statement coverage was 82.78%. The separate PostgreSQL run is listed below.
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

## Live deployment evidence

- All PR #4 GitHub checks passed before merge.
- Free Render Docker API: https://global-mass-api.onrender.com,
  service `srv-db8hqo0473hc73f0jesg`, deployment
  `dep-db8hqog473hc73f0jhj0`, main commit `23f4a46`. Render reported Live after
  53.4 seconds. This is deployment duration, not a cold-start measurement.
- Frontend: https://global-mass.onrender.com, service
  `srv-db88m5rncjis73f24vog`, deployment `dep-db8hr7l9fdbs73ec56f0` succeeded.
  Its built API base and CSP connect-src now use the cloud API instead of the
  expired Cloudflare tunnel. Other security headers were preserved.
- Public readiness returned PostgreSQL `ok`, Redis `ok`, Neo4j `not_required`.
  Capabilities returned published mode with local AI and pipeline disabled.
- Browser login as the approved developer succeeded. Upload access, history,
  review, provenance and the explicit review checkbox were exercised live.
- The existing 500-article analysis was uploaded as a **private staged release**:
  1,536 claims, 71 relationships, run
  `324e7ded-d8b0-4f66-afd3-feef9e865dbf`, SHA-256
  `8dc34fb8ece32e9cbd68bbd138550a5e7b83fd4d55e5b3583856a4bf04cbcbac`.
  It has not been approved or activated for visitors. The public head remains
  revision 0, and the site explicitly reports awaiting the first publication.
- Live deterministic comparison detected the changed span `20` to `200` and
  returned its heuristic limitations. This cloud operation and sign-in worked
  while the local analysis API was stopped. Published corpus reading with the
  PC disconnected still needs the first approved release.
- The isolated local preview was backed up and migrated from gmee06 to gmee07;
  the original source database was not migrated or replaced. Authenticated local
  export returned HTTP 200 with a matching SHA-256 header: 497 processed articles,
  1,536 claims and 72 relationships in the selected analysis period. This fresh
  export differs from the earlier staged file; it was retained locally, not
  substituted into the cloud draft.

Screenshots and local smoke artifacts are in ignored `output/cloud-publishing/`:
`render-backend-live.png`, `live-developer-upload.png` and
`live-release-review.png`. Connection secrets remain outside the repository.

Remaining release gates: developer approval of the complete staged JSON,
first live activation, browsing/searching its articles and claims with local
analysis disconnected, and a production rollback rehearsal. Published-data
backup/restore rehearsal, load measurement and long-running quota monitoring
remain operational work; no zero-cost uptime guarantee is claimed.
