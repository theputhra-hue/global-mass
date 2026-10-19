# Antigravity live graph release and verification — 20 October 2026

Verification completed 20 October 2026 (Asia/Calcutta).
Associated PR: [#8](https://github.com/theputhra-hue/global-mass/pull/8), merged into `main` at commit `09c378c914fa6c0edef45f2420f12f77b2cb7f25`.
Target dataset: Active publication **revision 2**, run `0cc697f0-1089-4d96-905a-f6f718789ec8`.

## 1. Summary of outcome

The two verified live deficiencies have been resolved:
1. **Public relationship dataset active**: The hosted application now serves the reviewed 300-relationship dataset (7,421 articles, 5,157 claims, 300 relationships) rather than an empty dataset with zero links.
2. **Recorded graph layout live**: The backend publishes edge-aware bounded projections with typed relationships, score families, source scopes and underlying claim references. The live graph displays actual recorded similarity and evolution relationships rather than an artificial circular disk.

## 2. Release & deployment details

| Component | Identifier / Detail |
| --- | --- |
| Remote repository | `theputhra-hue/global-mass` |
| Feature branch | `codex/navigation-data-experience` |
| Feature commits | `cf760ed` (integration), `67e67b8` (mypy type hints) |
| Merged pull request | [PR #8](https://github.com/theputhra-hue/global-mass/pull/8) |
| Deployed commit (`main`) | `09c378c914fa6c0edef45f2420f12f77b2cb7f25` |
| Backend service | `global-mass-api` (`srv-db8hqo0473hc73f0jesg`) |
| Frontend service | `global-mass` (`srv-db88m5rncjis73f24vog`) |
| Active publication revision | **Revision 2** |
| Active release run ID | `0cc697f0-1089-4d96-905a-f6f718789ec8` |
| SHA-256 fingerprint | `7d7f6387d62884d144c1c9b21225f7c25da153551b8fb4d4c703dd45a5f3bb95` |
| Published at | `2026-10-19T20:17:19.798571Z` |
| Published by | `pavan@gmee.com` (authorized active developer) |
| Active corpus counts | **7,421 articles / 5,157 claims / 300 relationships** |
| Relationships breakdown | **257 SIMILAR_TO + 43 EVOLVED_FROM = 300** |
| Projected article pairs | **213 pair/type groups** across 260 participating articles; 68 within-article |

## 3. Automated checks (pre-release)

- **Frontend CI suite**: 39 test files, 278 tests passed.
  - Statements: 82.68% (CI threshold: 60%)
  - Branches: 75.89% (CI threshold: 50%)
  - Functions: 77.20% (CI threshold: 60%)
  - Lines: 89.50% (CI threshold: 60%)
- **Frontend architecture**:
  - `npm run check:architecture`: 93 source files passed; 0 cycles, 0 boundary violations.
  - `npm run test:architecture`: 3 architecture tests passed.
- **Frontend compilation**: `npx tsc --noEmit` clean; `npm run build` completed cleanly producing separate `layout.worker-*.js` (17.28 kB) and fallback layout chunk (16.83 kB).
- **Backend checks**:
  - `check_backend_architecture.py`: passed.
  - `check_cloud_runtime.py`: passed; confirms 0 ML packages loaded (`torch`, `spacy`, `transformers`, `sentence_transformers`, `bertopic`, `sklearn`, `numpy`, `pandas` absent).
  - Contract checks: `check_contracts` passed in `local`, `publication`, and `cloud` modes.
  - `ruff check`: passed across all backend files.
  - `mypy`: passed across all 214 backend source and test files.
  - `pytest`: 47 regression tests passed in 5.39s.
- **GitHub Actions PR #8 CI**:
  - `Backend CI`: PASS (4m 41s, full SQLite + Docker PostgreSQL pgvector integration suite)
  - `Frontend CI`: PASS (1m 3s, full Vitest suite with coverage thresholds)
  - `Cloud runtime`: PASS (21s, minimal runtime isolation)
  - `Deployment contracts`: PASS (`http-smoke` in 2m 25s, `powershell-contracts` in 16s, `static` in 14s)

## 4. Live API verification

All 12 endpoints verified live returning HTTP 200:

| Endpoint | HTTP | Time (ms) | Live observation |
| --- | ---: | ---: | --- |
| `/health` | 200 | 817 | Status ok, mode published |
| `/health/ready` | 200 | 309 | Postgres ok, Redis ok, Neo4j not_required |
| `/capabilities` | 200 | 282 | Live AI disabled, search_mode text, publication_enabled true |
| `/auth/me` | 200 | 296 | Confirmed `pavan@gmee.com`, role admin, active true |
| `/publications/status` | 200 | 381 | **Revision 2**, run `0cc697f0`, 7421/5157/300 counts |
| `/publications/access` | 200 | 280 | Upload allowed, 10 MiB limit |
| `/publications` | 200 | 451 | Staged history visible including run `0cc697f0` |
| `/publications/0cc697f0.../review` | 200 | 751 | Digest matches `7d7f63...`, counts 7421/5157/300 |
| `/dashboard` | 200 | 407 | Articles 7,421, claims 5,157, graph available |
| `/corpus/articles?q=NEET&limit=5&offset=0` | 200 | 310 | 56 matching records returned |
| `/graph/full` | 200 | 1,455 | Run `0cc697f0`, basis `published_article_relationship_projection`, **1000 nodes / 213 edges**, scope total 7,421 nodes / 300 relationships |
| `/graph/claims` | 200 | 1,079 | Run `0cc697f0`, basis `published_claim_relationships`, **1000 nodes / 300 edges**, scope total 5,157 nodes / 300 relationships |

## 5. Browser validation

Automated live browser checks via Playwright with developer authentication:
- **Dashboard**: Displays 7,421 articles, 5,157 claims, and active published status.
- **Article Graph**: Displays 1,000 articles with 213 similarity links, 13 outlets.
- **Claims Graph**: Displays 1,000 claims with 300 relationships.
- **Drill-down**: Selecting a claim/article on the graph opens the owning article details with navigation context preserved.
- **Mobile Viewport (390 × 844)**: `scrollWidth = 390`, `clientWidth = 390`. Zero horizontal overflow.
- **Anonymous Visitor Security**: Accessing `#/dashboard/upload` without authorization cleanly redirects to `#/signin?next=%23%2Fdashboard%2Fupload`.

## 6. Rollback instructions

### Code rollback
- If a code regression is identified in `main`:
  1. Revert PR #8 merge commit `09c378c` on `main`: `git revert -m 1 09c378c`.
  2. Push the revert to `origin/main` to redeploy the previous stable code (`1754bf9`).

### Data rollback
- If relationship data needs to be rolled back to revision 1 (0 relationships):
  1. Open Developer workspace → Upload History.
  2. Review the retained historical upload `8121d828-a47e-47cc-b5f6-a578984b694d`.
  3. Activate it by submitting `POST /api/v1/publications/8121d828-a47e-47cc-b5f6-a578984b694d/publish` with `expected_revision: 2` (which atomically publishes revision 3).
  4. Never delete past uploads from the database; historical revisions remain intact for rollback.
