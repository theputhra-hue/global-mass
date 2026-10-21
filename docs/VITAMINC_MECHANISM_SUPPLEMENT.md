# Exploratory feature-family and sparse-complement supplement

**19 October 2026. Fixed recipe before this supplement's fit and score.**
The original primary, sparse comparator, and ALBERT test outcomes have already
been seen. This supplement is post-primary, post-sparse, and post-anchor. It is
exploratory; it neither changes the original local analysis freeze nor supplies
a confirmatory or causal mechanism test. Every result will be retained.

## Fixed questions and four models

Use raw ordered `sent_a` and `sent_b` and the existing deterministic feature
extractor without changes. The original eight lexical features are shared.

| ID | Input features | Purpose |
|---|---|---|
| A | Eight lexical features, `gmee_similarity`, and changed/insert/delete/replace span counts (13 columns) | Assess the information in these five analyzer-derived summary values |
| B | Eight lexical features plus the other 20 GMEE features (28 columns) | Describe the complementary feature partition |
| C | Frozen sparse edit TF-IDF plus the eight standardized lexical values | Matched sparse-plus-lexical reference |
| D | The same sparse edit TF-IDF plus all 33 standardized lexical/GMEE values | Assess complementary information beyond the sparse-plus-lexical reference |

A is not a pure untyped edit baseline: its similarity and span counts come from
the same analyzer, whose behavior can depend on typed rules. B contains
meaningful-change and quantity-equivalence indicators as well as type presence
and count features. Feature groups can be correlated or redundant; these
comparisons cannot validate individual rule labels, spans, quantities, or causal
mechanisms. The original 33-column model is reused from its existing saved
predictions for the first contrast, not refit.

## Fixed training and development selection

Use all 236,998 official train rows and the same 36,390 clean dev rows produced
by the frozen `load_train_dev`, excluding the same 234 rows. Train/dev identities
and source bytes must match the audited release. Do not read test inputs or
primary prediction records during this stage; prior artifact files may be
hashed to bind their exact bytes.

Reuse the sparse baseline's saved training-only TF-IDF vectorizer after checking
its frozen pipeline SHA-256 and sparse lock. Its vocabulary/IDF is not refit.
Transform the same old/new edit tokens using that vectorizer. StandardScaler is
fitted only on train dense columns; development and test only transform. For C
and D, concatenate the vectorizer's existing L2-normalized sparse rows with the
standardized dense columns using CSR hstack. Do not rescale sparse columns or
normalize the concatenated row. Each model uses a new L2 logistic regression,
liblinear, maximum 1,000 iterations, seed 1729, no class weights. Select C from
{0.01, 0.1, 1, 10} by clean-dev AUROC; ties rounded to 12 decimals choose smaller
C. Choose the operating threshold on 0.00..1.00 in steps of .01 by clean-dev
macro-F1, ties choosing the larger threshold. Stop on any convergence warning.

Freeze model states, vectorizer, dev predictions and identities, all transitive
local research dependencies (including the analyzer and quantity parser), this
plan, data hashes, runtime versions, and primary/sparse/anchor artifact hashes.
Archive exact source copies and validate both current and archived copies before
scoring. Preserve the original frozen files.

## Fixed scoring and reporting

Run the score stage only after the fit/freeze has been reviewed. Retain one
test-access marker with the fit directory so another output directory cannot
silently repeat the run. Recompute the original input-only exclusion rule and
verify test IDs, labels, page/revision/pair identities and eligibility against
the original primary records and frozen eligibility hashes. Score all four
models on the same 30,828 clean rows and all 31,048 official rows. Save every
probability and report support, AUROC, average precision, macro-F1 at the dev
threshold, Brier score, log loss, and confusion matrices.

Exactly two descriptive paired normalized-page bootstrap contrasts use 2,000
draws and seed 20261019: original 33-feature AUROC minus A AUROC, and D AUROC
minus C AUROC. Report percentile 95% intervals without acceptance margins,
significance decisions, confirmatory fields, or multiplicity-adjusted discovery
claims. Model B and other metrics are descriptive. Do not adapt the recipe to
the new test outcomes. Record timings as execution provenance only; these
workloads do not support matched efficiency claims.
