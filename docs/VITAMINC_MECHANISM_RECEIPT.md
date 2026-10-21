# Exploratory feature analysis receipt

## Fit and review before this supplement's test inference

The primary, sparse, and ALBERT outcomes were already known when this analysis
was designed. Its recipe is fixed in `VITAMINC_MECHANISM_SUPPLEMENT.md` and its
interpretation is exploratory throughout. All four models will be reported.

The fit completed on 19 October 2026, lock timestamp
`2026-10-19T15:32:20.462282+00:00`. It read the full 236,998 train and 36,390
overlap-filtered development rows. It hashed prior prediction files to bind
their bytes, without parsing their rows during model selection.

| ID | Features | Selected C | Dev AUROC | Dev-selected threshold |
|---|---|---:|---:|---:|
| A | Lexical 8 + five analyzer summaries | 0.01 | 0.74242328 | 0.36 |
| B | Lexical 8 + remaining 20 descriptors | 0.01 | 0.80351682 | 0.40 |
| C | Frozen sparse edit text + standardized lexical 8 | 1 | 0.83924474 | 0.34 |
| D | Frozen sparse edit text + standardized full 33 | 1 | 0.86464506 | 0.39 |

Development scores are selection evidence, not held-out test findings. Three
focused synthetic tests checked the feature partition, train-only scaling with
unchanged sparse rows, and rejection of mutated frozen artifacts. The saved
models replayed all development probabilities with maximum absolute error 0
for every model. Training/selection took 377.227 seconds; this is provenance,
not a controlled efficiency comparison.

- Fit directory: `.local-deployment/research-runs/vitaminc-mechanism-fit-v1`.
- Lock SHA-256: `b0094d747787768135cf5c1707ea92a690e9d17a55dadb4e501efd219fc41d71`.
- Models SHA-256: `4ce78080aa0939765ae2dff8f1fc87bb9d46ed63a396bbc3a510f245c101dc87`.
- Runtime: Windows Python 3.14.6, NumPy 2.5.4, SciPy 1.18.1,
  scikit-learn 1.9.1, RapidFuzz 3.14.6, joblib 1.6.0.

Before test inference, root reviewed the feature/selection/scoring code and
validated all 13 frozen source dependencies, archived copies, data bytes, model
and development-output hashes, prior artifact hashes, runtime, and development
identity digest. No test-access marker existed at that review. The score stage
will verify original eligibility and use a one-time marker. No frozen source
or parameter was changed during the fit or review.

## Reconstruction limitation

This v1 runner deliberately requires the two original primary/sparse lock
digests. New timestamped reconstructions produce different digests. Therefore
the exact v1 script is an original-artifact continuation, not a standalone
fresh-checkout reproduction command. A separate explicit-digest adapter, `reconstruct_vitaminc_mechanism.py`, now
records new lock identities and its source in new reconstruction freezes. Two
focused provenance/validation tests passed; a complete independent
reconstruction remains unperformed. The historical runner and results are unchanged.

## First saved test result

The test-access marker is `2026-10-19T15:32:53.457312+00:00`. The single score
completed all 31,048 original cases with 30,828 original eligible cases. The
eligibility and input identities matched the original freeze.

| Model | Clean AUROC | Average precision | Macro-F1 | Brier | Log loss | Full-release AUROC |
|---|---:|---:|---:|---:|---:|---:|
| A, lexical + five analyzer summaries | 0.75106422 | 0.59585458 | 0.67231872 | 0.19660097 | 0.57639862 | 0.75266164 |
| B, lexical + remaining descriptors | 0.79705484 | 0.63265443 | 0.71967147 | 0.17867292 | 0.52261921 | 0.79744972 |
| C, sparse + lexical | 0.83167508 | 0.69602901 | 0.75133625 | 0.16449289 | 0.50043244 | 0.83076664 |
| D, sparse + full 33 | 0.85694182 | 0.71975002 | 0.76794848 | 0.15007818 | 0.44961911 | 0.85755183 |

The two fixed descriptive paired page-bootstrap contrasts, each with 2,000
valid draws over 4,196 groups, were:

- Original 33-feature model minus A: **0.06055994**, 95% interval
  **[0.05186232, 0.06899128]**.
- D minus C: **0.02526674**, 95% interval **[0.02132093, 0.02924439]**.

The first result indicates that the combined original gain is not explained
solely by the five analyzer summaries included in A. The second suggests
complementary ranking information from the 25 descriptors beyond this fixed
sparse-plus-lexical recipe. Neither result validates individual type labels,
establishes a causal semantic mechanism, or confirms transfer. ALBERT remains
stronger on the same test subset. No model or rule was changed after this score.

- Results SHA-256: `f44bb6bc4a16f3fe081ad07c36e62d0e0ba45e70675f0d6fb194492c9beee300`.
- Predictions SHA-256: `3a91dca53f8665fc340e9ea41a6bd92433a02424db8e6d15df97c3eae72de3bd`.
- Score directory: `.local-deployment/research-runs/vitaminc-mechanism-score-v1`.

A separate metric computation using saved probabilities checked all four models
on both populations: support, eligibility, row identities, confusion matrices,
AUROC, average precision, macro-F1, Brier and log loss agreed within
`2.23e-16`. It verified the lock and prediction hashes. This was arithmetic
verification without new inference or a bootstrap redraw.
