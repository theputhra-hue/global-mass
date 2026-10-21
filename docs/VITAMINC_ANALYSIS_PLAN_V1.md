# VitaminC factual-revision component evaluation — LOCAL ANALYSIS FREEZE v1

**Freeze date:** 19 October 2026  
**Status:** Local pre-test analysis lock. This is not an external preregistration
or a claim of publication acceptance.

This plan was locked after a full train/dev-only pilot of the released
`vitaminc_flagging` data. The pilot read no test file, test label, or test
prediction. A prior design audit did expose an aggregate test-label summary;
no individual test labels, examples, predictions, or outcomes were inspected.
That disclosure is retained here and in the generated lock manifest.

## Scope and contribution boundary

The external task is binary factual-revision flagging on the VitaminC release:
given two ordered Wikipedia sentences from a real revision, predict whether the
revision changes the factual proposition relevant to a claim. The labels are
human-reviewed labels supplied by the dataset authors, with the sampling and
agreement limitations documented in `VITAMINC_DATA_AUDIT.md`. This is a
task-matched public component benchmark, not an independently annotated GMEE
claim-evolution benchmark.

The frozen comparison asks whether deterministic GMEE text-change features add
incremental ranking value beyond a matched lexical classifier on this released
candidate pool. Even a positive result can support only the following narrow
statement: the combined feature implementation was useful for this binary
Wikipedia factual-revision task under this split and exclusion rule. It does
not establish natural-news event generalization, three-way claim relatedness,
typed human changed-span accuracy, correction handling, truth, source
provenance, copying, or causal propagation. No state-of-the-art or full-GMEE
validity claim is registered here.

## Primary estimand and decision rule

The single primary endpoint is row-weighted test AUROC on the clean test
subset. The single primary paired contrast is:

`AUROC(GMEE augmented) - AUROC(lexical baseline)`

Both models receive exactly the same rows and raw `sent_a`/`sent_b` inputs.
The primary subset excludes a test row when any of these input-only keys match
any full train or full dev row:

1. page title after trimming, replacing underscores with spaces, and casefolding;
2. `wiki_revision_id`; or
3. an unordered hash of the two exact raw sentence strings.

The pre-test audit fixes the expected exclusion at 220 of 31,048 test rows,
leaving 30,828 primary rows. The scorer recomputes and verifies the exact
retained and excluded case-ID hashes from the frozen lock. The official full
test release is a secondary, overlap-disclosed analysis only.

Uncertainty is a paired, two-sided 95% percentile bootstrap over distinct
normalized page-title groups, with 2,000 draws and seed `20261019`. Each draw
resamples page groups with replacement and applies the same multiplicities to
both models; rows remain equally weighted within a draw. A draw without both
classes is undefined. At least 95% of requested draws must be valid for the
interval to be treated as sufficiently supported. The smallest practically
relevant gain is fixed at `+0.02` AUROC. A material-gain statement is allowed
only when the complete supported interval is above `+0.02`; otherwise the
result is negative or inconclusive for that decision, even if the point
estimate is positive.

## Data, rights, and frozen inputs

Use the authors' official `vitaminc_flagging/{train,dev,test}.jsonl` files and
preserve their assignments. The audited archive SHA-256 is
`7e13400c6c2f1aeca8a084eedbdbb3dff797d3660c93b9229fdeb85ebd82006e`. The
individual file hashes, row counts, rights notes, and known cross-split
overlaps are recorded in `VITAMINC_DATA_AUDIT.md`; the lock manifest repeats
the bytes actually used. Raw Wikipedia text stays in ignored local storage.
Any later release must follow the archive's Wikipedia/CC BY-SA terms and
provide attribution; code licensing is not treated as a blanket text license.

The official train/dev counts are 236,998 and 36,624. The full train is used
for fitting. The 234 dev rows matching full train under the predeclared keys
are quarantined, leaving 36,390 clean dev rows for model selection. The
observed class support is recorded in the pilot manifest and is not treated as
a test result.

## Frozen predictors and fitting

No released diff field, label, page title, revision identifier, or other
metadata is a model input. The lexical baseline has these eight features:

- normalized character Levenshtein distance;
- token-set Jaccard similarity;
- character lengths of both sentences and their absolute difference; and
- token insertions, deletions, and replacements from an untyped sequence diff.

The augmented model concatenates those eight features with the deterministic
`gmee-typed-text-v2` outputs from `analyze_text_change`: similarity,
meaningful-change, quantity-equivalence, one indicator and one count for each
of `NUMERIC_DRIFT`, `ENTITY_SUBSTITUTION`, `POLARITY_SHIFT`, `HEDGING_SHIFT`,
`ATTRIBUTION_SHIFT`, `SCOPE_SHIFT`, `FRAMING_SHIFT`, `WORDING_DRIFT`, and
`NEAR_DUPLICATE`, plus total changed, insert, delete, and replace span counts.
The exact feature order and source hashes are copied into the local lock.

Each model is a `StandardScaler` fitted on full train followed by L2 logistic
regression with the `liblinear` solver, `max_iter=1000`, and seed `1729`.
The only C values are `{0.01, 0.1, 1.0, 10.0}`. Select the largest clean-dev
AUROC; ties within the implementation's declared precision choose the smaller
C (stronger regularization). Select a binary operating threshold on clean dev
only by maximum macro-F1 over `0.00, 0.01, ..., 1.00`; ties choose the higher
threshold. The primary endpoint is AUROC and does not depend on the operating
threshold; threshold metrics are secondary.

The full train/dev pilot exercised this configuration before the freeze. Its
outputs are exploratory development artifacts. They are not held-out results,
are not used to choose a test outcome, and are not reported as paper evidence
without the later locked test receipt.

## Secondary analyses and dependence sensitivity

The following are descriptive or sensitivity analyses and cannot create an
additional confirmatory claim under this lock:

- AUROC, average precision, macro-F1 at the clean-dev threshold, confusion,
  Brier score, and log loss for each model on the clean test subset;
- the same metrics on all official test rows, with the predeclared overlap
  caveat and identical model inputs;
- a paired bootstrap over input-defined connected components formed by shared
  normalized page hash, nonempty revision ID, or exact unordered sentence-pair
  hash, including component count, largest component, and row coverage; and
- a non-cherry-picked, seeded error sample described as qualitative analysis,
  without treating model or assistant interpretations as new human labels.

The component bootstrap is a dependence sensitivity, not a replacement primary
estimand. If it materially disagrees with the page-group interval, describe the
primary conclusion as sensitive/inconclusive rather than selecting the more
favorable interval. No strong external checkpoint is included in this locked
primary comparison: adding the released ALBERT checkpoint or another model
would require a separately frozen, matched inference plan rather than a
post-hoc choice after this result.

Only the primary contrast is confirmatory. Secondary analyses are reported
with support and uncertainty where implemented, without a multiplicity-based
discovery claim. Any new confirmatory endpoint, feature, exclusion, threshold,
model, or test rerun requires a new versioned plan and disclosure.

## Test access, stopping, and release rules

Before scoring, `run_vitaminc_locked.py freeze` must verify all source/data
hashes, full train/dev counts, clean-dev exclusions, saved-model replay,
predeclared test overlap counts, component diagnostics, and the marker in this
file. It writes an immutable local lock under ignored `.local-deployment/`.

`score` creates `TEST_ACCESS_STARTED.json` before parsing test labels and refuses
a second attempt. Score the frozen test once. If scoring fails after the marker,
retain the marker and all partial artifacts; do not delete it or silently rerun.
Report a failed or incomplete run. A successful run must retain per-row
predictions, the report, the lock hash, source/data hashes, runtime versions,
exact command, and hardware/time metadata.

A result is not evidence for the broader GMEE hypothesis unless a separate
GMEE human-gold study later supplies independent authenticated judgments for
relatedness, type, spans, and context. The local database's one-reviewer
labels and legacy machine labels remain exploratory. This public component path
reduces one blocker for a narrow benchmark result; it does not close the local
human-gold or event-disjoint natural-news gates.
