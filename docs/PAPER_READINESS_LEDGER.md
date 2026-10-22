# GMEE paper readiness ledger

Status as of **20 October 2026**; database counts retain their 19 October audit date. This ledger tracks publication evidence, not product or cloud publishing status. Recheck live state before relying on counts.

| Gate | Status | Evidence and next action |
|---|---|---|
| Versioned canonical source | **SELECTED; VITAMINC COMPONENT LOCK HASHED** | Use `global-mass-integration` Git checkout at baseline `aa0056c`; the local lock records that HEAD plus hashes of the dirty working-tree research sources. The 19 October comparison of 392 shared tracked files found no unique research source files in the non-Git sibling; preserve both distinct ignored database backup sets. The local component lock is reproducible from the recorded source/data hashes, but the research changes remain uncommitted and must be reviewed before any release. |
| Corpus | **AVAILABLE, UNREVIEWED** | Read-only local PostgreSQL inventory found 10,879 articles and 10,254 claims. Of those articles, 10,800 are processed and 79 skipped as non-English; NLP status is 6,870 completed, 3,581 pending, 301 failed, 127 skipped. `backend/gmee_articles_export.csv` is an older 6,436-row extract. Verify selection, text/date completeness, source rights, and which snapshot is authoritative. `sources` has no explicit redistribution license field. Counts are not human gold. |
| Independent human gold | **OPEN FOR GMEE; EXTERNAL COMPONENT AVAILABLE** | Local `eval_pair_labels` still has 3,826 legacy machine labels plus nine human labels on nine pairs from one authenticated user; no pair meets the two-distinct-human consensus rule. The public VitaminC release supplies a task-matched binary factual-revision component target and is now evaluated under a separate lock, but it cannot serve as GMEE relatedness/type/span/context gold. Recruit or obtain two independent authenticated GMEE reviewers before claiming the local task is validated. |
| Event-disjoint frozen splits | **UNPERFORMED** | All 1,271 `eval_pairs` rows currently have `split='unassigned'` and `event_group='unassigned'`. Curate event identity, canonical groups, and immutable train/dev/test assignment. |
| Annotation rubric | **RECONCILED IN SOURCE; PILOT OPEN** | Current `backend/app/services/eval/annotation.py` and `docs/EVALUATION.md` use three relatedness classes plus separate type/span/context targets. The incompatible legacy guide and schema were retired on 19 October 2026. The deployed `claim-pairs-v2` rubric was verified in `backend/app/services/eval/annotation.py`; the reviewer procedure and concrete dependency are prepared in `docs/GMEE_ANNOTATION_PILOT_PACKAGE.md`. Independent pilot review is still open. |
| Locked primary analysis | **COMPONENT LOCKED; LOCAL GMEE ANALYSIS OPEN** | `docs/VITAMINC_ANALYSIS_PLAN_V1.md` fixes one component endpoint/contrast, exclusions, +0.02 margin, page/component bootstrap, model selection, stopping rule, and secondary policy. The lock is local and task-specific; the broader quantity/time/provenance GMEE analysis remains unperformed. |
| Preregistration draft | **LOCAL COMPONENT PLAN LOCKED; NO EXTERNAL REGISTRATION** | The pilot-dependent local natural-news draft remains a design history. `docs/VITAMINC_ANALYSIS_PLAN_V1.md` is the separate content-hashed local freeze for the public VitaminC component task; it does not register or complete the GMEE natural-news protocol. |
| Existing human benchmarks | **AUDITED; TASK FIT LIMITED** | `docs/PUBLIC_BENCHMARK_AUDIT.md` compares NewsEdits 2.0, ClaimDiff, VitaminC, SemEval/MultiClaim, and QuanTemp. VitaminC real revision flagging is a plausible accessible component task, but it is Wikipedia factual revision rather than GMEE's full natural-news typed claim evolution. NewsEdits 2.0 gold access remains unverified. Choose any external primary task before locking a new protocol; do not remap labels to fit claims. |
| VitaminC component pilot | **LOCKED TEST SCORED; NARROW RESULT VERIFIED** | Full train/dev fitting, input-only dependence audit, and a one-time locked test score completed without changing the predeclared task or exclusions. On 30,828 clean rows, the augmented-minus-lexical AUROC difference was `0.089124`; paired page-group 95% CI `[0.076095, 0.101961]` from 2,000/2,000 valid draws, above the predeclared `+0.02` margin. The result supports only this binary Wikipedia component task; the redacted [receipt](VITAMINC_COMPONENT_RESULT_RECEIPT.md) records the reproducible summary. The archive SHA-256 is `7e13400c6c2f1aeca8a084eedbdbb3dff797d3660c93b9229fdeb85ebd82006e`; see the hashed lock/receipt below. |
| Prior work comparison | **UPDATED; NOVELTY STILL OPEN** | `docs/RESEARCH.md` now compares the direct task overlap from ClaimDiff, NewsEdits 2.0, and VitaminC alongside the earlier literature matrix. Confirm the final research claim against current primary literature after results are known. |
| Baselines and ablations | **EIGHT SAME-TEST CONFIGURATIONS; EXPLORATORY COMPLEMENTARITY** | Original lexical AUROC 0.7225 and 33-feature augmented 0.8116; separately frozen post-primary sparse edit-text baseline 0.8205 and released ALBERT checkpoint 0.9189 on the same 30,828 clean test rows. ALBERT uses the authors' saved training state, not an identical local retraining procedure. Both supplementary results are reported regardless of direction; they do not alter the original primary contrast. See `docs/VITAMINC_SUPPLEMENT_RECEIPT.md`. A later fixed exploratory analysis scored analyzer-summary A=0.7511, complementary partition B=0.7971, sparse+lexical C=0.8317 and sparse+full33 D=0.8569. D-minus-C descriptive page CI is [0.0213,0.0292]. Individual semantic rules remain unvalidated. |
| Manuscript and release | **WORKING MANUSCRIPT, FIGURES, BIBLIOGRAPHY CREATED** | `paper/manuscript.md`, `paper/references.bib`, and aggregate figures report all eight model configurations, dependence, access history, rights, and limits. `paper/REVIEW_GAPS.md` identifies unresolved contribution, author accountability, venue, and release work. The local PDF is a working draft, not submission-ready. No public release or push has occurred. |

The database figures above came from read-only local inventory on 19 October 2026; retain the query and environment identity with the next frozen snapshot. Never promote these live counts into paper metrics without a versioned export and manifest.

Read-only count command (no credentials printed):

```powershell
docker exec gmee-local-postgres-1 sh -lc 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Atc "SELECT (SELECT count(*) FROM articles), (SELECT count(*) FROM claims), (SELECT count(*) FROM eval_pairs), (SELECT count(*) FROM eval_pair_labels);"'
```

Output: `10879|10254|1271|3835`. Grouping `eval_pair_labels` by `origin` gave `legacy|3826|0|1271` and `human|9|1|9` for `origin|rows|distinct_annotator_user_id|distinct_pair_id`. Grouping `eval_pairs` by `split,event_group` gave `unassigned|unassigned|1271`. The Docker service is `gmee-local/postgres`, database `gmee_recovered_20261014_125749_42877642`, matching the local backend's configured database name. These are live counts, not an immutable research export.

## Continuation evidence — 19 October 2026

The following entries are verified local evidence from the continuation run. Paths
under `.local-deployment/` are ignored and remain local because the release may
contain dataset-derived identifiers and predictions.

| Timestamp (UTC) | Source/command | Status | Evidence hash or result | Next action |
|---|---|---|---|---|
| 2026-10-19, session run | `evaluation/tests` via `.local-deployment/research-venv-linux/bin/python -m pytest evaluation/tests -q` | **verified** | `16 passed`; environment used Python 3.11.2, NumPy 2.2.6, SciPy 1.15.3, scikit-learn 1.7.2, RapidFuzz 3.14.3 | Keep the synthetic leakage/statistics gates with the lock; rerun after any source edit. |
| 2026-10-19, session run | Full train/dev pilot: `evaluation/scripts/run_vitaminc_pilot.py --data-dir .local-deployment/research-data/vitaminc/extracted/vitaminc_flagging --output-dir .local-deployment/research-runs/vitaminc-pilot-full-train-dev-linux-20261019 --seed 1729` | **exploratory, verified** | Full train `236,998`; clean dev `36,390`; no test file was opened by the pilot. Manifest SHA-256 `f9d9090913fbbae458a4c17a3037cd0e27461b2a717727180babc031272ad15d`. | Do not quote dev scores as held-out evidence; use the content-hashed lock for test interpretation. |
| 2026-10-19, session run | `docs/VITAMINC_ANALYSIS_PLAN_V1.md` + `run_vitaminc_locked.py freeze` | **verified** | Plan SHA-256 `d2d3af48a494926babd9be84af4aed88d80c24cd9f72baff1b5ab263083104c3`; lock SHA-256 `b7f1e136e8b1238d3fe41908e45f6b9115d924bbd128aa258d0189d945446e0b`; clean test `30,828`, quarantined `220` | Treat the lock as a local analysis freeze, not external preregistration; retain the aggregate-label exposure disclosure. |
| 2026-10-19T04:48:12Z | `run_vitaminc_locked.py score` with the frozen lock | **verified component result** | Predictions SHA-256 `4199998ab531c50ce1a5606f72ee852e547cfc194a5f4fa1d1a87f88c58b090f`; report SHA-256 `15e18b6290e6bccc71a83f3fdde4f9f93a6732964ed7a6498ec5a20260b718fd`. Primary delta `0.0891243913`, CI `[0.0760953865, 0.1019605615]`, 2,000 valid draws. | Report only as a narrow VitaminC component result after independent critical review; do not generalize to GMEE natural-news evolution. |
| 2026-10-19, session run | Input-only connected-component audit recorded in `lock.json` and `results.json` | **verified limitation** | `4,192` components; largest `598` rows; `29,879/30,828` clean rows in nontrivial components. Component sensitivity CI `[0.0756004715, 0.1024241337]`. | Explain dependence and residual page/history leakage in any manuscript; obtain local GMEE event labels separately. |
| 2026-10-19T08:24:22Z | Separate sparse text score under frozen supplement | **verified, supplementary** | Clean AUROC `0.8204875097`; augmented-minus-sparse descriptive page CI `[-0.0180922303,-0.0006181117]`. Results SHA-256 `29bb3d50f0621c3e38ad23206ec75c4ece827d3fca32e78dd3d53dfe8cdb0a03`. | Report the stronger sparse comparator and post-primary design transparently. |
| 2026-10-19T09:02:50Z | Pinned ALBERT checkpoint, one frozen supplementary inference run | **verified, supplementary** | Clean AUROC `0.9189335550`, full AUROC `0.9191132126`; 295/31,048 pairs truncated at 256 tokens. Predictions SHA-256 `e223938634dcc504891b954f7921f9fd60152f5892dc9b9859ec96c8162fbeb0`; results SHA-256 `90faaf3520ce9e9b701c7c46b59d40db0408f333fe5b9ddc70d84a49d87f63fb`. | Preserve original checkpoint, predictions and post-primary interpretation; no leading-performance claim. |

The current research source files are not committed; the lock hashes the exact
working-tree files used. Recompute every listed hash from the local artifact
before copying this ledger into a release.

## Active paper scope and earliest remaining gates

The working paper is now explicitly a **VitaminC component and reproducibility
study**, supported by existing external human-reviewed binary labels. A second
local human reviewer is not a prerequisite for writing that narrow report.
The explanatory contribution is now clearer: the fixed descriptors show
exploratory complementary information beyond sparse text plus lexical values,
while remaining below the released checkpoint. This is limited to the tested
recipe and dataset; individual semantic rules and transfer remain unvalidated. The draft must survive that comparison and a critical
novelty review. Additional analyses of the exposed test are exploratory; no
wording can turn them into an untouched confirmatory evaluation.

The full GMEE natural-news paper still requires independent human gold: at
least two distinct authenticated reviewers per eligible pair, event identity,
relatedness, type, exact spans, context, disagreement/adjudication, rights, and
a leakage-resistant split. Assistant-generated labels cannot satisfy this.
Author details, human accountability, venue fit, rights decisions for any public
artifact, and final submission approval remain separate human inputs. Continue
available analysis and manuscript preparation while those inputs are pending.

## Feature-analysis and review-package continuation

At `2026-10-19T15:32:20Z`, four new models were frozen after all earlier outcomes
were known. Lock SHA-256 `b0094d747787768135cf5c1707ea92a690e9d17a55dadb4e501efd219fc41d71`;
all development probabilities replayed exactly after serialization. One test
access at `2026-10-19T15:32:53Z` yielded original33-minus-A AUROC 0.06055994
(descriptive page CI [0.05186232,0.06899128]) and D-minus-C 0.02526674
([0.02132093,0.02924439]), each 2,000 valid draws. Results SHA-256
`f44bb6bc4a16f3fe081ad07c36e62d0e0ba45e70675f0d6fb194492c9beee300`.
A separate saved-prediction aggregation agreed within 2.23e-16 for every model's
clean/full metrics. See `docs/VITAMINC_MECHANISM_RECEIPT.md`.

`paper/INTERNAL_REVIEW.md` records AI-assisted critical review and applied fixes;
`paper/CLAIM_EVIDENCE_MAP.md` maps manuscript claims to saved reports. A fresh
artifact adapter was added separately from the frozen runner, with two focused
provenance tests.

On 20 October 2026, the isolated clean-environment reconstruction
(`.local-deployment/reconstruction-20261020-v1/workspace`) was completed across
all eight models. All **1,491 verifier checks passed** with zero observed numerical differences in the checked artifacts
(`paper/reconstruction_comparison.json`). The updated review bundle v2,
`output/paper/gmee_component_review_bundle_v2.zip` (SHA-256
`1aaba87f55497c761ddcb4ffa36da4924ff48912a48af963af639b6fd4078b8c`, 75 files),
was successfully verified and built. The local package contains selected code,
reconstruction comparison receipts, and aggregate evidence, excluding raw text,
weights, or private database material. No GitHub push or external submission has occurred.


## Version 3 review reconciliation - 20 October 2026

The existing reconstruction receipt was reverified read-only: all 1,491 checks
passed again, with identical comparison content except its timestamp. A separate
AI audit found no benchmark text or real row IDs in the text-free receipt.
All seven prediction-file digests match their originals. This establishes
agreement for the recorded computation, not zero classification error.

Sai Prabhas confirmed equal project contribution by himself and Pavanputra.
The current manuscript and AUTHOR_DECLARATIONS.md record that statement without
inventing individual roles or completed final human review. Corresponding contact,
funding/conflicts and final author verification remain open. The publication
route is unselected; no external submission has been authorized.

The ten-page manuscript now distinguishes original evaluation from the later
reconstruction, reports the verified Debian container runtime, and discloses
Codex assistance. Every current PDF page was rendered and visually inspected.
The version 3 package preserves the original and version 2 ZIPs, corrects stale
readiness language, and pins the reviewed reconstruction receipt and its
plan/verifier source identities. The v2 digest above was checked against the
actual preserved archive and sidecar during this reconciliation.

Version 3 archive verified: SHA-256 `0feb6832bc56e0e8800a952e97f7bb781fe1b3f8c64e24eb6c7821d1627b511c`; 76 entries, all 75
payload sizes/digests checked and current PDF/source bytes matched.
No push, upload, author contact or submission was performed.

## Independent project/publication audit — 21 October 2026

The [deep-dive assessment](DEEP_DIVE_ASSESSMENT_2026-10-21.md) records a new
read-only project and research audit requested by the user. Earlier dated
inventory and experiment entries above remain historical evidence.

- **Verified current inventory:** 10,879 articles, 10,254 claims, 1,271 pairs,
  3,853 label rows. Human labels increased to 27 on 27 pairs, still from one
  distinct authenticated reviewer; 3,826 remain legacy. No pair has two distinct
  reviewer identities. Every pair remains event/split unassigned. These live
  counts are not a frozen benchmark. Aggregate SQL was run read-only in the
  existing local PostgreSQL service; no labels or corpus rows were changed.
- **Verified data-quality issue:** 642 NLP-completed articles have neither raw
  nor cleaned body text. Current completion status does not establish that an
  analyzable body was present. Preserve existing rows; define missing-content
  handling and scientific exclusions prospectively.
- **Fresh engineering checks:** backend offline suite 644 passed/17 deselected;
  frontend 209 passed/36 files, lint/build and coverage gates passed; infra 25
  passed; research synthetic suite 30 passed. Pinned Ruff 0.16.2 found one
  ISC004 issue in `backend/scripts/export_candidate_manifest.py:167`; mypy
  2.3.0 found 11 fixture-typing errors in
  `backend/tests/test_export_candidate_manifest.py`. Passing tests do not mean
  all current static gates pass. No application/research source was repaired
  during this assessment.
- **Verified saved evidence:** all eight models' saved prediction metrics agreed
  with existing reports within 1.11e-16; prediction alignment and inspected
  digests passed. Review bundle v3 SHA-256 remains
  `0feb6832bc56e0e8800a952e97f7bb781fe1b3f8c64e24eb6c7821d1627b511c`, with all
  75 payload digests checked. This was saved-artifact verification, without
  fitting, new benchmark inference or a new confirmatory experiment.
- **Assessment:** strong B.Tech engineering (subjective 8.3/10), full GMEE
  natural-news research unvalidated, narrow VitaminC report credible for
  independent empirical/reproducibility review but not a strong validated
  full-system/new-method claim. Preserve the exploratory status of D-minus-C.
  The highest-impact next scientific gate is independent challenge of the
  contribution and, if pursuing complementarity/generalization, a prospectively
  frozen untouched task-matched confirmation. Full GMEE additionally needs
  context-rich independent human gold and event-disjoint splits. Existing source
  rights, authorship/declarations and venue gates remain open.

No push, upload, external message, submission or live-data mutation occurred.

## Local core-integrity checkpoint — 22 October 2026

The user selected RAM prices as the first topic and requested a saved checkpoint
before resuming tomorrow. See
[the checkpoint](checkpoints/CORE_EVIDENCE_RAM_PRICES_2026-10-22.md).
The existing published archive was validated and audited read-only: 8 lexical
topic candidates across 2 domains, including 1 without extracted claims. All
remain relevance-review pending; none has a verified event assignment. This is
candidate inventory, not independent gold, exhaustive retrieval or a RAM-price
finding. Source bodies and detailed evidence remain absent from publication
formats 1–3; local database availability was not audited because Docker was off.
Local integrity/API/UI changes and synthetic RAM comparison guards have 65
targeted backend and 40 targeted frontend passing tests; final checks and
browser verification remain open. Existing frozen VitaminC outcomes were not
changed or re-evaluated. No new scientific gate is claimed complete. The prior
research-preserving application restoration was merged as `ddfb3ef`; this new
core work remains local and undeployed.

## Core-integrity continuation — 22 October 2026

The user resumed the checkpoint. The
[verification receipt](validation/CORE_EVIDENCE_VERIFICATION_2026-10-22.md)
records 750 passing backend offline tests (22 real-model/database tests
deselected), 367 passing frontend tests, coverage gates, lint/type/boundary and
interface/cloud checks, and desktop/mobile browser checks of a disposable local
copy. Archive completion/evidence gaps are explicit; legacy score language no
longer implies a calibrated probability or that an unsupported claim is false
or single-source. RAM comparison guards now include form, ECC and timings.

The eight RAM-topic candidates were triaged from metadata only: device-price,
supply and forecast stories still need source relevance review and comparable
RAM offer evidence. No relevance gold, rights determination, independent human
label, verified event group or substantive price-change finding was created.
The existing archive and frozen VitaminC computations were unchanged. Local
engineering completion does not close the independent-validation gate for a
full GMEE natural-news paper. No push, live publication or deployment occurred.
