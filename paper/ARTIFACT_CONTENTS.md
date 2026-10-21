# Local review bundle: contents and provenance

This bundle is a **working review copy of the VitaminC component study**. It is
not the full GMEE application, an independently reproduced result, a public data
release, or an anonymous venue submission. Its manuscript and source paths can
identify the project and local environment. Author accountability, contribution,
rights review and final venue compliance remain open in `REVIEW_GAPS.md` and
`INTERNAL_REVIEW.md`. No upload or GitHub push is performed by the builder.

## What the exact allowlist includes

| Archive path | Purpose |
|---|---|
| `paper/manuscript.md`, `references.bib`, `README.md` | Editable paper, bibliography and reconstruction instructions |
| `paper/environments/` (four named files) | Recorded package versions and installation caveats; no installed environment |
| `paper/reconstruction_comparison.json` | Text-free comparison receipt with numerical differences and artifact hashes |
| `paper/AUTHOR_DECLARATIONS.md` | Confirmed equal project contribution and remaining author declarations |
| `paper/REVIEW_GAPS.md`, `INTERNAL_REVIEW.md`, `VENUE_OPTIONS.md`, `ARTIFACT_CONTENTS.md`, `CLAIM_EVIDENCE_MAP.md`, `QA_RECEIPT.md` | Review status, evidence mapping, verification, limitations and package documentation |
| `paper/figures/` (seven named files) | Two aggregate plots in PDF/PNG/SVG and their manifest |
| `output/pdf/gmee_vitaminc_manuscript.pdf`, `manuscript_build.json` | Readable manuscript and source/output hashes |
| `evaluation/scripts/` (exact named files) | Primary fit/freeze/score, sparse and checkpoint supplements, exploratory feature analysis and fresh-artifact adapter, shared identity/statistics helpers, figure and error selection, saved-anchor metric summary |
| `evaluation/tests/` (exact named files) | Synthetic checks of grouping, selection, fixed scoring, sparse features, statistics, feature analysis and reconstruction provenance |
| `evaluation/config/vitaminc_anchor.json` | Checkpoint identity, file hashes and fixed inference recipe |
| `backend/app/services/evolution/{text_changes,quantities}.py` and three package initializers | Complete local analyzer source dependencies used by the component scripts |
| `docs/` (exact named documents) | Relevant external benchmark/data audits, historical protocols, primary/supplementary plans, results receipts and text-free error/review notes |
| `paper/build_manuscript_pdf.py`, `build_review_bundle.py` | Presentation and local packaging tools |
| `evidence/aggregate/{primary,sparse,anchor,mechanism}_results.json` | Exact reviewed aggregate report bytes, renamed into a public-review-oriented layout |
| `LICENSE`, `SOURCE_STATE.json`, `BUNDLE_INVENTORY.json` | Existing source license, local Git-state disclosure and SHA-256 inventory |

The exact filenames in `build_review_bundle.py` are authoritative. The curator
does not recurse through the repository. The mechanism result is included only
after completion, aggregate-content review and insertion of its exact SHA-256
in the curator. Before that, check mode reports it as pending and build mode
refuses to produce a final archive.

No source data rows, real case/page/revision identifiers, predictions, model
weights, fitted models, local database data, private votes, credentials,
`.env` files, installed environments, logs, backups, Git history, or unrelated application files
are included. Synthetic test fixtures contain invented example sentences and
identifiers; they are code tests, not benchmark observations. The error-review
document uses ordinal sample labels such as `FP01`, not original case IDs.
References to excluded local paths and hashes can remain in receipts and
manifests; those references do not embed the excluded files. The MIT source
license does not confer rights to third-party datasets or checkpoint weights.

## Build and inspect locally

From the repository root, with Python 3.11 or newer and Git available:

```powershell
python paper/build_review_bundle.py --check
```

This command loads and validates only explicitly selected files and reads Git
state. It writes no files. Review its `pending` list. After the manuscript,
figures and PDF have passed final inspection, and the mechanism aggregate has
been reviewed and digest-pinned, create the local artifact:

```powershell
python paper/build_review_bundle.py --build
```

Current outputs are `output/paper/gmee_component_review_bundle_v3.zip` and its `.sha256`
sidecar. Existing outputs are never intentionally overwritten. Preserve an
earlier bundle and explicitly choose a new output filename in the curator for
a new version. The ZIP contains current selected bytes; build mode does not fit
models, re-score data, fetch inputs, change the frozen analysis or publish.

The original `gmee_component_review_bundle.zip` is preserved at SHA-256
`ddec00faeb82d0c9c5d61c1b0527d3813f396ea57c4d0bf95ce7942d3b63caa5`.
Its 64 payload entries were the source for the isolated reconstruction.
Version 2 added the corrected environment instructions, installed-package
inventories, comparison verifier and receipt, external-access audit, and updated
working manuscript. Version 3 reconciles the reconstruction status and access
chronology across the writing, records equal author contribution, and includes
the remaining declarations. Both earlier ZIPs are preserved. Reconstruction
inputs and outputs remain local.

The curator rejects path traversal, symlinks and Windows reparse points. It
validates historical source hashes against the original local experiment locks,
requires reviewed aggregate hashes, and checks the PDF and figure manifests
against their selected source/output bytes. An allowlist and hashes are useful
integrity controls; they are not a substitute for final human content review.

## Integrity semantics

`BUNDLE_INVENTORY.json` lists byte length and SHA-256 for every payload entry
except the inventory itself. The external sidecar hashes the complete ZIP,
including the inventory. `SOURCE_STATE.json` records the historical baseline
HEAD, current HEAD, dirty status and changed/untracked path counts without
listing unrelated local filenames. The baseline is
`aa0056c3e81a012b942c4a1fc9cb278feaa5c3f8`; experimental sources were uncommitted.
Consequently Git HEAD alone cannot reconstruct these sources. Historical frozen
source hashes and the inventory identify the actual selected bytes.

ZIP entries have sorted names, fixed 1980 timestamps, regular-file permissions
and no compression or archive comment. Identical selected bytes and Git state
produce identical ZIP bytes. Changing the PDF, documentation, curator, Git
state or any input changes the archive digest. A rebuild of the PDF may itself
change its metadata and bytes. Archive determinism does not mean that a fresh
experimental run must reproduce byte-identical timestamped reports or GPU
probabilities.

Aggregate JSON files are copied without transformation. Their original local
source path and hash are recorded in the inventory. They are the same
measurements already reported in the paper, not a second experiment. Their
prediction hashes identify excluded original evidence; they cannot be used to
reconstruct row-level predictions from this bundle alone.

## Reconstruction limits and dependencies

Follow `paper/README.md` for the recorded Python/library environments and exact
fit/freeze/score commands. The package includes every project-local Python
import needed by the component runners. Install the external dependencies
(NumPy, SciPy, scikit-learn, RapidFuzz and joblib for classical experiments;
PyTorch, Transformers and tokenizer dependencies for ALBERT; pytest for the
synthetic checks; Matplotlib for plots; ReportLab and pypdf for the PDF).
The recorded version matrix is not a complete cross-platform environment lock.
GPU inference enforces its pinned runtime and device recipe. The PDF builder
currently requires Windows Times New Roman fonts; Poppler is used for visual
inspection. No runtime environment is bundled.

Obtain the separately licensed official flagging data and pinned checkpoint as
described in the reproduction guide, then verify their hashes. Original raw
data, predictions, fitted models, locks and feasibility-pilot inputs remain
local. Fresh fitting and scoring need fresh output directories and produce new
evidence; guards must not be bypassed to impersonate the original run. Plot
regeneration requires those local original predictions or predictions from a
fresh reconstruction; aggregate reports alone are insufficient.

The primary freeze calls `git rev-parse HEAD`. Unpack into a suitable Git
checkout preserving these selected bytes, or initialize a new local Git
repository and make an explicit initial commit before fresh experiments. That
new commit identifies a reconstruction checkout and must never be described as
the historical baseline. The package does not contain `.git` history. The
curator itself is intended for the canonical local workspace with reviewed
aggregate inputs; it cannot recreate the original ZIP from only the subset
without restoring those inputs and its recorded Git state.

The original feature-analysis runner requires the historical primary/sparse
lock identities. For fresh artifacts, use the explicit-digest reconstruction
adapter documented in `paper/README.md`. It records the new identities in its
freeze and snapshots itself, preserving the original model recipe and checks.
Its focused tests passed; a full clean-environment run has not been performed.

An independent researcher has not yet run this package from a clean environment.
The bundle therefore supports inspection and prospective reconstruction; it
does not establish successful independent reproduction or publication readiness.
