# Antigravity: deploy the existing graph implementation and reviewed relationship release

Prepared 20 October 2026, Asia/Calcutta. Workspace: `D:\expirements\GMEE`.

## Objective and work ownership

Fix the two verified live problems end to end: visitors see an older dataset with
zero relationships, and the hosted graph uses the old decorative circular layout.
Integrate and deploy the already implemented graph work; review and activate the
existing relationship release using the normal publication workflow. Verify the
actual hosted application afterward. Do not rebuild the graph from scratch.

Antigravity owns integration, necessary release corrections, fresh verification,
Git delivery and Render rollout for this handoff. Codex is preparing this handoff
only and will not edit application files concurrently. Before changing a file,
check the current coordination status and verify no other editor owns it. Keep
unrelated daily-analysis packages C1–C3 outside this task.

Create and maintain your own status file:
`docs/coordination/ANTIGRAVITY_LIVE_GRAPH_RELEASE_STATUS.md`.
Record state, branch/HEAD, owned files, checks, deployed frontend/backend commit
IDs, current active release/revision, blockers and next action. Do not overwrite
the existing Codex or daily-analysis status files. If interrupted, leave enough
evidence for Codex to resume without repeating uploads or activation.

## 1. Establish the real baseline and preserve the shared checkout

Read applicable repository instructions, inspect `git status` and diffs, then read:

- `docs/validation/LIVE_SITE_VERIFICATION_2026-10-20.md`
- `docs/contracts/RECORDED_GRAPH_V1.md`
- `docs/architecture/GRAPH_REALISM_VERIFICATION_2026-10-18.md`
- `docs/validation/RELATIONSHIP_ANALYSIS_EXPORT_2026-10-18.md`
- `docs/validation/PUBLICATION_REVIEW_TIMEOUT_FIX_2026-10-18.md`
- Both existing daily-analysis coordination files.

There are many legitimate uncommitted changes, including graph, article,
navigation and developer-workflow work. Preserve them. Do not reset, clean, force
push, discard or blindly stage everything. Review the integration diff and include
every required new graph library/worker/projection file and dependency lockfile.
Do not commit credentials, exports, database backups, ignored evidence or model
assets. Verify the Git remote is `theputhra-hue/global-mass` without printing any
credential-bearing URL. Fetch and inspect divergence before choosing a normal
merge/rebase strategy; resolve conflicts by retaining both intended behaviors.

Inspect the actual remote target/deployed branch rather than assuming the local
branch is production. Follow existing branch protection and PR rules. Record the
exact tested commit and ensure deployment uses that commit. Never claim that a
local build, successful push or queued deploy means the hosted site is updated.

## 2. Recheck live state without writes

Frontend: `https://global-mass.onrender.com`.
API base: `https://global-mass-api.onrender.com/api/v1`.
Use the existing developer account through supported sign-in/private credentials;
never print passwords, tokens or connection strings. Do not create accounts or
weaken authentication, developer allowlisting or rate limits.

The last verified active release was revision **1**, run
`8121d828-a47e-47cc-b5f6-a578984b694d`, with **7,421 articles / 5,157 claims /
0 relationships**. A newer release already exists in upload history:

| Field | Expected value |
| --- | --- |
| Run ID | `0cc697f0-1089-4d96-905a-f6f718789ec8` |
| Articles | 7,421 |
| Claims | 5,157 |
| Relationships | 300 |
| SHA-256 publication fingerprint | `7d7f6387d62884d144c1c9b21225f7c25da153551b8fb4d4c703dd45a5f3bb95` |
| Local export | `publication-outbox/gmee-full-relationship-analysis-20261018T101021Z.json` |

Read `/health/ready`, `/capabilities`, `/publications/status`, authorized upload
history/review, `/dashboard`, `/graph/full` and `/graph/claims`. The previous check
passed all 12 requests; that does not guarantee current state. If the target
release is already active, skip activation and verify it. If another release has
replaced it, compare provenance before changing anything; do not overwrite newer
work using stale revision 1. Do not re-upload an existing matching release.

## 3. Integrate what already exists

Inspect these implementation groups and their tests:

- Graph UI: `FullCorpusGraph.tsx`, `RecordedNetworkCanvas.tsx`, and
  `frontend/src/features/graph/lib/` normalization, layout, scene, worker and hooks.
- API types: `frontend/src/shared/api/graph.ts`.
- Cloud/local readers: `backend/app/api/v1/graph.py`, `published.py`, and
  `backend/app/services/publications/graph_projection.py`.
- Publication review: `backend/app/api/v1/publications.py` and
  `frontend/src/features/publishing/pages/DeveloperUpload.tsx`.
- Existing article drill-down, shared workspace and navigation changes.

Preserve typed similarity/evolution/duplicate semantics, source release and scope,
edge-aware sampling, bounded projections, claim references, immutable API objects,
worker cancellation and exact neighbor inspection. With zero usable edges the
default must be searchable records and an explicit no-network explanation, with
no ornamental node disk. With real edges, use the existing weighted force layout.
Do not randomize final positions to make them merely look less symmetrical.

Rendered distance is approximate layout geometry, not truth, exact semantic
distance, elapsed time or proof of transmission. Evolution arrows follow the
stored child-to-candidate-parent convention. Unknown data stays unknown. Do not
fabricate links, lower analysis thresholds, silently infer cloud KNN edges or
regenerate the source corpus to fill the graph. Preserve the review timeout fix:
bounded metadata/sample reads, operation-specific error labels, safe review retry
and uncertain-outcome guidance for writes.

## 4. Run fresh checks before release

Use installed project runtimes. From `frontend`, run the full test suite, lint,
architecture guard and its tests, and production build. Run the existing CI
coverage command without weakening thresholds. Confirm the worker is included in
the production output and loads under the production CSP.

From `backend`, run graph, publication, published-reader, article-insight and cloud
isolation regression tests, plus relevant Ruff/mypy checks. Run
`infra/scripts/check_backend_architecture.py` and
`infra/scripts/check_cloud_runtime.py` from the correct project root/runtime.
Inspect the actual CI configuration for additional required checks. Historical
277/278-test results are context only; report fresh results.

Test zero links, mixed real relationship types, invalid scores/dangling endpoints,
release isolation, projection aggregation, filters removing every edge, API
failure/retry and stale publication revisions. Keep fixtures clearly synthetic;
never upload them. Use the existing local cloud profile or an isolated test store
for zero-release/connected-release checks; do not activate old production data
just to get a screenshot. Do not mark daily preflight packages complete.

## 5. Deliver and deploy the lightweight cloud services

Use `render.cloud.yaml` and `backend/Dockerfile.cloud` as the cloud-profile
references. The older `render.yaml` names `gmee-v1`/`gmee-backend` and includes a
different deployment profile; do not apply it to the current services blindly.
Inspect Render's actual configured repository, branch, root, build and runtime.
Preserve existing Neon/Upstash credentials, database contents, JWT secret and
free service plans. Do not recreate services, rotate secrets or enable cloud ML.

Confirm the frontend build uses
`VITE_API_BASE_URL=https://global-mass-api.onrender.com/api/v1`; CORS allows
`https://global-mass.onrender.com`; frontend CSP permits that API and the actual
module worker. Keep scheduler and developer pipeline disabled in cloud. Keep
the existing developer upload authorization and publication activation behavior.

Deliver the reviewed changes through the normal Git/PR flow, then manually deploy
the backend and frontend at the verified commit. Prefer backend first because
the graph contract is additive, then frontend; check compatibility during the
transition. Avoid duplicate auto/manual deployments if one is already running.
Record build logs/status and commit IDs. If a migration is involved, inspect it
and recovery implications first; do not reset the database. Follow mandatory
organization approvals if encountered and report their exact blocker.

## 6. Review and activate the existing release

After both code deployments are healthy, sign in and open Developer workspace →
the existing 300-relationship upload → Review / publish. Compare the complete
export's schema, references, counts and provenance with its stored review.
Distinguish the publication schema's canonical SHA-256 fingerprint from a raw
file-byte checksum; use the project's canonical calculation for comparison.

Expected relationship analysis: **257 similarity + 43 candidate evolution = 300**.
Of these, **232 cross-article records** project to **213 article pair/type groups**
across **260 participating articles**; **68 relationships are within one article**.
Check these against actual exported/projected data. Do not require 300 article
map lines or claim that all 7,421 articles have claims or connections.

Use the normal review confirmation and publish action only after the review is
actually complete and the current authorization permits it. Do not assert a human
review that did not occur. If a required human judgment remains, present the exact
reviewed release and remaining decision; do all technical preparation first.
Do not bypass the checksum, reviewed flag or expected-revision checks with SQL or
an internal script. Fetch the current revision immediately before activation.
On 409, refresh/review; on timeout, check status/history before any repeat write.

## 7. Verify live results and document rollback

Success requires both deployed code and the target dataset to be active:

- Health ready; lightweight published capabilities intact; login still works.
- Active status identifies the target run, expected fingerprint and 7,421 / 5,157 /
  300 counts. A revision increment alone is insufficient.
- Both graph responses identify the active run, typed relationships, known
  totals, bounds and truncation. Edge-aware sampling includes connected endpoints.
- The public graph shows actual links, useful neighbor details and honest scope;
  no artificial disk is used for absent relationships.
- Article/claim modes, outlet/type/score filters, search, zoom/reset, node
  selection, keyboard alternative, graph export and drill-down/back work.
- A claim selected from the map opens its owning article with selection preserved.
- Mobile at 390 × 844 has usable controls and no document-wide horizontal overflow.
- An ordinary visitor can read published data without developer upload controls.
  Verify authorization denials using an existing suitable account/session; do not
  create users simply for this test or claim it was tested if unavailable.
- Check console errors and worker/network failures. Separate real-data evidence
  from synthetic fixtures and do not claim scientific accuracy from UI tests.

Save screenshots and logs under an ignored output directory. Write
`docs/validation/ANTIGRAVITY_LIVE_GRAPH_RELEASE_2026-10-20.md` with exact commits,
checks, timing observations, active release/revision, remaining limits and rollback
instructions. Code rollback means the recorded prior frontend/backend commits;
data rollback means reviewing and republishing the retained prior release using
the current revision. Never delete prior releases or silently roll back newer
work. Finish the coordination status and give a candid deployed-versus-pending
handback. Stop only at completion or a concrete external blocker.
