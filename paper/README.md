# VitaminC component study: reproduction guide

This directory contains a **local working manuscript**, references and aggregate
figures for factual revision flagging on VitaminC. It does not validate the full
GMEE natural-news system. The package has not been publicly released or
independently reproduced. Do not push it to GitHub without the user's permission.

The 20 October **same-team reconstruction is complete**: all eight models'
predictions replayed exactly, with 1,491 comparison checks passing. See the
[reconstruction review](../docs/VITAMINC_RECONSTRUCTION_REVIEW.md) and
[machine-readable receipt](reconstruction_comparison.json). This is separate
from independent researcher replication and new held-out confirmation.

Start with [manuscript.md](manuscript.md), [review gaps](REVIEW_GAPS.md), the
[primary analysis plan](../docs/VITAMINC_ANALYSIS_PLAN_V1.md), and the
[data audit](../docs/VITAMINC_DATA_AUDIT.md). The
[primary receipt](../docs/VITAMINC_COMPONENT_RESULT_RECEIPT.md),
[supplement receipt](../docs/VITAMINC_SUPPLEMENT_RECEIPT.md), and
[post-test review](../docs/VITAMINC_POSTTEST_REVIEW.md) document the evidence.

## What was measured

The official release contains 236,998 train, 36,624 dev and 31,048 test rows.
Input-only overlap checks quarantine 234 dev and 220 test rows using normalized
page title, revision ID, or exact unordered sentence pair. All comparisons below
use the same **30,828 eligible test rows**; full-release metrics are retained
separately. The model input is an **ordered** before/after pair. Unordered
identity grouping is an exclusion/dependence rule, not a claim that reversing
an edit preserves its label.

| Model | Clean-test AUROC | Analysis status |
|---|---:|---|
| Eight lexical summaries + logistic regression | 0.7225 | Original locked comparison |
| Lexical + 25 GMEE descriptors + logistic regression | 0.8116 | Original locked comparison |
| Sparse edit TF-IDF + logistic regression | 0.8205 | Supplement after primary results |
| Published ALBERT checkpoint | 0.9189 | Supplement after primary results |
| Lexical + five analyzer summaries (A) | 0.7511 | Later exploratory feature partition |
| Lexical + remaining 20 descriptors (B) | 0.7971 | Later exploratory feature partition |
| Sparse text + lexical 8 (C) | 0.8317 | Later exploratory combination |
| Sparse text + full 33 (D) | 0.8569 | Later exploratory combination |

The predeclared primary AUROC difference is 0.0891, with paired page-bootstrap
95% interval [0.0761, 0.1020]. This supports an improvement over the lexical
summaries on this component task. The stronger supplementary baselines limit
the claim. The local hash freeze is **not external preregistration**; the
manuscript discloses the pre-freeze exposure to an aggregate test-label count.

## Inputs and access

- Obtain the **revision-flagging** archive from the
  [authors' official repository](https://github.com/TalSchuster/VitaminC#revision-flagging),
  not the separate `vitaminc_real` claim-verification dataset. The audited
  [commit-pinned ZIP](https://raw.githubusercontent.com/TalSchuster/talschuster.github.io/152c9639f1e33ca295d0776b618c17884088f72f/static/vitaminc_flagging.zip)
  has SHA-256 `7e13400c6c2f1aeca8a084eedbdbb3dff797d3660c93b9229fdeb85ebd82006e`.
  Follow the download/extraction and member-hash checks in the data audit.
- Expected local data directory:
  `.local-deployment/research-data/vitaminc/extracted/vitaminc_flagging`, containing
  `train.jsonl`, `dev.jsonl`, `test.jsonl`, `LICENSE`, and `README.txt`.
- Obtain [tals/albert-base-vitaminc_flagging](https://huggingface.co/tals/albert-base-vitaminc_flagging/tree/1e5f38d76c4d9402bf0c7d73e1aab6eaafca0ea8)
  at revision `1e5f38d76c4d9402bf0c7d73e1aab6eaafca0ea8`. Place `config.json`,
  `pytorch_model.bin`, `spiece.model`, `tokenizer_config.json` and
  `special_tokens_map.json` in
  `.local-deployment/research-data/vitaminc/anchor_model`. Exact file hashes and
  inference settings are in [vitaminc_anchor.json](../evaluation/config/vitaminc_anchor.json);
  the inference runner verifies each file before loading it.

Raw text, row-level predictions, fitted models, case identifiers, local human
votes and source database exports remain in ignored local storage. Data rights
review is pending; the code license does not grant blanket redistribution rights
to Wikipedia-derived content. The manuscript, bibliography, aggregate figures,
text-free receipts and scripts are the proposed shareable portion, subject to
release review. No public data or artifact hosting is claimed here.

## Recorded execution environments

Run commands from a separate extracted source checkout. The historical
canonical workspace was `E:\global-main\global-mass-integration`. The baseline Git HEAD is
`aa0056c3e81a012b942c4a1fc9cb278feaa5c3f8`; the research changes were uncommitted,
so **HEAD alone cannot reconstruct the experiment**. Each lock stores hashes and
copies of the actual research sources. Preserve those sources and their runtime
metadata together.

| Workload | Recorded runtime | Existing local interpreter |
|---|---|---|
| Primary train/dev fit, freeze, test and bootstrap | Debian container on WSL2; Python 3.11.2; NumPy 2.2.6; SciPy 1.15.3; scikit-learn 1.7.2; RapidFuzz 3.14.3 | `.local-deployment/research-venv-linux/bin/python` inside the recorded container |
| Sparse train/dev fit and test; saved-anchor metric summary | Windows Python 3.14.6; NumPy 2.5.4; scikit-learn 1.9.1 | `.local-deployment/research-venv/Scripts/python.exe` |
| ALBERT inference | Windows Python 3.11.9; PyTorch 2.5.1+cu121; Transformers 4.46.3; CUDA, float32, RTX 4060 Laptop | `.local-deployment/research-data/vitaminc/anchor_gpu_venv/Scripts/python.exe` |

The installed-package inventories are in `paper/environments/primary-linux.txt`,
`supplement-windows.txt`, and `anchor-windows.txt`. They pin package versions,
including SciPy, RapidFuzz and joblib used by shared helpers. They are not
wheel-hash locks or substitutes for the OS, interpreter and hardware settings.
The ALBERT runner enforces the pinned
Python/PyTorch/Transformers versions, tokenizer/model classes and CUDA recipe;
it does not silently fall back to CPU. Hardware, precision and measured workloads
differ across runs, so their timings are not a controlled speed comparison.

### Fresh environment setup

The first guide incorrectly suggested executing the Linux environment directly
in the default Ubuntu WSL distribution. The 20 October reconstruction found
that distribution used Python 3.14.4 and could not execute the old Python 3.11.2
environment. Use the verified container image:
`ghcr.io/omnirush-ai/box-base@sha256:f5946a636f4bee82c88b1b38380303a5e4f6ec6a196b19768ba183099b37c15e`.

Verify the ZIP inventory before extracting to a new directory. The primary
freeze invokes `git rev-parse HEAD`; an extracted ZIP therefore needs a local
Git repository and commit. Use `git init`, set `core.autocrlf=false`, exclude
`.local-deployment/`, and commit the extracted source using the reviewer's local
identity. Record that commit as a reconstruction identity, not the historical
baseline HEAD. Keep the original ZIP and source hashes.

From that extracted checkout, launch a shell with the source writable and
verified data/checkpoint inputs mounted read-only. In PowerShell:

```powershell
$replaySource = (Get-Location).Path
# Set this to the verified VitaminC directory containing extracted/ and anchor_model/.
$replayInputs = (Resolve-Path 'PATH_TO_VERIFIED_VITAMINC_INPUTS').Path
docker run --rm -it --mount "type=volume,source=gmee-paper-repro-01-venv,target=/venv" --mount "type=bind,source=$replaySource,target=/workspace" --mount "type=bind,source=$replayInputs,target=/inputs,readonly" --workdir /workspace --entrypoint /bin/bash ghcr.io/omnirush-ai/box-base@sha256:f5946a636f4bee82c88b1b38380303a5e4f6ec6a196b19768ba183099b37c15e
```

Inside that container:

```bash
/usr/bin/python3.11 -m venv /venv
/venv/bin/python -m pip install -r paper/environments/primary-linux.txt
git config --global --add safe.directory /workspace
/venv/bin/python -m pytest evaluation/tests -q
```

Choose an unused Docker volume name for each fresh environment. The named
volume persists after the container exits. Native Docker storage avoids slow
package installation through the Windows bind mount; the first reconstruction
installation on that mount was interrupted before training and retained.

For the Windows supplements, use `uv` with installed Python 3.14.6 and 3.11.9
interpreters. These commands create new environments from package distributions;
they do not copy the original environments:

```powershell
uv venv --python 3.14.6 .local-deployment/supplement-venv
uv pip install --python .local-deployment/supplement-venv/Scripts/python.exe -r paper/environments/supplement-windows.txt
uv venv --python 3.11.9 .local-deployment/anchor-venv
uv pip install --python .local-deployment/anchor-venv/Scripts/python.exe -r paper/environments/anchor-windows.txt --extra-index-url https://download.pytorch.org/whl/cu121 --index-strategy unsafe-best-match
.local-deployment/supplement-venv/Scripts/python.exe -m pytest evaluation/tests -q
```

The reconstruction used the existing RTX 4060 Laptop GPU with NVIDIA driver
617.42. GPU availability, precision and package checks are enforced before
inference. Record `uv pip freeze`, `pip freeze`, interpreter versions and
hardware details for any new run.

## Preserve the original evidence

These directories are relative to `.local-deployment/research-runs/`:

| Artifact | Original directory |
|---|---|
| Full primary train/dev fit | `vitaminc-pilot-full-train-dev-linux-20261019` |
| Primary lock and source archive | `vitaminc-lock-v1-20261019` |
| Primary predictions, metrics and uncertainty | `vitaminc-score-v1-20261019` |
| Sparse fit, lock and source archive | `vitaminc-sparse-fit-v1` |
| Sparse predictions and metrics | `vitaminc-sparse-score-v1` |
| ALBERT lock and source archive | `vitaminc-anchor-lock-v1` |
| ALBERT predictions, manifest and metrics | `vitaminc-anchor-score-v1` |

Do not delete `TEST_ACCESS_STARTED.json`, bypass an existing-output error, edit a
frozen source/plan/config, or overwrite these directories. A rerun must use a
fresh fit, fresh lock and fresh score destination. Retain failed attempts too.
New timestamps, paths, runtime details or GPU arithmetic can change artifact
hashes; the original receipts identify the original evidence, not a promise of
byte-identical regenerated reports.

## Reconstruction commands

These interfaces were exercised in the complete same-team reconstruction, using
the environment and path settings documented above. Use a new suffix instead of
`repro-01` whenever any destination already exists. Set up the corresponding
environment above first. Keep each fit, freeze and score on the same source and
runtime; the guards will reject changes between those steps.

The unchanged primary runner copies its original test-access disclosure into a
new lock. That historical sentence does not describe a reconstruction performed
after the outcomes were known. Bind the fresh locks to a separate receipt that
records prior exposure, new artifact identities and the comparison result.
Fresh timestamps establish artifact consistency, not a new prospective test.
The [reconstruction plan](../docs/VITAMINC_RECONSTRUCTION_PLAN_V1.md) fixes the
identity checks and numerical bounds for the 20 October check.

### 1. Primary comparison — shell inside the pinned container

```bash
cd /workspace
research_python=/venv/bin/python
research_data=/inputs/extracted/vitaminc_flagging
research_runs=.local-deployment/research-runs

"$research_python" evaluation/scripts/run_vitaminc_pilot.py --data-dir "$research_data" --output-dir "$research_runs/repro-01-primary-fit" --seed 1729
"$research_python" evaluation/scripts/run_vitaminc_locked.py freeze --data-dir "$research_data" --fitted-dir "$research_runs/repro-01-primary-fit" --protocol docs/VITAMINC_ANALYSIS_PLAN_V1.md --output-dir "$research_runs/repro-01-primary-lock"
"$research_python" evaluation/scripts/run_vitaminc_locked.py score --data-dir "$research_data" --locked-dir "$research_runs/repro-01-primary-lock" --output-dir "$research_runs/repro-01-primary-score"
```

Do not pass the pilot's `--max-train` or `--max-dev` options for the full
comparison. The freeze requires all train rows and the audited clean-dev count.
Training selects hyperparameters and thresholds on dev. The score command
produces both clean/full metrics and the specified 2,000-draw paired bootstrap.

### 2. Sparse supplement — PowerShell

```powershell
# Run from the extracted source checkout on Windows.
$researchPy = '.local-deployment/supplement-venv/Scripts/python.exe'
$researchData = Join-Path $replayInputs 'extracted/vitaminc_flagging'
$researchRuns = '.local-deployment/research-runs'
$researchPrimary = "$researchRuns/repro-01-primary-score"

& $researchPy evaluation/scripts/run_vitaminc_sparse.py train --data-dir $researchData --primary-dir $researchPrimary --output-dir "$researchRuns/repro-01-sparse-fit"
& $researchPy evaluation/scripts/run_vitaminc_sparse.py score --data-dir $researchData --primary-dir $researchPrimary --fitted-dir "$researchRuns/repro-01-sparse-fit" --output-dir "$researchRuns/repro-01-sparse-score"
```

The fixed recipe is in the
[sparse supplement plan](../docs/VITAMINC_TEXT_BASELINE_SUPPLEMENT.md).
The supplement inherits the primary row eligibility and binds its prediction
and result hashes. Its comparison interval is descriptive.

### 3. Published checkpoint supplement — PowerShell

Continue with the PowerShell variables above:

```powershell
$researchGpuPy = '.local-deployment/anchor-venv/Scripts/python.exe'
$researchModel = Join-Path $replayInputs 'anchor_model'

& $researchGpuPy evaluation/scripts/run_vitaminc_anchor.py freeze --data-dir $researchData --model-dir $researchModel --primary-dir $researchPrimary --output-dir "$researchRuns/repro-01-anchor-lock"
& $researchGpuPy evaluation/scripts/run_vitaminc_anchor.py predict --data-dir $researchData --model-dir $researchModel --primary-dir $researchPrimary --frozen-dir "$researchRuns/repro-01-anchor-lock" --output-dir "$researchRuns/repro-01-anchor-score"
& $researchPy evaluation/scripts/summarize_vitaminc_anchor.py --primary-dir $researchPrimary --anchor-dir "$researchRuns/repro-01-anchor-score" --frozen-dir "$researchRuns/repro-01-anchor-lock"
```

The [anchor supplement plan](../docs/VITAMINC_ANCHOR_SUPPLEMENT.md) fixes ordered
raw sentences, 256-token truncation, batch 32 and threshold 0.5. The final
command aggregates saved probabilities; it performs no inference and refuses
to overwrite an existing summary. The historical 100-row dev timing check used
an ignored CPU-reference CSV; the runner's `pilot` command requires that local
file and is not a self-contained public pilot recipe. It was a feasibility
check, not model/threshold selection. The commands above reconstruct the fixed
test recipe without claiming to reconstruct that pilot.

### 4. Exploratory feature analysis - explicit fresh-artifact adapter

The original `run_vitaminc_mechanism.py` is frozen with historical primary and
sparse lock digests. Preserve it. For a fresh reconstruction, the separate
`reconstruct_vitaminc_mechanism.py` adapter accepts the digests of the newly
created locks. It records those identities and its own source in the new freeze;
model recipes and all validation/one-access guards remain unchanged. It must
receive the same two digests for training and scoring. The adapter passed its
focused tests and the complete same-team reconstruction. Independent researcher
replication remains unperformed.
The original experiment's result is documented in the
[feature-analysis receipt](../docs/VITAMINC_MECHANISM_RECEIPT.md).

Continue with the fresh reconstruction paths from the previous commands:

```powershell
$mechanismPrimaryHash = (Get-FileHash -Algorithm SHA256 "$researchRuns/repro-01-primary-lock/lock.json").Hash.ToLowerInvariant()
$mechanismSparseHash = (Get-FileHash -Algorithm SHA256 "$researchRuns/repro-01-sparse-fit/lock.json").Hash.ToLowerInvariant()
$mechanismArgs = @(
  '--expected-primary-lock-sha256', $mechanismPrimaryHash,
  '--expected-sparse-lock-sha256', $mechanismSparseHash,
  '--data-dir', $researchData,
  '--primary-dir', $researchPrimary,
  '--primary-lock-dir', "$researchRuns/repro-01-primary-lock",
  '--sparse-fit-dir', "$researchRuns/repro-01-sparse-fit",
  '--sparse-score-dir', "$researchRuns/repro-01-sparse-score",
  '--anchor-dir', "$researchRuns/repro-01-anchor-score"
)
& $researchPy evaluation/scripts/reconstruct_vitaminc_mechanism.py train @mechanismArgs --output-dir "$researchRuns/repro-01-mechanism-fit"
# Inspect the saved fit, sources, development replay and lock before scoring.
& $researchPy evaluation/scripts/reconstruct_vitaminc_mechanism.py score @mechanismArgs --fitted-dir "$researchRuns/repro-01-mechanism-fit" --output-dir "$researchRuns/repro-01-mechanism-score"
```

This does not modify or impersonate the historical evidence. It is still an
exploratory study on an exposed benchmark. Original artifacts are in
`vitaminc-mechanism-fit-v1` and `vitaminc-mechanism-score-v1`. The D-minus-C gain
is 0.0253 AUROC, descriptive page interval [0.0213, 0.0292]. The feature groups
are predictive descriptors, not independently validated semantic explanations.

## Build the manuscript from saved evidence

Figure generation needs Python with NumPy, scikit-learn and Matplotlib. It reads
saved predictions and performs no model inference. From the repository root,
using the **original** local evidence for the current draft:

```powershell
python evaluation/scripts/build_vitaminc_figures.py --primary-dir .local-deployment/research-runs/vitaminc-score-v1-20261019 --sparse-dir .local-deployment/research-runs/vitaminc-sparse-score-v1 --anchor-dir .local-deployment/research-runs/vitaminc-anchor-score-v1 --output-dir paper/figures
```

To inspect a reconstruction, point the three inputs to its fresh score
directories and use a separate output directory. The figure manifest records
source hashes and aggregate metrics. The paper PDF builder expects the current
draft's figures in `paper/figures`.

The PDF builder uses ReportLab and pypdf. On this machine the working command is:

```powershell
& 'C:/Users/rsaip/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe' paper/build_manuscript_pdf.py
```

It writes `output/pdf/gmee_vitaminc_manuscript.pdf` and a build manifest. The
bundled interpreter path is machine-specific. A separate Python installation
with `reportlab` and `pypdf` can run the script, but its current font paths require
Windows Times New Roman files under `C:/Windows/Fonts`; adapt the **presentation
builder** explicitly for another platform. No experiment source needs to change.
This is a readable review draft, not a venue-formatted submission.

Render and visually inspect every page after manuscript/figure changes:

```powershell
New-Item -ItemType Directory -Force output/pdf/render | Out-Null
pdftoppm -scale-to 1100 -png output/pdf/gmee_vitaminc_manuscript.pdf output/pdf/render/page
```

Poppler supplies `pdftoppm`. Check tables, figures, citations, headers, page
breaks and absence of clipping. The manuscript's scientific claims, author
metadata, rights review, final venue format and unresolved contribution questions
still need the review recorded in [REVIEW_GAPS.md](REVIEW_GAPS.md).

## Local review package

The current working PDF has ten pages and records both authors' equal project
contribution. `AUTHOR_DECLARATIONS.md` tracks the remaining contact,
funding/conflict and final-verification fields. The current archive is
`output/paper/gmee_component_review_bundle_v3.zip`; earlier versions are
preserved. The package remains for local review.


See [ARTIFACT_CONTENTS.md](ARTIFACT_CONTENTS.md) for the exact source/aggregate allowlist and ZIP creation. [CLAIM_EVIDENCE_MAP.md](CLAIM_EVIDENCE_MAP.md) links the paper statements to their evidence. Packaging does not publish or submit the work.
