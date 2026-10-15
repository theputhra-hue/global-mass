# GMEE implementation backlog and release gates

Progress tracking update (2026-10-15): use the [master task sheet](../TASK_SHEET.md)
for reconciled statuses, completed work, and the next implementation batch.
The proposed/open statuses below describe the original planning baseline.

Status: all tasks proposed/open, 2026-10-14. Budget and sequence:
[production plan](PRODUCTION_PLAN.md). Folder contracts:
[project structure](PROJECT_STRUCTURE.md).

Evidence must identify the tested commit, command, environment, fixture/data
version and outcome. Do not publish credentials or complete private datasets
in logs. The planning documents themselves do not satisfy implementation gates.

## 1. Ordered work packages

| ID | Priority / suggested owner | Work and affected area | Depends on | Acceptance evidence |
|---|---|---|---|---|
| B01 | P0 / A+B | Record clean baseline, reproduce quality gates, inventory hardware and artifact sizes | None | Redacted baseline report; feasible model run on target hardware |
| B02 | P0 / B | Remove unconditional static/random API responses; explicit deterministic demo mode | B01 | Contract tests show real endpoint and parameters; fixture data never used in live mode |
| B03 | P0 / A | Fix current lint failures and run full existing suites in isolation | B01 | Actual current lint/type/test results; missing dependencies reported explicitly |
| B04 | P0 / A | Make refresh rotation atomic; review inactive users and revocation behavior | B03 | Real PostgreSQL concurrent rotation and reuse tests; unauthorized results rejected |
| B05 | P0 / A | Explicit model preparation, immutable model metadata and cold-start policy | B01 | Prepared model works after restart; missing model yields actionable capability error |
| B06 | P0 / A | Add durable queued jobs and bounded worker; new migration | B03, B05 | Atomic claim, idempotent submit, output provenance, one-worker completion |
| B07 | P0 / A | Independent heartbeats, output fencing, crash recovery and bounded retries | B06 | Slow job outlives lease interval safely; killed worker recovers; stale write rejected |
| B08 | P0 / B | Job submission/polling/cancel UI; stable typed response contracts | B02, B06 | Browser disconnect/reconnect sees same job; no duplicate submission on refresh |
| B09 | P0 / A | Mount authorized operations and request context; consistent readiness/capabilities | B06 | Regular user cannot recover/inspect others' jobs; missing stores handled safely |
| B10 | P0 / A | Reconcile entrypoints, fail-closed migration, environment and network profiles | B03, B06 | Built-image fixture starts cleanly; migration failure prevents serving |
| B11 | P0 / A+B | Isolated migration and backup/restore rehearsal | B10 | Fresh and upgraded fixture schema checks; restored annotations/counts verified |
| B12 | P1 / B | Contract generation and browser coverage of core journeys | B08, B09 | Deterministic OpenAPI drift check; real-browser positive/error paths |
| B13 | P1 / A+B | Move touched code to feature boundaries incrementally | Corresponding green feature gates | Import/caller inventory, unchanged contracts and reviewable move-only diff |
| R01 | P0 / B | Narrow research question; related-work matrix; frozen pilot rubric | B01 | Written task, novelty hypothesis, controls, labels and annotation instructions |
| R02 | P0 / A+B | Independently annotate pilot; measure agreement and effort | R01 | Original blinded votes, disagreements and adjudication record |
| R03 | P0 / B | Freeze feasible dataset with event/duplicate-disjoint splits | R02 | Hashes, rights/provenance review, overlap assertions, label origins |
| R04 | P1 / A+B | Run frozen baselines and ablations; separate retrieval from classifier error | R03, B05 | Raw predictions, configs, per-class support, event-level uncertainty |
| R05 | P1 / B | Manuscript draft and honest result interpretation | R04 | Every number generated from a named artifact; limitations and negative results retained |
| REL01 | P0 / A+B | Teammate reproduction and final pilot release | B02-B12, relevant research gates | Clean environment reproduction; release manifest and remaining limitations |

R04/R05 may become a pilot report if R02 shows insufficient annotation time.
REL01 can release an engineering pilot while explicitly leaving scientific
validation open. B13 is limited to touched modules, not a prerequisite to move
every file in the target tree. Cloud hosting is optional and never blocks the
local reproducibility milestone.

## 2. Required test matrix

| Layer | Required cases | Isolation |
|---|---|---|
| Pure logic | mutation types/spans, temporal ambiguity, duplicate handling, metrics undefined cases | no stores/network |
| Auth | role denial, inactive accounts, atomic refresh, token reuse, sign-out, Redis loss policy | disposable PostgreSQL/Redis |
| Jobs | duplicate key, conflicting payload, two claimers, heartbeat loss, process death, stale writes, retry cap, cancellation | real PostgreSQL and separate worker processes |
| Models | missing/corrupt artifact, cold/warm start, wrong space identity, provider failure, bounded inference | small fixed inputs; explicit cached models |
| API | request/response schema, authorization, safe errors, pagination, capability failures | disposable stack |
| Frontend | real transport, timeout, abort, invalid JSON/shape, refresh coordination, visible provenance | mocked transport plus contract fixtures |
| Browser | sign in -> corpus -> claim check -> job result -> mutation compare -> annotate -> sign out | fixture-only accounts and corpus |
| Graph | relational commit followed by graph failure; retry converges; stale projection disclosed | disposable PostgreSQL/Neo4j |
| Deployment | clean boot, migration failure, no automatic imports, health and proxy handling | independently named fixture project |
| Recovery | encrypted backup, isolated restore, labels and relationships integrity | never restore over live volumes |
| Research | event/duplicate split disjointness, label provenance, test untouched by selection, artifact regeneration | frozen exported data |

SQLite tests remain useful for fast logic, but cannot certify pgvector,
PostgreSQL locking, partial unique indexes or concurrent session behavior.
Mocked HTTP tests cannot certify browser flows. Successful backup creation
cannot certify restore. Document these boundaries beside results.

## 3. CI and evidence policy

PR gate: backend lint/type checks, frontend lint/type checks, unit/API tests,
real PostgreSQL integration, schema drift, production build and bounded browser
smoke. Preserve existing coverage thresholds initially; coverage percentage is
supporting information, not a substitute for the cases above.

Release gate: built-image full fixture smoke, restart/recovery test, migration
rehearsal, restore evidence, dependency/image/model inventory and two-user load
sample. Cache only dependencies and public model artifacts; do not cache
credentials, private annotations or mutable production snapshots in CI.

Pin dependencies/model revisions after verifying compatibility. Record image
digests and source commit in the release manifest. Review security scan findings
by exploitability and exposure; do not claim that an empty scan proves security.

## 4. Data and experiment controls

Two authors label independently without seeing predictions or each other's
votes. The pilot should test whether the rubric distinguishes changes from
ordinary paraphrases and legitimate updates. Report per-label agreement and
class counts before consensus. Unresolved cases remain explicit.

Preserve human, automatic, test and legacy label origins. No smoke script may
write to the scientific dataset. Keep synthetic challenge cases separate from
naturally sampled evaluation cases. Authors' labels are not external validation.

Training fits model/calibration parameters. Development selects thresholds.
Test evaluates the frozen choice once; exploratory changes afterward require
disclosure and a new untouched evaluation set for confirmatory claims.
Include event-level confidence intervals where supported; report unavailable
metrics when a class or independent-event count is inadequate.

Every experiment manifest records dataset and split hashes, code revision,
model revisions, dependency lock hash, prompts, seed, hardware, timings,
configuration, raw prediction paths and failures. A final result artifact is
immutable; reruns get new run IDs. Do not overwrite historical reports to make
them appear to validate the current algorithm.

## 5. Change and rollback procedure

1. Create a small issue or work-package note with the acceptance case.
2. Use a focused branch; the other person reviews behavior and evidence.
3. Keep file moves separate from behavior changes and data migrations.
4. Run isolated checks; inspect the diff for data/secret/artifact changes.
5. Apply additive schema changes to a restored fixture first.
6. Release only after the relevant gates pass and a recovery path is recorded.

Application rollback uses a known image compatible with the additive schema.
Do not automatically downgrade migrations or delete columns to undo a deploy.
Restore requires an isolated integrity check and an explicit live cutover plan.
Preserve original corpus/annotations and model-space metadata across upgrades.

## 6. Pilot handoff checklist

- [ ] One documented local startup and shutdown path.
- [ ] Separate fixture/staging configuration and volumes; no shared live DB tests.
- [ ] Two provisioned researchers with least-privilege roles.
- [ ] Supported capabilities and unavailable states documented.
- [ ] Worker restart and failed-job recovery instructions verified.
- [ ] Backup owner, encrypted off-host copy and measured restore procedure.
- [ ] Reproduction instructions exercised by the other person.
- [ ] Known defects and deferred cloud/public-production gates listed.
- [ ] Publication status states pilot, validated experiment or submission accurately.

The next implementation slice is B01-B03 and R01. It restores trustworthy
observations before changing algorithms or collecting final research results.
