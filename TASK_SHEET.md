# GMEE master development task sheet

Updated: **2026-10-15 (Asia/Calcutta)**. Baseline: **`19802e1`**.

This is the working checklist for the next development phase. Update it as work
is verified; a design, implemented function, passing unit test, and validated
release are different milestones.

## 1. Project target and working rules

- Team: two researchers; the coding assistant implements and verifies authorized engineering work.
- Budget: prefer free services; local operation on the owner's PC is acceptable.
- Delivery target: a stable, reproducible two-user research pilot, followed by a defensible research package.
- Original planning window: October 14-27, 2026. Keep this as a target; do not declare unfinished gates complete to meet it.
- Current architecture: FastAPI, React, PostgreSQL/pgvector, Redis, optional Neo4j. Keep the modular monolith.
- Target execution model: short API requests submit durable PostgreSQL jobs; a bounded worker executes them. Redis remains the rate-limit/revocation store, not the durable queue.
- PostgreSQL is authoritative; Neo4j is a rebuildable projection.
- Preserve the current article corpus, annotations, credentials, and migration history. Use disposable fixtures for tests.
- Keep existing quality thresholds. Add tests for meaningful failure/concurrency cases, not for cosmetic changes alone.
- Organize touched modules gradually. Do not move the entire repository or generate empty directories.
- Public hosting and publication acceptance are separate outcomes. Neither is established by green CI.

## 2. Status and ownership

| Status | Meaning |
|---|---|
| DONE | The stated scope is implemented and supporting evidence is recorded. |
| PARTIAL | Useful implementation exists, but the stated acceptance condition is incomplete. |
| OPEN | Work remains; no completion claim. |
| READY | Open task selected for the next implementation batch; dependencies permit starting it. |
| IN PROGRESS | Someone is actively working on the task; include owner and branch/commit. |
| BLOCKED | A concrete dependency or decision prevents progress; record what is needed. |
| DEFERRED | Deliberately outside the current pilot. |

Suggested owners: **ENG** = coding assistant with author review; **A** = backend/operations author;
**B** = frontend/research author; **A+B** = both authors. These are proposed responsibilities,
not an assumption that either person has accepted a named assignment. Human judgments
and manuscript decisions remain with the authors.

Priorities: **P0** blocks trustworthy pilot operation or valid experiments;
**P1** required for the corresponding release gate; **P2** useful polish after blockers.

## 3. Evidence already available

These results were verified on October 14. They are a historical baseline, not
a new October 15 full test run. Re-run affected checks after implementation changes.

| Evidence | Scope and result | Reference |
|---|---|---|
| E01 | Backend lint/type checks; 476 non-integration tests; 8 PostgreSQL integration tests with zero integration skips; 81.63% coverage | [Backend CI at `7d45920`](https://github.com/pavanputhra17/GMEE/actions/runs/38560153650) |
| E02 | Frontend lint/build/tests/coverage; local run: 114 tests, 94.81% line coverage | [Frontend CI at `19802e1`](https://github.com/pavanputhra17/GMEE/actions/runs/38565506250) |
| E03 | Static deployment checks, PowerShell checks, built-image HTTP smoke | [Deployment CI at `19802e1`](https://github.com/pavanputhra17/GMEE/actions/runs/38565506184) |
| E04 | Concurrent refresh rotation and inactive-login fixes | Commit `548b77f`, validated by E01 |
| E05 | Required Redis/optional Neo4j readiness behavior and safe public probe errors | Commit `7d45920`, validated by E01/E03 |
| E06 | Dedicated sign-in, guided dashboard, full-width advanced UI, consistent theme, explanations for all 10 advanced tabs | Commit `19802e1`, E02; local desktop/mobile visual checks |
| E07 | Existing local corpus previously read as 7,421 articles and 5,157 claims | Read-only local database query; counts can change and are not a frozen dataset |

The browser layout preview used a temporary browser-only test identity; it was
not an end-to-end account/password verification. API auth tests and browser
acceptance must be reported separately. Local services were stopped at the last
October 15 check. An installed stack is not evidence of continuous availability.

## 4. Completed work ledger

| ID | Status | Completed scope | Evidence |
|---|---|---|---|
| C01 | DONE | Remove unconditional static/random API interception from live frontend requests | `449a315`, E02 |
| C02 | DONE | Fail-closed migration startup; remove automatic corpus import/graph rebuild from startup | `449a315`, E03 |
| C03 | DONE | Include SQLAlchemy async runtime requirement and read-only PowerShell sweep wrapper | `da88789`, E03 |
| C04 | DONE | Fix corpus stats/search to use claim embeddings rather than nonexistent article embeddings | `6fd9847`, E01/E03 |
| C05 | DONE | Clear backend lint/type errors and CI-specific SQLAlchemy result typing | `6fd9847`, `4ea9325`, E01 |
| C06 | DONE | Include the spaCy model required by the test environment | `ac63ffc`, E01 |
| C07 | DONE | Make database regression tests create their own data instead of relying on a populated corpus | `6fd9847`, E01 |
| C08 | DONE | Serialize refresh rotation and preserve reuse detection on PostgreSQL | E04/E01 |
| C09 | DONE | Reject inactive users during login and refresh | E04/E01 |
| C10 | DONE | Report missing Redis as unavailable and absent optional Neo4j as disabled | E05 |
| C11 | DONE | Dedicated sign-in/registration page and signed-in UI boundary | E06/E02 |
| C12 | DONE | Beginner dashboard with real totals, article search, source links, and clear actions | E06/E02 |
| C13 | DONE | Full-width advanced dashboard and shared theme styling | E06 |
| C14 | DONE | Explain purpose, usage, and interpretation of all 10 advanced tabs | E06 |
| C15 | DONE | Push the above engineering/UI changes to origin/main | `19802e1`, E01-E03 |

Completion here is limited to the stated scope. Auth concurrency testing does
not close all security review; a local visual check does not close browser E2E;
a smoke-tested image does not close restore, capacity, or research gates.

## 5. Execution order and next batch

Follow **baseline -> lifecycle design -> durable queue -> safe worker -> API/UI ->
models -> recovery/browser validation -> release**. Research question and annotation
preparation can proceed alongside engineering. Do not run final experiments on a moving algorithm.

**Next batch: Q01-Q04.** First save a redacted baseline, define the job lifecycle,
and specify compatibility before implementing a migration. Then implement a
minimal bounded queue slice and verify it against real PostgreSQL.

| Order | Batch | Exit condition | Existing plan |
|---|---|---|---|
| 1 | Q01-Q04: baseline and job design | Current constraints and transition/compatibility rules recorded | B01, B06 |
| 2 | Q05-Q12: durable submit/claim/worker | One submitted job executes outside the request and survives browser disconnect | B06 |
| 3 | W01-W10: heartbeat, fencing, recovery | Slow/crashed/stale workers cannot corrupt a newer run | B07 |
| 4 | A01-A10 and U01-U10: API and UI | Two authorized users can submit, inspect, and recover work safely | B08-B09, B12 |
| 5 | M01-M10: model reliability | Prepared models and explicit capability/failure behavior | B05 |
| 6 | O01-O10 and V01-V10: operational/browser validation | Startup, migration, restore, browser journeys, and capacity evidence | B10-B12 |
| Parallel | R01-R10: research definition and annotation | Independent judgments and frozen data/splits | Original R01-R03 |
| After freeze | X01-X10: experiments/manuscript | Reproducible measurements supporting each paper claim | Original R04-R05 |
| Final | L01-L10: release/handoff | Relevant pilot or paper gates satisfied | REL01 |

### Batch size and update procedure

1. Select a small task set, record its owner/status, and review its acceptance cases.
2. Inspect existing code before adding another implementation of the same behavior.
3. Keep schema changes additive and rehearse them on isolated data.
4. Implement, run affected checks, inspect the diff, and fix failures.
5. Record command, fixture, environment, result, and commit under the work log.
6. Push when the scoped work is ready; wait for relevant CI before marking it DONE.
7. Review acceptance with the authors where human decisions are needed, then select the next batch.

Do not infer user approval from elapsed time. Already authorized routine engineering
can continue. Live data replacement, destructive recovery, paid services, and paper
submission require the appropriate explicit user direction.

## 6. Durable queue and worker tasks

Primary areas: `backend/app/models/pipeline.py`, `services/pipeline/`, API trigger
routes, scheduler, Alembic, Docker/Compose. Existing durable running-job records
are useful, but are not yet a durable queued-worker system.

| ID | Priority | Status | Owner | Task and acceptance condition | Depends on |
|---|---|---|---|---|---|
| Q01 | P0 | READY | ENG+A | Record current job schema, callers, commits inside orchestrators, deployment commands, and fixture availability; inventory confirms every execution entrypoint | None |
| Q02 | P0 | OPEN | ENG+A | Specify queued/running/terminal states, allowed transitions, attempt semantics, lease ownership, cancellation, and failure contracts | Q01 |
| Q03 | P0 | OPEN | ENG+A | Define idempotency scope and payload fingerprint; same-key/same-payload returns same job, conflicting payload returns a documented conflict | Q02 |
| Q04 | P0 | OPEN | ENG+A | Define backward compatibility for current trigger/status clients and historical job rows; choose bounded execution limits | Q02-Q03 |
| Q05 | P0 | PARTIAL | ENG | Add additive queue schema/migration; preserve existing job summaries and statuses; fresh and upgraded fixtures migrate correctly | Q04 |
| Q06 | P0 | OPEN | ENG | Implement transactional submission; unauthorized or invalid requests create no job; committed submission survives client disconnect | Q05 |
| Q07 | P0 | OPEN | ENG | Implement atomic claim with PostgreSQL locking and stable ordering; concurrent claimers never own the same attempt | Q05 |
| Q08 | P0 | OPEN | ENG | Add bounded worker entrypoint with explicit start/stop; one worker completes a fixture job without an HTTP request staying open | Q06-Q07 |
| Q09 | P0 | OPEN | ENG | Reuse existing orchestrators through a shared execution dispatcher; no duplicated business rules between CLI/API/worker | Q08 |
| Q10 | P0 | OPEN | ENG | Change scheduler to enqueue only; repeated ticks obey deduplication and configured limits | Q03, Q08 |
| Q11 | P0 | OPEN | ENG | Convert manual pipeline triggers to the agreed job response; preserve documented compatibility or clearly version the change | Q04, Q08 |
| Q12 | P0 | OPEN | ENG+A | Exercise two-worker submit/claim/complete with real PostgreSQL; record results and current limits | Q09-Q11 |

Q05 is PARTIAL because durable records/one-running-job constraints already exist;
queued states, payload identity, and worker lifecycle still need design and verification.

## 7. Heartbeat, ownership, retry, and recovery

Primary areas: `services/pipeline/jobs.py`, `ownership.py`, preprocessing/NLP/
evolution orchestrators. Existing owner tokens and fencing helpers must be reused
and checked at all persistence boundaries.

| ID | Priority | Status | Owner | Task and acceptance condition | Depends on |
|---|---|---|---|---|---|
| W01 | P0 | PARTIAL | ENG | Renew job leases independently of article processing; a slow job remains owned through more than one lease interval | Q08 |
| W02 | P0 | PARTIAL | ENG | Independently renew article claims where needed; batch duration must not silently expire remaining rows | W01 |
| W03 | P0 | OPEN | ENG | Stop scheduling new work on heartbeat failure/lost ownership; disclose uncertain in-flight external calls | W01-W02 |
| W04 | P0 | PARTIAL | ENG | Audit and fence actual outputs, not only job status; stale workers cannot commit claims, relationships, or summaries after recovery | W03 |
| W05 | P0 | OPEN | ENG | Make job, article-state, and output transaction boundaries consistent; rollback does not leave orphan results or false success | W04 |
| W06 | P0 | PARTIAL | ENG | Recover expired work with bounded attempts and a defined backoff; distinguish retryable provider faults from permanent validation failures | W05 |
| W07 | P0 | OPEN | ENG | Implement cooperative cancellation; queued cancellation never executes, running cancellation stops at safe checkpoints | Q02, W05 |
| W08 | P0 | OPEN | ENG | Implement graceful worker shutdown and process-death recovery; no new claims after shutdown begins | W06-W07 |
| W09 | P0 | OPEN | ENG | Persist provenance for attempts, failure reasons, timings, and outputs without credentials or full sensitive text in logs | W05-W08 |
| W10 | P0 | OPEN | ENG+A | Run isolated slow-job, killed-worker, double-worker, lease-loss, retry-cap, and stale-write tests; all ownership assertions pass | W01-W09 |

## 8. API, security, capabilities, and observability

| ID | Priority | Status | Owner | Task and acceptance condition | Depends on |
|---|---|---|---|---|---|
| A01 | P0 | OPEN | ENG | Publish typed job submit/detail/list/cancel schemas and consistent error codes | Q02, Q11 |
| A02 | P0 | OPEN | ENG | Restrict submission, inspection, cancellation, retry, and recovery by user/role; test cross-user and non-admin denial | A01 |
| A03 | P0 | OPEN | ENG | Define and verify Redis-outage policy for login, refresh/logout, blocklist checks, and limits; no silent bypass | C08-C10 |
| A04 | P0 | PARTIAL | ENG | Expose model/provider/graph capabilities separately from store readiness; missing models give actionable unavailable states | M01-M04 |
| A05 | P1 | PARTIAL | ENG | Mount intended operations/metrics endpoints with role/secret protection; no accidental public recovery or metrics exposure | A02 |
| A06 | P1 | OPEN | ENG | Add request/job correlation IDs, safe exception translation, and bounded error details; confirm secrets do not enter public errors | A01 |
| A07 | P1 | OPEN | ENG+A | Review least-privilege database and researcher roles; document operator provisioning without public default admin credentials | A02 |
| A08 | P1 | OPEN | ENG | Review token/session lifetime, concurrent refresh, logout failure, inactive-user and account-switch behavior across API/UI | C08-C11, A03 |
| A09 | P1 | OPEN | ENG | Generate OpenAPI deterministically and verify frontend response contracts against it | A01, A04 |
| A10 | P1 | OPEN | ENG+A | Run abuse/failure fixtures for request size, candidate bounds, timeouts, pagination, and rate limits | A02-A09 |

## 9. User workflows and frontend integration

Primary areas: `frontend/src/pages/`, `components/`, `api/`, and `lib/`.
The guided interface is implemented; these tasks complete behavior and release acceptance.

| ID | Priority | Status | Owner | Task and acceptance condition | Depends on |
|---|---|---|---|---|---|
| U01 | P0 | OPEN | ENG+B | Add typed job submission client and stable job IDs; no UI-invented completion status | A01 |
| U02 | P0 | OPEN | ENG+B | Poll job progress with timeout/abort and visibility controls; transport failure remains distinct from job failure | U01 |
| U03 | P0 | OPEN | ENG+B | Show reconnect/revisit behavior and prevent duplicate submissions; respect current memory-only authentication | U02, Q03 |
| U04 | P0 | OPEN | ENG+B | Add authorized cancel/retry controls with safe pending/error states | A02, W06-W07, U02 |
| U05 | P1 | PARTIAL | ENG+B | Audit wording in beginner/advanced views against actual behavior; remove unsupported live, causal, queue, and truth claims | A04 |
| U06 | P1 | OPEN | ENG+B | Show capability-specific unavailability and a recovery action for model/provider/graph problems | A04 |
| U07 | P1 | OPEN | ENG+B | Verify empty, stale, partial, loading, validation-error, and unauthorized states across main journeys | U01-U06 |
| U08 | P1 | OPEN | ENG+B | Verify keyboard operation, labels, focus, reduced motion, contrast, and mobile overflow | U07 |
| U09 | P1 | OPEN | ENG+B | Reconcile beginner/advanced navigation, unknown routes, session expiry, sign-out, and return paths | U07 |
| U10 | P1 | OPEN | A+B | Both authors complete a small usability walkthrough; record confusing labels and corrective changes | U08-U09 |

## 10. Model preparation and inference safety

Primary areas: `services/nlp/`, verdict/evidence models, clustering, settings,
model preparation scripts, and model/experiment manifests.

| ID | Priority | Status | Owner | Task and acceptance condition | Depends on |
|---|---|---|---|---|---|
| M01 | P0 | OPEN | ENG+A | Inventory every model/provider, language, dimension, revision, cache path, license, and stage using it | Q01 |
| M02 | P0 | OPEN | ENG | Add explicit preparation/check command; missing/corrupt files fail clearly and preparation is repeatable | M01 |
| M03 | P0 | OPEN | ENG | Pin model revisions and record embedding-space identity; reject mixed spaces even when dimensions match | M01-M02 |
| M04 | P0 | OPEN | ENG | Validate vectors for dimension, finite numbers, shape, and intended normalization before storage/search | M03 |
| M05 | P0 | OPEN | ENG+A | Define local/provider fallback policy; provider failure must not unexpectedly load an oversized local model | M02 |
| M06 | P0 | OPEN | ENG | Bound model concurrency and provider timeouts/retries; keep blocking loads/inference off the API event loop | Q08, M05 |
| M07 | P1 | OPEN | ENG+A | Measure cold/warm startup, peak memory, stage latency, and artifact size on declared target hardware | M02-M06 |
| M08 | P1 | PARTIAL | ENG | Report unsupported local summaries/external checking as capability states, not completed analysis | M05, A04 |
| M09 | P1 | OPEN | ENG | Verify missing model, provider outage, malformed response, truncation, and oversize-input fixtures | M04-M08 |
| M10 | P0 | OPEN | A+B | Choose feasible hardware/model profile from measurements; re-embedding is explicit if the model changes | M07-M09 |

## 11. Operations, deployment, backup, and capacity

| ID | Priority | Status | Owner | Task and acceptance condition | Depends on |
|---|---|---|---|---|---|
| O01 | P0 | PARTIAL | ENG+A | Document one repeatable Windows/local startup and shutdown path with correct host URLs and separate fixture ports | C10, Q08 |
| O02 | P0 | OPEN | ENG | Add worker process/service and declared shared model cache to runtime profiles; scheduler remains enqueue-only | Q10, M02 |
| O03 | P0 | OPEN | ENG+A | Rehearse additive migrations on a restored snapshot; preserve historical labels, relationships, and job records | Q05, O05 |
| O04 | P0 | PARTIAL | ENG+A | Reconcile migration ownership, startup, readiness, proxy/TLS trust, and environment examples for the chosen target | O02-O03 |
| O05 | P0 | PARTIAL | ENG+A | Create a protected PostgreSQL backup with manifest/checksum; verify output handling and no accidental overwrite | None |
| O06 | P0 | OPEN | A+B | Encrypt/store backup off-host and restore to a separately named database; record retention and key recovery arrangements | O05 |
| O07 | P0 | OPEN | ENG+A | Verify restored article/claim/annotation/job/relationship counts and constraints; compare expected hashes where appropriate | O06 |
| O08 | P1 | OPEN | ENG+A | Rebuild Neo4j from authoritative data and define Redis restart security-state policy; projection lag is visible | O07, A03 |
| O09 | P1 | OPEN | ENG+A | Measure two-user reads/submissions while one job runs; record p50/p95, errors, concurrency, memory, cold/warm state | W10, M10 |
| O10 | P1 | OPEN | ENG+A | Verify actual Render URLs, deployed commit, service connections, startup, persistence, and capacity if cloud deployment is pursued | O04, O09 |

O10 may be deferred for a local pilot; it is required before claiming a validated
Render deployment. A blueprint and a configured URL are insufficient evidence.
Recovery objectives are provisional until restore timing and integrity are measured.

## 12. Validation, contracts, and repository structure

| ID | Priority | Status | Owner | Task and acceptance condition | Depends on |
|---|---|---|---|---|---|
| V01 | P0 | OPEN | ENG | Maintain disposable fixture data/accounts with no real credentials or live-corpus mutation | None |
| V02 | P0 | OPEN | ENG | Add real-browser sign-up/sign-in/refresh-expiry/sign-out coverage; distinguish this from API-only auth tests | V01 |
| V03 | P1 | OPEN | ENG | Browser-test article search, original links, compare, and evidence availability/error states | V02, U07 |
| V04 | P0 | OPEN | ENG | Browser-test submit -> disconnect/reconnect -> job result -> authorized cancel/retry | W10, U04, V02 |
| V05 | P1 | OPEN | ENG | Browser-test researcher annotation and denied admin-only actions on fixture data | A02, V02 |
| V06 | P1 | OPEN | ENG | Run bounded browser smoke in CI with meaningful failure artifacts and fixture teardown | V03-V05 |
| V07 | P1 | OPEN | ENG+A | Resolve and lock runtime/test dependencies using one supported method; verify Windows/Linux and direct research imports | M01 |
| V08 | P1 | OPEN | ENG+A | Review dependency/image/model inventory and actionable security findings; record versions/digests | V07 |
| V09 | P2 | OPEN | ENG | Move only touched modules toward feature boundaries from PROJECT_STRUCTURE; preserve imports/CLI/API contracts | Relevant feature gates |
| V10 | P1 | OPEN | ENG+A | Reconcile README, operations, architecture, OpenAPI, guides, and known limitations with implemented behavior | A09, O04, V06 |

Avoid restructuring the entire test tree merely to match the proposed diagram.
When a move is useful, keep it separate from behavior changes and verify its callers.

## 13. Research question, annotation, and frozen dataset

These are author-led tasks. Existing tooling can support them, but synthetic
labels, engine outputs, and authenticated identities are not independent human gold.

| ID | Priority | Status | Owner | Task and acceptance condition | Depends on |
|---|---|---|---|---|---|
| R01 | P0 | OPEN | A+B | Select the primary task: typed claim changes, relatedness, or evidence; state the contribution and exclusions precisely | None |
| R02 | P0 | OPEN | B | Build a current primary-source related-work matrix and identify comparable datasets/baselines; novelty remains a hypothesis | R01 |
| R03 | P0 | PARTIAL | A+B | Freeze annotation rubric with positive/negative/ambiguous examples and policy for correction, dates, numbers, negation, and quotations | R01 |
| R04 | P0 | OPEN | A+B | Independently label a small blinded pilot without engine predictions or each other's votes; preserve original votes | R03 |
| R05 | P0 | OPEN | A+B | Measure per-label agreement, disagreements, minutes per item, and adjudication effort; revise rubric before final labeling | R04 |
| R06 | P0 | OPEN | A+B | Set feasible annotation volume from remaining person-hours and measured effort; include event diversity and limitations | R05 |
| R07 | P0 | PARTIAL | ENG+B | Audit data/label provenance, source rights, retention, and permitted release content; separate human/automatic/legacy/test origins | R06 |
| R08 | P0 | PARTIAL | ENG+B | Create frozen event/duplicate/component-disjoint train/dev/test splits; automated overlap assertions pass | R07 |
| R09 | P0 | OPEN | A+B | Complete independent final labels/adjudication; preserve unresolved cases and disclose author involvement | R06-R08 |
| R10 | P0 | OPEN | ENG+A+B | Freeze dataset manifest, text/label/split hashes, rubric version, eligibility rules, and access instructions | R09 |

## 14. Experiments, analysis, and paper

| ID | Priority | Status | Owner | Task and acceptance condition | Depends on |
|---|---|---|---|---|---|
| X01 | P0 | OPEN | A+B | Freeze hypotheses, metrics, baseline/ablation list, thresholds policy, exclusions, and primary comparisons before test use | R10, M10 |
| X02 | P0 | PARTIAL | ENG+A | Configure reproducible lexical/vector baselines and proposed method using existing harness; verify task compatibility | X01 |
| X03 | P0 | OPEN | ENG+A | Run baseline/full-method predictions; preserve raw scores, failures, support, runtime, hardware, seeds, and revisions | X02 |
| X04 | P1 | OPEN | ENG+A+B | Run justified ablations, including removal of proposed signals; do not optimize variants on held-out test | X03 |
| X05 | P0 | OPEN | ENG+B | Evaluate retrieval separately from downstream relation/type/stance errors; report class and mutation-type support | X03 |
| X06 | P0 | OPEN | ENG+A+B | Report event-aware uncertainty/paired comparisons where supported and calibration only for its defined target | X03-X05 |
| X07 | P1 | OPEN | A+B | Analyze representative errors, ambiguous updates, duplicates, source dependence, and temporal/generalization limits | X05-X06 |
| X08 | P0 | OPEN | ENG+B | Generate tables/figures from immutable artifacts; every manuscript number traces to a named run | X06-X07 |
| X09 | P0 | OPEN | A+B | Draft task/methods/data/results/ethics/limitations/reproducibility sections; remove unsupported truth/causal/production claims | R02, X08 |
| X10 | P0 | OPEN | A+B | Select venue and check scope, formatting, anonymization, licenses, data policy, and actual submission requirements | X09 |

No target score is a release requirement. Negative or inconclusive results must
remain visible. If labels/event counts or time are inadequate, produce a pilot
report and further-study plan instead of calling the paper publication-ready.

## 15. Pilot release and handoff

| ID | Priority | Status | Owner | Task and acceptance condition | Depends on |
|---|---|---|---|---|---|
| L01 | P0 | OPEN | ENG+A | Create release manifest with code SHA, environment/lock hash, model revisions, schema version, and artifact references | V07, M10 |
| L02 | P0 | OPEN | A+B | Have the teammate start a clean isolated environment from instructions without local developer state | O01-O04, V10 |
| L03 | P0 | OPEN | A+B | Have the teammate reproduce one frozen experiment and compare declared outputs/tolerances | R10, X08, L01 |
| L04 | P0 | OPEN | ENG+A+B | Run relevant final lint/type/unit/integration/browser/image checks on the intended release commit | W10, V06, L01 |
| L05 | P0 | OPEN | A+B | Review restored-backup evidence and application rollback compatibility; record measured recovery time | O07-O08 |
| L06 | P1 | OPEN | A+B | Review two-user usability, roles, known limitations, provider costs, and target hardware | U10, O09 |
| L07 | P0 | OPEN | ENG+A+B | Close required pilot blockers or explicitly disable/defer unsupported features; no hidden failed gates | L02, L04-L06 |
| L08 | P1 | OPEN | ENG | Prepare changelog/release notes and links to verified results; push/tag only the agreed release | L07 |
| L09 | P0 | OPEN | A+B | Independently review manuscript claims against artifacts and reproduction evidence | L03, X09-X10 |
| L10 | P0 | OPEN | A+B | User-directed final publication submission/release; retain submitted source and artifact versions | L09 |

Pilot release may precede manuscript submission. A public production launch
requires the target-host operational/security gates in addition to the pilot gates.

## 16. Milestone acceptance checklists

### G1: reliable processing

- [ ] API submission is short and durable, and retries do not duplicate accepted work.
- [ ] Competing workers cannot claim the same attempt.
- [ ] Independent heartbeats survive slow inference and renew article ownership.
- [ ] Lost/stale owners cannot persist outputs; recovery is bounded and audited.
- [ ] Cancellation, retry, shutdown, and process-death cases pass on PostgreSQL.

### G2: usable two-person pilot

- [ ] Roles and Redis failure policies are verified.
- [ ] Models are prepared/versioned; missing capabilities are clearly reported.
- [ ] Both authors complete the real browser workflow, including job failure/recovery.
- [ ] Current relevant CI passes without lowering gates.
- [ ] A backup restores correctly and a teammate reproduces local startup.
- [ ] Measured target-hardware capacity supports the declared two-user workload.

### G3: reproducible paper package

- [ ] Task, rubric, independent votes, adjudication, rights, and frozen splits are reviewed.
- [ ] Baselines, method, ablations, uncertainty, and failures are recorded fairly.
- [ ] Tables/figures trace to immutable runs; no test-selected threshold claims.
- [ ] Teammate reproduction passes, and limitations match the evidence.
- [ ] Venue requirements and final manuscript receive author review.

## 17. Suggested remaining time allocation

These are planning blocks, not guaranteed completion dates or task-level time promises.
Use Day 1 as the next focused workday; compare progress with the original Oct 27 target.

| Block | Engineering focus | Parallel author work | Decision point |
|---|---|---|---|
| Days 1-2 | Q01-Q08: design and minimal queue/worker | R01-R04: task/rubric and pilot | Can a bounded job run outside HTTP? |
| Days 3-4 | Q09-Q12, W01-W10: concurrency/recovery | R05-R06: agreement and effort | Does crash/lease recovery work? |
| Days 5-6 | A/U/M: contracts, UI, capabilities, models | R07-R09: feasible labeling/splits | Freeze scope; reduce unsupported features |
| Days 7-8 | O/V: restore/browser/capacity/locking | R10, X01-X02: freeze experiment inputs | Is a defensible evaluation feasible? |
| Days 9-10 | L01-L04 and frozen experiment support | X03-X09: results, analysis, draft | Pilot report or submission candidate? |
| Remaining buffer | Repair blockers and independent reproduction | Venue/claims review and handoff | No release/submission with required gates open |

If this schedule is infeasible, defer cloud hosting and cosmetic restructuring
first. Do not cut concurrency/recovery evidence or fabricate scientific validation.
Human annotation is a scheduled shared workload, not spare-time cleanup.

## 18. Checks and evidence recording

Run from the named folder; these commands are examples of existing entrypoints.
Real integration and browser checks require a separately named disposable stack.
Never point fixture setup, teardown, migration rehearsals, or restore tests at the live corpus.

```powershell
# From backend (Windows; use the equivalent venv path on Linux)
& .venv/Scripts/python.exe -m ruff check app tests scripts
& .venv/Scripts/python.exe -m mypy app tests scripts
& .venv/Scripts/python.exe -m pytest --strict-markers --cov=app --cov-fail-under=70 -m 'not integration'

# Against a configured disposable PostgreSQL fixture only
& .venv/Scripts/python.exe -m pytest tests/integration -m integration -o addopts='' --strict-markers --junitxml=integration-results.xml
& .venv/Scripts/python.exe ../infra/scripts/require_integration_results.py integration-results.xml

# From frontend
npm run lint
npm run build
npx vitest run --coverage --coverage.thresholds.lines=60 --coverage.thresholds.functions=60 --coverage.thresholds.branches=50 --coverage.thresholds.statements=60

# From repository root: static validation only
& backend/.venv/Scripts/python.exe infra/scripts/validate_deployment.py
```

Record each completed batch using this template:

```text
Date / task IDs:
Owner / source commit / environment:
What changed:
Fixture and data/model versions:
Commands and observed results:
CI links:
Remaining limitations / follow-up IDs:
Review and resulting status:
```

Do not add passwords, tokens, full private articles, or raw sensitive backups to
the task sheet or Git. Keep larger evidence in an approved artifact location;
link a redacted manifest under `docs/releases/` when that file is actually created.

## 19. Work log

| Date | Batch | Result | Next action |
|---|---|---|---|
| 2026-10-15 | Task-sheet preparation | Reconciled completed work against `19802e1`, prior verified CI, and existing plans. No application or database changes made in this planning step. | Start Q01, then Q02-Q04; authors start R01/R03 alongside engineering |
| 2026-10-15 | Article investigation experience | Implemented nine-section article detail pages, bounded scoped claims/relationships, internal detail links, selected-claim prefill, safe sign-in return and retained all advanced tools. Verified real PostgreSQL data, all nine sections, mobile widths and search return. | See [validation](docs/validation/TOPIC_DETAIL_VALIDATION_2026-10-15.md). Local changes; deployment, stable topic identities and data-quality work remain separate. |
| 2026-10-15 | Deep local 500-article validation | Real CPU run completed 500/500 preprocessing and NLP in 348.47s, producing 1,536 claims; separate 21.445s evolution produced 77 clusters and 71 links. Restricted UI, upload replay, mobile layout and 20 real API denial/error checks verified. 510 backend + 8 PostgreSQL integration + 125 frontend tests passed. | Follow prioritized findings in [validation report](docs/validation/LOCAL_500_ARTICLE_REPORT_2026-10-15.md): text coverage, claim quality, GPU profile, durable workers and release activation remain open. Operational completion is not scientific accuracy. |
| 2026-10-15 | Developer console, local implementation | Added email/admin-gated console, source switches, confirmed pipeline controls, status/job review and publication staging links. Direct trigger endpoints enforce the same developer gate and execution profile. 510 backend tests and 120 frontend tests passed; local browser verified against isolated database gmee_upload_local_20261015. | Export/public activation, durable workers and release deployment remain open; see docs/DEVELOPER_CONSOLE.md. Changes are local. |
| 2026-10-15 | Local-backend hosting repair | Added schema/readiness preflight, host-port resolution, explicit model preparation/cache-only embedding startup, and demo-tunnel helpers. Backed up/restored/rehearsed then upgraded the local schema to gmee03; preserved checked corpus/account fields. 485 regression tests and 8 isolated PostgreSQL integration tests passed. HTTPS readiness/dashboard/semantic search and CORS verified. | Connect the existing frontend using its owning Render account; a stable named tunnel/domain remains separate. See HYBRID_HOSTING runbook. Changes are local, not yet pushed. |
| 2026-10-15 | New Render frontend | Created global-mass.onrender.com from theputhra-hue/global-mass (initial build afb62fd); set API base and security headers; allowed its exact origin in the PC backend. Verified live HTML, backend readiness, preflight, and browser invalid-login response. Previous frontend preserved. | PC/tunnel must remain running; temporary hostname must be updated after tunnel restart. Complete real-user sign-in acceptance and stable-domain setup separately. |

## 20. Deferred scope and related documents

Deferred for this pilot: Kubernetes, microservices split, autoscaling, multi-region
HA, multi-tenant billing, multilingual expansion, new collectors, new arcade
features, and a repository-wide directory rewrite.

This sheet is the current progress ledger. Earlier plans retain their design
context; their original all-open checklists do not override the evidence here.

- [Production plan and delivery constraints](docs/PRODUCTION_PLAN.md)
- [Companion plan: local AI and cloud published results](docs/DATA_PUBLISHING_PLAN.md) — proposed deployment track; P01-P06 remain open.
- [Target project structure and module contracts](docs/PROJECT_STRUCTURE.md)
- [Original implementation backlog and safety/test matrix](docs/IMPLEMENTATION_BACKLOG.md)
- [Research protocol and results ledger](docs/RESEARCH.md)
- [Operations runbook](docs/OPERATIONS.md)
- [Limitations](docs/LIMITATIONS.md)
- [Historical publication plan](PUBLICATION_PLAN.md)

When new evidence contradicts a DONE task, reopen it with the reason and affected
commit. Do not erase prior results or silently replace experimental artifacts.
