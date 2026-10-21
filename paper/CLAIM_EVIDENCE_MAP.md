# Manuscript claim and evidence map

Working review aid, updated 20 October 2026. Aggregate reports are copied into the local
review bundle under `evidence/aggregate/`. Original row-level records remain in
ignored storage. Each reported model is evaluated on the same 30,828 eligible
test cases; this does not make their training procedures identical.

| Claim | Evidence | Permitted interpretation |
|---|---|---|
| Lexical AUROC 0.7225; augmented AUROC 0.8116 | Primary report, `primary_clean`; prediction digest in the primary receipt | A gain for the combined 33-column implementation over the specified eight-feature baseline |
| Primary difference 0.0891, page interval [0.0761, 0.1020] | Primary report, `primary_comparison`; 2,000 paired group draws | Exceeds the local study margin under the specified row-weighted/page-resampled analysis; no demonstrated deployment utility |
| Component sensitivity interval [0.0756, 0.1024] | Primary report, `dependence_sensitivity` | Robustness to this additional observed-input grouping; no guarantee against unobserved event dependence |
| Sparse text AUROC 0.8205 | Sparse report, `primary_clean`; separate supplementary freeze and receipt | Richer edit text outperforms the augmented model on these rows; the comparison was designed after the primary outcome |
| Released ALBERT AUROC 0.9189 | Anchor report, `clean_test`; pinned checkpoint, manifest, prediction digest | A stronger same-test reference; no identical retraining or controlled efficiency comparison |
| Sparse + full 33 AUROC 0.8569 versus sparse + lexical 0.8317 | Feature-analysis report, `primary_clean`, models D and C; `descriptive_contrasts.D_minus_C` | Exploratory complementary ranking information for the fixed descriptor group, interval [0.0213, 0.0292]; no fresh confirmatory discovery or individual-rule validation |
| Original 33 versus analyzer-summary A difference 0.0606 | Feature-analysis report, `descriptive_contrasts.original33_minus_A` | Original gain is not explained solely by the five summaries retained in A; analyzer-derived A is not a pure untyped control |
| 234 dev and 220 test rows excluded | Data audit and original lock; exact page/revision/unordered-pair identity rules | Concrete overlap removal, not event-disjoint or fully independent evaluation |
| Repeated and reversed inputs remain | Post-test review: 438 unordered groups/953 rows have both labels across reversed orders; none conflict for an identical ordered pair | An observed representation-level label conflict whose cause was not adjudicated |
| Qualitative failure hypotheses | Fixed 24-error sample and text-free notes | AI-assisted hypotheses, not human adjudication, validated error categories, or prevalence estimates |
| Same-team artifact reconstruction | Comparison receipt SHA-256 64fd78d1700ab6a3d95722a390bcb18fa7e0e6fd53360be27e5a76e886366723; 1,491 checks passed, all measured differences zero; seven prediction files byte-identical | Reproducibility of recorded computation on verified existing inputs and hardware; no independent replication or new held-out evaluation |
| Broader GMEE news system | No suitable local consensus gold or event split | No validated relatedness, type/span/context, truth, or propagation claim |

## Research design chronology

1. Exploratory full train/development fitting and input-only dependence audit.
   One aggregate test-label summary was exposed before the primary freeze.
2. Primary two-model analysis locally frozen, then scored once.
3. Sparse text comparison specified/frozen after the primary result, then scored.
4. Released checkpoint recipe frozen after primary and sparse results, then
   scored; metrics computed from its saved probabilities.
5. Feature-family/sparse-complement analysis designed after all four results.
   Its recipe and all outcomes must be reported as exploratory.
6. Same-team reconstruction repeated the fixed computation in fresh environments
   after all original outcomes were known. Independent researcher replication
   remains open.

The exact source snapshots and timestamps support this chronology. They are
local records, not externally registered protocols. Checks of saved metrics are
arithmetic verification, not independent experimental reproduction or human
peer review.

