# VitaminC factual-revision pilot — DRAFT, test not scored

> **Superseded for the completed component score:** `VITAMINC_ANALYSIS_PLAN_V1.md` is the content-hashed local analysis freeze. This draft is retained as the design history and must not be used to interpret the locked test receipt.

**Status: design draft, 19 October 2026.** This is an external component evaluation for GMEE, not a test of cross-outlet news lineage, factual truth, typed-span accuracy, or the local corpus. No model has been scored on the released test set in this workstream. Lock a content-hashed version of this protocol, code, data manifest, and analysis settings before test inference.

## Task and data

Use the authors' `vitaminc_flagging.zip`, specifically `vitaminc_flagging/{train,dev,test}.jsonl`. Input is only `sent_a` and `sent_b`; target is `label='factual'` versus `label='not factual'`. The target asks whether a real Wikipedia sentence revision changes the factual proposition relevant to a claim, including changes to support/refutation status. It is not GMEE's `SAME_STORY`/`EVOLVED`/`DISTINCT` target. Do not use diff fields or the label as model input. The authors selected the candidate revision pool; report performance on that pool, not all Wikipedia revisions.

The downloaded archive currently has SHA-256 `7e13400c6c2f1aeca8a084eedbdbb3dff797d3660c93b9229fdeb85ebd82006e`; verify it against `VITAMINC_DATA_AUDIT.md` before a run. Released train/dev/test counts are 236,998 / 36,624 / 31,048. Preserve the official assignments. The archive is local under ignored `.local-deployment/research-data/vitaminc`; do not commit the source text. Follow the authors' data terms and record model/data revisions.

## Proposed primary contrast

Compare two matched regularized logistic classifiers on the **same rows and raw sentence inputs**:

- **Lexical baseline:** normalized character edit distance, token overlap/Jaccard, sentence lengths, and inserted/deleted/replaced token counts.
- **GMEE augmented:** the identical lexical vector plus frozen `analyze_text_change` features: similarity, meaningful-change and quantity-equivalence indicators, counts/indicators for its mutation types, and span/edit operation counts. These are predictors derived only from the two sentences, not gold labels. Freeze exact feature names and code before test.

Fit scalers and classifiers on clean official train. Select regularization from a declared grid using clean dev AUROC only; break ties toward stronger regularization. Choose any binary operating threshold on dev only. **Candidate primary endpoint:** paired test AUROC difference, augmented minus lexical, on the clean test subset below. A +0.02 absolute AUROC gain is the proposed smallest practically meaningful effect; confirm this and the grid after train/dev pilot, then lock them before test scoring. Report a two-sided 95% paired bootstrap interval resampling `page` groups (proposed 2,000 draws), with group and class support and undefined draws. A material-gain claim requires the entire interval to exceed +0.02; a smaller or negative result is reportable. This contrast tests the incremental value of GMEE's *combined deterministic features*. It does not isolate quantity normalization, time, or provenance.

## Leakage and comparison anchors

Before inspecting test outcomes, compute overlap keys using only `page`, `wiki_revision_id`, `sent_a`, and `sent_b`. Normalize page title by trimming, casefolding, and replacing underscores with spaces; hash an unordered pair of **exact raw sentence strings**, with no sentence normalization. For train/dev, quarantine dev rows matching any full-train page key, revision ID, or exact unordered pair. For test, quarantine rows matching any full-train or full-dev row under the same keys (including dev rows quarantined from fitting/selection). This conservative rule matches the input audit. Do not remove blank sentences merely because they are blank: additions and deletions are in task scope. The read-only input audit identified 234 quarantined dev rows and 220 quarantined test rows under these rules; recompute and freeze exact sets/hashes. **Primary** uses the resulting clean test rows; report metrics on the official full test separately for comparison, applying every method to the identical rows. Audit residual near-duplicates and page aliases as limitations rather than tuning exclusions from labels.

Run the authors' released full-sentence `tals/albert-base-vitaminc_flagging` checkpoint on the same frozen rows as a strong secondary benchmark anchor, using the author's raw-sentence preprocessing and max length 256. Record checkpoint/tokenizer revisions, truncation, hardware, memory, runtime, and per-row predictions. Pilot 100 clean dev rows for compute feasibility before committing to full inference. If compute blocks this run, state that the strong-baseline comparison is incomplete. Historical published scores are context, not a matched same-run result.

Secondary results may include PR-AUC, macro-F1 at dev-selected thresholds, class precision/recall, confusion, calibration only for actual probabilities, runtime, and input-defined numeric/date/negation/addition/deletion slices with counts. Predeclare any confirmatory secondary comparisons or treat them as descriptive. Review a seeded page-stratified sample of errors qualitatively; assistant interpretation is not human gold.

## Test-access disclosure and lock gate

During the 19 October design audit, one team agent inadvertently viewed an **aggregate test-label summary** before this protocol was locked. No individual test labels, examples, predictions, or performance outcomes were inspected. The primary lexical-versus-augmented AUROC contrast had been proposed before that read. Disclose this in the paper and do not describe the test as wholly unopened. Do not use the aggregate summary to choose features, thresholds, exclusions, or a stopping rule.

Lock only after: data/schema/rights audit; exact feature and model configuration; train/dev-only pilot; overlap manifest with hashes; grouped-interval implementation and meaningful tests; compute budget for the strong anchor; and a dated, hashed analysis plan. Then score test once and retain every prediction and command. Keep this pilot separate from the unperformed local natural-news benchmark.
