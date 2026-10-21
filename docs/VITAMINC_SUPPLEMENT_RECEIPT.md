# Supplementary comparison receipt

These additions occur after the primary test result was known. They do not
replace the primary protocol or support additional confirmatory discoveries.
The published ALBERT anchor was named in the original pilot proposal but was
excluded from the executed primary lock; its later execution is supplementary.

## Sparse text baseline freeze, before sparse test prediction

19 October 2026: trained on all 236,998 official train rows; selected using
36,390 clean dev rows. Fixed sparse edit TF-IDF recipe is in
`VITAMINC_TEXT_BASELINE_SUPPLEMENT.md`. Selected C=1 and dev macro-F1 threshold
0.37; vocabulary size 90,341. The development AUROC was 0.826471, which is
model-selection evidence only. No convergence warning occurred.

- Local fit: `.local-deployment/research-runs/vitaminc-sparse-fit-v1`.
- Lock SHA-256: `8fda206c919c1108df8c7dd60983bf0fce198f0431b24d7572b86f022dad2dbf`.
- Plan SHA-256: `78ae5dd4d4c5415b2978dad979f77079f2821349285dadb494f0cf478f0f21b1`.
- Pipeline SHA-256: `b71a1acb3170f046c271654ae8edcee5854f543bcc09278c53acf0c0d12ca615`.
- Main result SHA-256: `15e18b6290e6bccc71a83f3fdde4f9f93a6732964ed7a6498ec5a20260b718fd`.

The original train/dev hashes still matched after fitting. A focused synthetic
test verified directionality, empty additions/deletions and punctuation-only
controls. No sparse test scores had been generated when this record was saved.
The subsequent result must be appended with its access timestamp and hashes.

## Sparse result, first saved test access

The test marker records `2026-10-19T08:24:22.692268+00:00`. The sparse baseline
scored all 31,048 official rows, including the identical 30,828 primary-eligible
rows. Clean AUROC was **0.82048751**, average precision **0.68537104**, and
macro-F1 **0.73637558** at the dev-selected threshold of 0.37. The GMEE-minus-sparse
AUROC difference was **-0.00886336**, with descriptive paired page-bootstrap
95% interval **[-0.01809223, -0.00061811]** (2,000 valid draws).

This supplementary result favors the richer text baseline on the evaluated
release. It limits the original positive result to an improvement over lexical
summary features; it does not support a best-performing method claim. No feature
or model was changed in response to this result. Full-release metrics are saved
separately in the report. The sparse implementation is not a reproduction of the
authors' BOW neural model.

- Output: `.local-deployment/research-runs/vitaminc-sparse-score-v1`.
- Predictions SHA-256: `b360e65b078c2ff646a295abd71178e964d988c314512e071424c45d5c3a5593`.
- Results SHA-256: `29bb3d50f0621c3e38ad23206ec75c4ece827d3fca32e78dd3d53dfe8cdb0a03`.
- Training/dev selection: 37.62 seconds; saved test inference measurement:
  2.31 seconds including model load and text preprocessing on this Windows run.
  These are workload-specific measurements, not a controlled speed comparison
  against the WSL primary run or a GPU anchor.

## Published checkpoint freeze, before anchor test prediction

The fixed GPU recipe and standalone source passed a 100-row clean-dev timing
check: 1.063 seconds for timed inference and token-length audit; maximum absolute
probability difference from the earlier float32 CPU pilot was `2.265e-6`.
This checked numerical feasibility, not accuracy. The GPU is an RTX 4060 Laptop;
the recipe is float32, batch 32, max length 256, TF32 disabled, threshold 0.5.

The supplementary anchor freeze was saved at `2026-10-19T09:02:34.599492+00:00`
under `.local-deployment/research-runs/vitaminc-anchor-lock-v1` before anchor
test prediction. Lock SHA-256 is
`c91d745f0efae61f83ce48d66efc25a43835cb1935cf246b8ad58bc468b252fe`;
script SHA-256 is `2ec9fb0973053f0e536935e922d6cb33d7725e53e78da8981617753f900c5bc2`.
The lock binds the checkpoint recipe, plan, source, test bytes, original lock,
and primary predictions/report. Its scores remain supplementary because the
primary and sparse results were already known. No checkpoint or threshold was
selected from those results.

## Published checkpoint result, first saved test access

The access marker is `2026-10-19T09:02:50.862090+00:00`. The one inference run
completed all 31,048 rows with matching case identities and eligibility. The
separate summary implementation calculated the metrics specified by the frozen
plan from saved probabilities; it performed no inference or model selection.

| Population | Rows | AUROC | Average precision | Macro-F1, threshold 0.5 | Brier | Log loss |
|---|---:|---:|---:|---:|---:|---:|
| Original clean subset | 30,828 | 0.91893356 | 0.85100215 | 0.83167484 | 0.11104521 | 0.34142127 |
| Full release, overlaps retained | 31,048 | 0.91911321 | 0.85012809 | 0.83167944 | 0.11083376 | 0.34060105 |

Clean confusion matrix (true rows, predicted columns; not factual then factual)
is `[[16042,3493],[1484,9809]]`. Full confusion is
`[[16214,3516],[1489,9829]]`. The fixed 0.5 threshold differs from the
development-selected thresholds used by the locally trained models. The
checkpoint is a released author-trained model, not a locally retrained model
under the identical development exclusion rule.

The checkpoint outperforms both the deterministic augmented and sparse models
on this same test subset. The primary result remains a gain over lexical
summaries; it does not establish a competitive method. This is a post-primary
descriptive comparison, with no additional confirmatory interval or claim.

- Output: `.local-deployment/research-runs/vitaminc-anchor-score-v1`.
- Predictions SHA-256: `e223938634dcc504891b954f7921f9fd60152f5892dc9b9859ec96c8162fbeb0`.
- Inference manifest SHA-256: `f2ac5d8ed8c407eeaa549c6af0f98b0838142455f5b098931db28549c485b241`.
- Results SHA-256: `90faaf3520ce9e9b701c7c46b59d40db0408f333fe5b9ddc70d84a49d87f63fb`.
- Summary script SHA-256: `00509f9438b2342595302e21100e56599d14b77b73e8b1b42f4caf499082ad8b`.
- Prediction time: 374.152 seconds, including the untruncated token-length
  audit, excluding checkpoint load and warmup; peak allocated CUDA memory
  521,688,576 bytes on NVIDIA GeForce RTX 4060 Laptop GPU. This is not a matched
  end-to-end speed comparison with the other models.
- Truncation: 295 rows exceeded the fixed 256-token limit, all in the clean
  subset; longest untruncated pair was 7,790 tokens. Actual inference applied
  the frozen truncation rule. Token-length audit warnings do not mean that
  overlength input was passed to the model.

The primary/sparse/anchor predictions are preserved separately. No model was
changed or selected in response to these results.
