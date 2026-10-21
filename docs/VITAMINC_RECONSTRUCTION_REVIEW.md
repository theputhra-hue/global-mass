# Isolated reconstruction review — 20 October 2026

## Scope and provenance

This is a **same-team reconstruction from extracted source and newly installed
environments**. All original test results were known. It is not independent
researcher reproduction, a fresh held-out evaluation, external-domain
confirmation, or proof of current public download access.

The source was the original local review ZIP, SHA-256
`ddec00faeb82d0c9c5d61c1b0527d3813f396ea57c4d0bf95ce7942d3b63caa5`.
All 64 inventoried payload files were verified after extraction. An isolated
repository was initialized from those bytes with local commit
`80b82fdb78e80827854b18d22059e36c42e03a3d`. This is a new extraction identity,
not historical canonical HEAD `aa0056c3e81a012b942c4a1fc9cb278feaa5c3f8`.
The extracted source remains unchanged. No commit or push was made in the
canonical research checkout.

Inputs were the already acquired, hash-verified official VitaminC flagging
train/development/test files and pinned released ALBERT checkpoint. The Linux
container mounted inputs read-only; Windows runners only read those input paths.
The seven classical models were refitted, and ALBERT inference was repeated.
Original fitted states and predictions were supplied only to the subsequent
artifact comparison, never to fresh training. The exploratory combination uses
the **newly training-fitted** sparse vectorizer.

Local workspace:
`.local-deployment/reconstruction-20261020-v1/workspace/`.
New run directories use `repro-01-*` inside its ignored research-runs directory.
Original outputs and the original ZIP remain intact.

## Environment and documentation findings

1. The first README incorrectly described the primary environment as directly
   executable in the default Ubuntu WSL distribution. That distribution has
   Python 3.14.4 and could not execute the historical Python 3.11.2 virtual
   environment. The historical `/e/...` paths and recorded platform instead
   correspond to the Debian container on WSL2.
2. The verified image is
   `ghcr.io/omnirush-ai/box-base@sha256:f5946a636f4bee82c88b1b38380303a5e4f6ec6a196b19768ba183099b37c15e`.
   It supplies Python 3.11.2 and the recorded glibc 2.36 platform. Fresh package
   installation on the Windows bind mount was interrupted because of slow
   filesystem writes, before training or test access. That partial environment
   and its log were preserved.
3. A second fresh Linux environment was installed on the new Docker native
   volume `gmee-reconstruction-20261020-primary-v1`. Its 14 installed packages
   exactly match the recovered original inventory. The fresh Windows
   Python 3.14.6 environment matches all 14 original packages, and the fresh
   Windows Python 3.11.9 GPU environment matches all 26 original packages.
   New environments were installed from distributions, allowing package caches;
   original installed virtual environments were not copied.
4. GPU inference uses the existing NVIDIA GeForce RTX 4060 Laptop GPU, driver
   617.42, PyTorch 2.5.1+cu121 and the unchanged float32 configuration. Hardware
   and package versions do not constitute a universal bitwise-replay guarantee.
5. Both fresh classical environments passed the extracted bundle's 22 tests.
   The current canonical suite additionally includes eight focused comparison
   verifier tests: **30 passed**. Those tests exercise checks, not dataset
   performance.

`paper/README.md` now supplies the corrected container setup and fresh Windows
commands. `paper/environments/` contains recorded package-version inventories;
these are not wheel-hash locks. Setup scripts, retained install/experiment logs,
the interrupted setup, environment metadata and detailed provenance remain in
ignored local storage. During a later resumption, an attempted duplicate
mechanism fit was rejected by the existing-output guard before training or test
access. PowerShell redirection replaced that stage's training stdout log with
the refusal traceback; its fitted models, development predictions, frozen lock,
source snapshot, score log and results were unaffected. The local wrapper now
checks destinations before redirection. This log limitation is recorded in
`reconstruction-20261020-v1/resumption-audit.json`.

## Comparison protocol

The [comparison plan](VITAMINC_RECONSTRUCTION_PLAN_V1.md), SHA-256
`cfb6ef2ca334c81d264fe1d58e93e07b51f9b14039b97cfb8bcf7c396d9db970`,
was written before comparing freshly generated outputs. It requires exact
identity, eligibility, grouping, feature/vocabulary and selected-value agreement,
and reports all probability differences. Numeric bounds are `1e-10` for CPU
values and `1e-6` for GPU probabilities/checkpoint metrics. They are artifact
comparison tolerances, not scientific significance margins.

The verifier compares every clean/full metric and every existing bootstrap
contrast; checks development outputs, selection grids and fitted coefficients;
and verifies input, source-snapshot, copied-model, predecessor, manifest and
prediction hash chains. It emits no benchmark text or row identifiers.

The historical mechanism runner pins old predecessor lock hashes. The already
bundled, separately named reconstruction adapter accepts the new primary and
sparse locks, records itself in the new source snapshot, and preserves the
model recipes and checks. The verifier requires the base recipe and historical
source hashes to match, with only that pinned adapter added.

## Access-disclosure correction

The unchanged primary runner writes a historical sentence claiming no previous
per-row labels or model outcomes were viewed. In the new reconstruction lock
that sentence is inherited and **does not describe this team's knowledge**.
All original outcomes were known before reconstruction. The separate comparison
receipt binds the fresh lock digests and records this correction. New lock
timestamps establish artifact identity and fit-to-score consistency; they do
not create a new prospective experiment.

## Outcome

The full verification completed across all eight model configurations and their
reconstructed artifacts on 20 October 2026. All **1,491 verifier checks passed**
with zero failures (`paper/reconstruction_comparison.json`):

1. **Exact replay**: Max absolute error was `0.0` across all CPU and GPU metrics,
   predictions, thresholds, and probabilities, well within the declared `1e-10`
   CPU and `1e-6` GPU tolerances.
2. **GPU reproducibility**: The released ALBERT checkpoint scored byte-identical
   probabilities (`anchor_predictions.jsonl`, SHA-256
   `e223938634dcc504891b954f7921f9fd60152f5892dc9b9859ec96c8162fbeb0`) on the
   RTX 4060 Laptop GPU.
3. **Exploratory mechanism models**: Models A, B, C, and D trained via the
   explicit fresh-artifact adapter reproduced development replay with zero error
   and replicated the exact descriptive paired-bootstrap contrasts on clean test:
   `original33_minus_A` delta `0.06055994` (95% CI `[0.05186232, 0.06899128]`),
   and `D_minus_C` delta `0.02526674` (95% CI `[0.02132093, 0.02924439]`).
4. **Internal provenance chain**: All predecessor artifacts, source snapshots,
   data/model inputs, and lock hashes were verified without discrepancy.

This confirms artifact and numerical consistency of the entire eight-model
pipeline under fresh environments. As disclosed, this same-team reconstruction
demonstrates internal reproducibility; it does not replace independent researcher
replication or provide new held-out evidence.

The text-free comparison receipt has SHA-256
`64fd78d1700ab6a3d95722a390bcb18fa7e0e6fd53360be27e5a76e886366723`.
A later read-only verification again passed all 1,491 checks and reproduced that
receipt's content except its timestamp. It did not fit a model, perform
inference or redraw intervals. All seven development/test prediction files
(three development and four test files, covering eight models) are byte-identical
to their originals. Exact agreement is limited to the recorded software,
hardware and verified inputs.

