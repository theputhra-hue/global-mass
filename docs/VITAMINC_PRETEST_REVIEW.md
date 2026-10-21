# VitaminC pretest scientific and code review

**Review status: 19 October 2026; held-out test labels and results not opened by this reviewer.** This review covers `evaluation/scripts/vitaminc_statistics.py`, its tests, `run_vitaminc_pilot.py`, the draft `run_vitaminc_locked.py`, and `docs/VITAMINC_PILOT_PROTOCOL.md`. Source is still in a working tree. No local analysis freeze or test score is documented here. The separate data audit disclosed one earlier accidental view of an aggregate test-label summary; preserve that disclosure.

## Resolved or verified before scoring

| Finding | Status and evidence |
|---|---|
| AUROC implementation | **Verified on synthetic cases.** `RankedAUC` computes tie-aware, row-weighted AUROC; the weighted result matches explicit repeated rows and scikit-learn. Both models receive the same multinomial page draw. Undefined one-class draws are counted. Five statistics tests passed. This checks implementation, not interval coverage on VitaminC. |
| Dev threshold units | **Resolved in current pilot source.** The 101-point grid scores `scores >= t/100` and returns that same fractional threshold for later prediction. The synthetic test recomputes macro-F1 at the returned threshold. |
| Train/dev data integrity | **Resolved in current pilot source.** `run_pilot` checks the audited train/dev SHA-256 values before use by default and rechecks those bytes after fitting. Synthetic fixtures can explicitly disable the official-hash requirement. No test file is an argument to the train/dev pilot. |
| Primary page grouping | **Resolved in current scorer source.** The scorer passes SHA-256 of the normalized `page_key` to `paired_page_bootstrap`, so case/underscore variants within test are one page group. |
| Frozen probability calculation | **Verified synthetically and partially replayed by design.** Saved scaler and logistic coefficients reproduce scikit-learn probabilities in the locked scorer's synthetic test. The freeze now replays 100 clean-dev rows and rejects probability error above `1e-12`. The lock records and checks Python, NumPy, SciPy, scikit-learn, and RapidFuzz versions. The real full fit and its replay have not yet run in this review. |
| Full-fit and copied-file checks | **Implemented, not yet exercised on a real fit.** Freeze rejects bounded fits; checks 236,998 train rows, 36,390 clean dev rows and 234 quarantined dev rows; rejects convergence warnings; and verifies source/data/model/prediction hashes. `validate_lock` now checks the copied dev prediction file against its frozen digest. |
| Duplicate-dependence sensitivity | **Implemented as a secondary analysis.** The locked scorer now hashes the connected-component helper and runs a separate paired component bootstrap on the same clean rows, while retaining page bootstrap as primary. Input-only group-size diagnostics should be inspected and recorded before opening test labels. |
| Synthetic gates | **Passed:** 15 tests across statistics, grouping, pilot, and lock modules using the ignored research virtual environment; none loaded real test labels. |

## Unresolved gates and material risks

1. **Review and anchor the actual lock before test inference.** The protocol is still a draft, and `freeze` currently accepts any protocol containing a marker phrase. The local `lock.json` is content hashed, but its own hash is only returned locally; record that hash, the final plan hash, the dirty source hashes, and the exact command in a tracked pretest ledger or similarly independent record before running `score`. This is a local analysis freeze, not an external preregistration. Keep the prior aggregate-test-label access disclosure. The one-time marker prevents an accidental second run through this script, but it is not a substitute for an externally verifiable lock.

2. **Exercise the real full fit before locking.** The current freeze asserts full train/dev counts, 234 dev exclusions, matching input/source/model/prediction hashes, and no convergence warnings. It replays the first 100 clean-dev predictions from the saved model; the copied predictions are checked again at score time. No real full fit or freeze has passed these checks yet in this review. Inspect the two saved feature orders, class orders, selected regularization values and thresholds; compare a larger seeded clean-dev replay if feasible. Record the actual full-fit manifest and any warnings before making a final lock decision. The label-balanced bounded pilot remains feasibility work only.

3. **Predeclare how to interpret residual dependence.** The primary row-weighted AUROC and page-cluster percentile interval answer a specific sampled-release question. Exact sentence pairs recur within the release, and revision IDs or page aliases can connect different titles. Page-only resampling may understate uncertainty when those links cross pages. The scorer now runs a secondary component bootstrap using the input-only transitive grouping helper and reports component sizes. Compute and record its component count, largest component and nontrivial-row coverage during the input-only freeze, before opening test labels; this reveals whether an exact-pair/revision chain creates a giant component. State in the locked protocol how a discordant component interval affects a material-gain claim. Consider a predeclared unique-exact-pair weighting or deduplication sensitivity if repeated examples materially dominate. Do not tune group definitions after outcomes. Near duplicates and aliases beyond these keys remain unmeasured dependence.

4. **Freeze the strong benchmark anchor decision.** The protocol names the released ALBERT flagging checkpoint as a matched secondary anchor, but the current locked scorer evaluates only lexical and GMEE-feature logistic models. A separate 100-row clean-dev feasibility audit pinned the checkpoint and tokenizer, reproduced the authors' raw-sentence/max-length recipe, and observed feasible CPU inference. Before the first test score, freeze the full checkpoint inference code, row set, preprocessing, hashes and output plan, or explicitly narrow the paper comparison to the two logistic models. Historical published scores cannot replace same-row inference. A later model choice made after viewing the two-model test result would be exploratory.

5. **Specify the inference rule and precision limit in the final plan.** The candidate primary estimand is row-weighted `AUROC(GMEE augmented) − AUROC(lexical)` on the clean released test subset. The fixed code uses a two-sided percentile 95% interval from 2,000 page draws and calls a gain material only if its lower bound exceeds `+0.02` with at least 95% valid draws. The draft protocol mentions undefined draws but does not yet state this validity cutoff or behavior when it fails. Freeze the cutoff, seed, interval algorithm, practical margin, and how the component sensitivity affects interpretation. Estimate expected precision and class/page support using train/dev only; do not use the previously viewed aggregate test-label summary for this choice. Report an interval that misses +0.02 as inconclusive for material gain, even if the point estimate exceeds it.

6. **Bound the claim to the actual task and contrast.** Even if the clean test interval lies wholly above +0.02, it supports only incremental value of the **combined deterministic GMEE text-change features** for binary factual-revision flagging on the authors' model-preselected Wikipedia candidate pool. The augmented features include similarity and lexical edit operations; this contrast cannot attribute any gain specifically to quantity equivalence, temporal context, or provenance. It does not measure natural-news event generalization, true/false status, typed human change spans, correction handling, or causal propagation. A strong benchmark anchor and error analysis remain important for a paper claim of competitiveness or scientific novelty.

## Leakage and one-time scoring check

The draft quarantine rule is conservative and appropriate for the declared clean subset: clean dev excludes matches to **full** train, while clean test excludes matches to **full train and full dev**, including discarded dev rows. The locked input audit uses the planned page/revision/exact-pair keys and refuses if the test exclusion count differs from 220. It hashes the released files before scoring and checks unchanged sources and runtime. The scorer's one-time `TEST_ACCESS_STARTED.json` is created before it parses test labels. A failed run after that marker must be preserved and disclosed; do not remove the marker to rerun silently.

The released authors' split still has residual within-split duplicates and possible near duplicates. The primary clean subset removes only the predeclared cross-split identity overlaps; it must not be described as fully independent by event, page history, or proposition. Full official test metrics are secondary and must report the overlap caveat. Both compared models must use the same rows, identical `sent_a`/`sent_b` inputs, train-only scaling, and dev-only model/threshold selection. The bounded, label-balanced pilot is for feasibility and code checks; the final fit must use full official train and clean dev.

## Verification commands used

No command below opened `test.jsonl` or a held-out result:

```powershell
cd E:\global-main\global-mass-integration\evaluation
..\.local-deployment\research-venv\Scripts\python.exe -m pytest tests/test_vitaminc_statistics.py tests/test_vitaminc_groups.py tests/test_vitaminc_pilot.py tests/test_vitaminc_locked.py -q
```

Output: `15 passed` (synthetic tests). Test inference remains unperformed in this review.


## Post-review resolution log

The pretest review above intentionally stopped before any held-out score. The
following changes were completed afterward on 19 October 2026 and are recorded
here so the historical review is not mistaken for the current state:

- A real full train/dev fit was completed with the current source and official
  bytes: 236,998 train rows and 36,390 clean dev rows after the predeclared
  234-row quarantine. The pilot remains exploratory and dev-selected.
- A typo in the locked runner's expected test digest was found when the first
  freeze attempt refused the audited bytes. The literal was corrected to the
  independently computed archive file hash, and the focused suite was rerun.
- The freeze now records input-only connected-component diagnostics before test
  labels are used. The clean test has 4,192 such components, a largest
  component of 598 rows, and 29,879 of 30,828 rows in nontrivial components.
- `docs/VITAMINC_ANALYSIS_PLAN_V1.md` was locked locally with the declared
  lexical-versus-augmented AUROC contrast, +0.02 practical margin, 2,000-draw
  page bootstrap, stopping rule, and test-access disclosure. The local lock
  SHA-256 is `b7f1e136e8b1238d3fe41908e45f6b9115d924bbd128aa258d0189d945446e0b`.
- The one-time test score completed under that lock. The narrow component
  result is recorded without generalizing it to natural-news GMEE: primary
  delta `0.0891243913`, page-group 95% interval
  `[0.0760953865, 0.1019605615]`, 2,000 valid draws. The redacted receipt is
  `VITAMINC_COMPONENT_RESULT_RECEIPT.md`.

These results do not close the local GMEE human-gold gate, and the released
VitaminC benchmark's sampling, split-overlap, rights, and annotation caveats
remain part of any future interpretation.
