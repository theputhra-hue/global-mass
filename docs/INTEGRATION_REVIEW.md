# Upstream and major-project integration — 15 October 2026

Repository: [theputhra-hue/global-mass](https://github.com/theputhra-hue/global-mass).
The working archive had no `.git` directory. Integration uses a separate clone
at `E:\global-main\global-mass-integration`; the original archive and running
preview are retained at `E:\global-main\global-main`.

## History and scope

- Fetched upstream `main` at `8d8ff3c14c17b155b27dc15a40b634bd67460794`.
- Reconstructed archive changes against shared base
  `b4893083dfcef2c2a9e246d019236ca8ebaf2a93` on `codex/local-upgrades`.
- Applied that branch through Git's three-way squash merge onto the fetched
  upstream, on `codex/major-project-integration`.
- Resolved overlapping source/test/configuration edits individually, preserving
  the latest upstream additions and the archive's engineering/research fixes.

The final integration commit is a descendant of upstream; no upstream history
is rewritten. This work does not push, deploy, modify live databases, replace
tunnels or run migrations against the existing corpus.

## Preserved behavior and compatibility repairs

| Area | Combined behavior |
|---|---|
| Reader/sign-in | Upstream beginner dashboard, dedicated authentication page, account boundary and advanced-tab explanations remain; optional registration name is retained |
| Public demonstration | `#/project` exposes fixed disclosed controls without account access; all `#/dashboard/*` routes retain upstream sign-in enforcement |
| Advanced workspace | Project Lab, private Casebook, operational controls, exact spans and session-safe caches combine with upstream navigation/layout |
| Corpus retrieval | Document embeddings are preferred; claim-vector fallback keeps existing claim-only articles searchable, deduplicated by article |
| Authentication | Refresh/logout row locking, inactive-login rejection and account/refresh race protections are retained |
| Readiness | PostgreSQL and Redis remain required; unconfigured optional Neo4j is disabled; public errors do not expose driver details |
| Native hosting | Prepared local models, offline inference and read-only schema preflight retain compatibility with both embedding-loader options |
| Schema | Published migrations are preserved; additive `gmee04` → `gmee05` forms one head; no live migration is performed |
| Research | Provenance-aware annotation, frozen exports, quantity/context analysis, selective/span/context metrics and honest authored-control reports are retained |
| Toolchain | Node 24, patched Vite/Vitest, Tailwind 4 and existing quality thresholds remain |
| Local state | Both ignore-rule sets retain credential/backup/runtime exclusions and the tracked read-only UI sweep helper |

## Validation

These checks ran against the merged checkout. Prior archive reports in
[Verification](VERIFICATION.md) remain historical evidence and are not
substituted for an integrated run.

| Check | Result |
|---|---|
| Full offline backend suite | **591 passed**, 16 integration/model cases deselected; **83.77%** application coverage, above the unchanged 70% gate |
| Full frontend suite | **159 passed in 29 files**; lines **90.60%**, statements **85.80%**, branches **76.24%**, functions **78.36%** |
| Static analysis/build | Ruff passed; strict mypy passed across **180 source files**; frontend ESLint, test TypeScript compilation and production build passed |
| Infrastructure | **23 offline tests passed**; eight PowerShell files parsed with the AST, without executing helpers or changing execution policy |
| Deployment contracts | Static Compose normalization/isolation, Dockerfile/proxy policy, CI/Render contracts and local Markdown links passed |
| Dependencies | Full-tree and production npm audits both report **zero findings** |
| Schema/API | Alembic reports one head, `gmee05`; OpenAPI regenerated from the merged runtime |
| Browser | Public controls render actual results; selected comparison and spans update; anonymous advanced-route navigation redirects to the dedicated sign-in page |

Evidence is stored under [`validation/2026-10-15/`](validation/2026-10-15/)
with the `integration-` prefix, including JUnit, coverage, dependency audits,
source fingerprints and a browser screenshot. Twelve Python 3.12 SQLite
datetime-adapter deprecation warnings remain in test fixtures; no test failed.
Final fetch confirmed upstream `main` remained at `8d8ff3c` before commit.

The Docker engine/WSL recovery remains with the user. Real PostgreSQL migration,
new PostgreSQL integration cases, rebuilt production-image HTTP smoke and
authenticated full-stack browser checks remain deployment gates. Source tests
and offline preview behavior do not establish those outcomes. No independent
human benchmark or held-out publication experiment is fabricated by this merge.
