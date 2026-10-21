# Isolated artifact reconstruction: comparison plan

Written 20 October 2026, after original results were known and before comparing
any freshly reconstructed results. This is a software/artifact check, not a new
statistical hypothesis test or a new held-out evaluation.

## Scope

Extract all 64 payload files from the original local review ZIP, verifying every
inventory digest. Original ZIP SHA-256:
`ddec00faeb82d0c9c5d61c1b0527d3813f396ea57c4d0bf95ce7942d3b63caa5`.
Create new Python environments matching the recorded package versions. Refit
the seven classical models from verified original training/development inputs;
repeat the fixed released-checkpoint inference for the eighth model. Reuse only
the verified dataset and released checkpoint as inputs, not original fitted
state or predictions. Newly reconstructed primary and sparse artifacts feed
the later supplement. Preserve original artifacts and failed attempts.

The source checkout is initialized locally from the ZIP with a new Git commit;
that commit is an extraction identity, not the original historical HEAD.
The primary environment is Python 3.11.2 in the verified Debian container image
`ghcr.io/omnirush-ai/box-base@sha256:f5946a636f4bee82c88b1b38380303a5e4f6ec6a196b19768ba183099b37c15e`.
Two fresh Windows environments reproduce the classical supplement and CUDA
checkpoint settings. Installation inventories and command logs remain local.

## Acceptance and reporting

- Exact equality: ordered case IDs, labels, eligibility, quarantine reasons,
  page/revision/pair identities, row and group counts, feature names/orders,
  selected C and thresholds, training-fitted sparse vocabulary, source and
  input digests. Compare development selection grids as well as the winners.
- Compare every original clean/full metric and every saved bootstrap contrast,
  including page and connected-component primary intervals, sparse contrast,
  and both exploratory contrasts. Count/classification/seed/draw values must
  match exactly.
- Report maximum absolute probability difference separately for each model,
  all development outputs, and whether prediction-file bytes match. Any
  nonzero difference is numerical drift and must be reported, even if within
  the bounds below.
- Numerical acceptance bounds are absolute error at most `1e-10` for CPU
  probabilities, floating model/selection values, aggregate metrics and
  interval endpoints; `1e-6` for GPU probabilities and checkpoint aggregate
  metrics. These are artifact-comparison tolerances, not scientific effect
  margins. No tolerance will be enlarged to make a mismatch pass.
- New paths, timestamps, timing, Git identity and dependent manifest/lock
  hashes are expected to differ. Verify each reconstruction's internal hash
  chain separately. Do not require whole-report byte identity.
- Stop and explain a mismatch; do not change the frozen recipe or tune models
  to obtain agreement. Retain the mismatch report and any failed attempt.

## Chronology and limits

All original results and labels were already accessible to this team. The
unchanged historical primary runner writes its original access-disclosure
sentence into new locks. That inherited sentence does **not** describe this
reconstruction. A separate reconstruction receipt must bind the new lock hashes
and explicitly state this correction. New freeze timestamps establish only
artifact identity and fit-to-score consistency. They do not establish
prospective selection or erase previous test exposure.

The same assistant/team performs this reconstruction. Success is not
independent researcher reproduction, external confirmation of generalization,
or verification that another researcher can currently download all inputs.
The original bundle remains unchanged; documentation fixes belong in a new
versioned local review bundle.
