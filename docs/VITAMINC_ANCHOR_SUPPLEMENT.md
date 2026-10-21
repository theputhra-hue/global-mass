# Published ALBERT checkpoint — supplementary fixed inference plan

**19 October 2026.** The primary and supplementary sparse results are known.
The original pilot named this checkpoint before those results, but the executed
primary lock explicitly excluded it. This separate fixed-checkpoint comparison
is therefore supplementary and descriptive. It adds a needed competitive
reference without changing or re-scoring either prior model.

Use only `tals/albert-base-vitaminc_flagging`, revision
`1e5f38d76c4d9402bf0c7d73e1aab6eaafca0ea8`, with checkpoint/tokenizer file hashes
in `evaluation/config/vitaminc_anchor.json`. Use the authors' ordered raw
`sent_a` and `sent_b`, max length 256, max-length padding, longest-first
truncation. Positive probability is softmax index 1 (`factual`). Run float32
on the local RTX 4060 using PyTorch 2.5.1+cu121, Transformers 4.46.3,
AlbertTokenizerFast, batch size 32, eight CPU threads, and TF32 disabled.
The precision/runtime differ from the authors' historical fp16 recipe;
this is a pinned-checkpoint evaluation, not bitwise reproduction of published
scores. Record truncation and observed timing/memory.

First time the same 100 clean dev rows used for the CPU feasibility pilot;
check numerical probability agreement and throughput only. Do not select a
checkpoint, preprocessing rule or threshold based on quality on these rows.
No training, calibration, threshold selection or weight changes are permitted.
Use a fixed threshold of 0.5 for descriptive classification metrics.

Freeze script, this plan, config, model hashes, main report/prediction hashes
and test bytes before inference. Predict every original 31,048 test row once;
report the identical 30,828-row primary-eligible subset and all rows separately,
using the original eligibility identifiers. Preserve predictions and a one-time
test-access marker. A failure after test access must be retained and disclosed.

Report AUROC, average precision, macro-F1, Brier/log loss and confusion on those
rows. Report all outcomes, including a large advantage over the GMEE model if
observed. No additional confirmatory inference or model choice follows from
these supplementary scores. The authors' released training split and unknown
pretraining overlap, the benchmark's selection/annotation limitations, and
known cross-split identity overlap remain limitations of this comparison.
