# VitaminC author checkpoint: development-only feasibility audit

Checked **19 October 2026** for the proposed [VitaminC pilot protocol](VITAMINC_PILOT_PROTOCOL.md). No test file, test label, or test prediction was opened or generated in this checkpoint audit. The 100-row pilot uses only official train keys to exclude leaking official dev rows, then the first 100 clean dev rows in release order. This is a throughput and preprocessing check, not a comparative paper result.

## Author recipe and pinned model

The authors' [pinned `run_flagging.sh`](https://github.com/TalSchuster/VitaminC/blob/eb532922b88b199df68ed26afeb58dca5501b52f/scripts/run_flagging.sh) calls `tals/albert-base-vitaminc_flagging` with `--input_features raw_sents` and `--max_seq_length 256`. Their [flagging processor](https://github.com/TalSchuster/VitaminC/blob/eb532922b88b199df68ed26afeb58dca5501b52f/vitaminc/processing/flagging.py) passes `sent_a` as `text_a` and `sent_b` as `text_b` and maps `not factual` to class **0**, `factual` to class **1**. Their [feature converter](https://github.com/TalSchuster/VitaminC/blob/eb532922b88b199df68ed26afeb58dca5501b52f/vitaminc/processing/utils.py) tokenizes the ordered sentence pair with `max_length=256`, `padding="max_length"`, and `truncation=True`. The released [checkpoint config](https://huggingface.co/tals/albert-base-vitaminc_flagging/blob/1e5f38d76c4d9402bf0c7d73e1aab6eaafca0ea8/config.json) independently records the same label mapping and an `AlbertForSequenceClassification` architecture. Our score is `softmax(logits)[1]`, the probability assigned to `factual`.

Checkpoint repository: [`tals/albert-base-vitaminc_flagging` at revision `1e5f38d76c4d9402bf0c7d73e1aab6eaafca0ea8`](https://huggingface.co/tals/albert-base-vitaminc_flagging/tree/1e5f38d76c4d9402bf0c7d73e1aab6eaafca0ea8). Files were downloaded by commit-pinned URLs to ignored `.local-deployment/research-data/vitaminc/anchor_model/`, loaded locally, and hashed:

| File | Bytes | SHA-256 |
|---|---:|---|
| `pytorch_model.bin` | 46,755,907 | `6917dc276d3af402d453e84c252b1c43c16903bead0cfc03387927d92fec9dfc` |
| `spiece.model` | 760,289 | `fefb02b667a6c5c2fe27602d28e5fb3428f66ab89c7d6f388e7c8d44a02d0336` |
| `config.json` | 994 | `adcdc2914c4116aa52adf5497f29e9c7dfd797a5eda158019add834fe8bdf449` |
| `tokenizer_config.json` | 215 | `3a7e20518084860b652061fcf94ba2e26dfa750930f7ba8cbdb1c838d28e7bd7` |
| `special_tokens_map.json` | 156 | `dafa474106cf4c7bee4470cf371e915005d4fe7a664f88c4b512dc4e4f2f2476` |

The code repository revision audited was `eb532922b88b199df68ed26afeb58dca5501b52f`. These are model and code revisions, separate from the VitaminC dataset archive pin in [the data audit](VITAMINC_DATA_AUDIT.md).

## Local 100-row dev pilot

The ignored local script `.local-deployment/research-data/vitaminc/pilot_anchor.py` has SHA-256 `510be58aa395ac508618c3eab9c75755a4acb01d8ce805ef70f9543e2c75727f`. It reads **only `train.jsonl` and `dev.jsonl`**. It builds train normalized-page, revision-ID, and unordered exact sentence-pair keys using the data audit's procedure, selects the first 100 dev rows without those keys, and hashes the ordered selected `case_id` list as `ce73ae73a9cdbd7c8ad99d2e3e9239b64ef0e80de804dfc35cd6526e1352e98e`. It does not use the gold label as model input. It tokenizes ordered raw sentence pairs exactly as above, uses batch size 8, runs the model in evaluation/inference mode, and writes both class probabilities per row.

| Measurement | Observed |
|---|---:|
| Timed rows | 100 clean dev |
| Model/tokenizer load | 10.09 s |
| One-batch warm-up | 0.69 s |
| Timed tokenization + CPU forward pass | 8.57 s |
| Timed throughput | 11.67 rows/s |
| Input pairs exceeding 256 tokens before truncation | 0/100; maximum 232 |
| Probability integrity | 100 unique case IDs; factual scores between 0.001660535 and 0.993594944; max two-class sum error < 9e-8 |

Machine: Windows host, Intel Core i7-14650HX (16 cores, 24 logical processors), NVIDIA GeForce RTX 4060 Laptop GPU (8,188 MiB reported), but this isolated run used **PyTorch 2.5.1+cpu** with eight CPU threads, Python 3.11.9, Transformers 4.46.3, `AlbertTokenizerFast`, and float32 inference. The CUDA GPU was visible through `nvidia-smi` but unavailable to this CPU PyTorch wheel. The isolated `anchor_venv` and `installed_packages.txt` are ignored; the latter has SHA-256 `70132f675c32a071670d76e2a07558f94d4e972b103f8683ac34347246ba9091`.

The 100-row log is `anchor_pilot/pilot_100_dev_probabilities.csv` (SHA-256 `628c508e592c97fc7d26daa3cc1f8ff12d1d3dcaf5245f82cf7d4b05f366e95b`); metadata are in `anchor_pilot/pilot_100_dev_metadata.json` (SHA-256 `fa4d2d9d666228b853f3a42629c9406998bd18055a0a686c20e84e95969c1d91`). Both remain ignored because the CSV contains case IDs and development labels. No metric was selected or checkpoint tuned from these 100 rows.

At observed CPU throughput, scoring the 30,828 proposed clean test rows would take roughly **44 minutes of steady inference**, plus loading, file I/O, and any additional preprocessing. This is an extrapolation from a small, early-dev convenience sample; sentence lengths and batch composition can change throughput. The strong anchor is locally feasible on CPU, so an incomplete baseline should not be attributed to hardware without a later concrete failure.

## Constraints for the paper comparison

- This local pilot used Transformers 4.46.3 and float32 CPU inference, whereas the checkpoint config records Transformers 4.3.3 and the authors' shell recipe requests `--fp16`. The author checkpoint was loaded successfully, but bitwise reproduction of the paper's published scores has not been established. Use the same local runtime for every row in the eventual matched anchor score and disclose version and precision differences.
- The first 100 eligible dev rows are a feasibility sample, not a random quality estimate. They do not validate the pilot's primary lexical-versus-GMEE contrast, which still needs its own train/dev analysis and locked protocol.
- The author model was trained on the official flagging training set. The proposed primary clean subset removes known cross-split identity and exact-text overlaps; it cannot rule out hidden near-duplicates or article aliases. Full-release secondary scores should disclose the known overlaps.
- The anchor uses **only** the two sentences and predicts binary factual change. It offers a strong same-task comparison but no evidence for GMEE's cross-outlet lineage, truth verdicts, temporal/provenance contribution, or typed changed-span accuracy.

## Reproduce the local feasibility run

Run from `E:\global-main\global-mass-integration`. The dataset and checkpoint paths must already contain the audited frozen bytes above. All generated files stay in ignored `.local-deployment/`.

```powershell
uv venv .local-deployment\research-data\vitaminc\anchor_venv --python 3.11
uv pip install --python .local-deployment\research-data\vitaminc\anchor_venv\Scripts\python.exe torch==2.5.1 transformers==4.46.3 sentencepiece==0.2.1 safetensors==0.4.5 protobuf==5.29.5
$env:HF_HUB_OFFLINE = '1'
.local-deployment\research-data\vitaminc\anchor_venv\Scripts\python.exe .local-deployment\research-data\vitaminc\pilot_anchor.py
Get-FileHash -Algorithm SHA256 .local-deployment\research-data\vitaminc\anchor_pilot\pilot_100_dev_probabilities.csv
```

The next gate is to freeze the main contrast's implementation and dev-only choices, then run this checkpoint on the same primary clean test rows once at the locked test stage. This feasibility pilot has **not** opened or scored test data.
