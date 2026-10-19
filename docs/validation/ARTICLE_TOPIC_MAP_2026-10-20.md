# Complete article map: real local processing and verification

20 October 2026, Asia/Calcutta. Processing runs locally on CPU; no Colab,
paid provider, model download or original-corpus mutation.

## Real result

The complete base release contains 7,421 articles, 5,157 claims and 300 saved
relationships. All three arrays are preserved exactly. Article-level processing
adds 98 machine-generated topic groups; 2,334 articles remain unclassified.
Every article has exactly one map assignment and is included in the map/list.

| Input basis | Articles |
| --- | ---: |
| Stored text (may be a snippet) | 2,294 |
| Title only | 5,078 |
| Explicitly unsupported language | 49 |
| Unavailable | 0 |

The model embedded all 7,372 usable inputs with cached pinned MPNet revision
`e8c3b32edf5434bc2275fc9bab85f82640a19130`. It did not invent full source bodies
or extract additional claims from titles. Article-row fingerprints before and
after match: `ae454dcb36b24c932238a35296f80992`.

The first local run took **918.20 seconds**, reusing 15 identical prepared inputs.
A second run reused **all 7,372 vectors**, taking **82.19 seconds**. Independent
validation confirms identical topics, assignments and projection coordinates,
plus unchanged article/claim/relationship arrays. The processor now keys vectors
by embedding configuration separately from clustering/source-format settings.

Reviewed candidate export:

- Run: `099b879d-ecb0-44e0-bf77-bc0689afab55`.
- Source revision: `92b83c51a4e493880f03c99c2511948d1edc804b`.
- Canonical fingerprint: `b8c9b5f6424a4113ec5dfecbcf4f16e09120e035f03a69b5cb41917c4d0c6015`.
- File: `publication-outbox/gmee-article-map-source-pinned-20261020.json`.
- Initial export size: 6,812,502 bytes (6.50 MiB); both fit the 10 MiB limit.
- Checkpoints/audit: `output/article-map-20261020/` (ignored, contains no cloud
  account credentials; vectors and audit are not public-release fields).

## Code and tests

Publication v2 is additive. V1 canonical fingerprints remain unchanged; v2
requires exact article coverage and validates IDs, counts, references, coordinate
pairs, finite values and input-basis interpretation. Migration gmee08 adds a
summary table. Activation materializes assignments and switches the existing
head transactionally. Release-pinned 500-record pages provide the complete map;
old bounded relationship APIs are unchanged.

Fresh verification:

- 283 frontend tests in 40 files, unchanged coverage gates: statements 82.63%,
  branches 75.81%, functions 76.75%, lines 89.58%.
- 54 backend map/publication/graph/cloud regression tests, followed by 13 map
  tests after adding two further coordinate-basis rejection cases.
- Frontend lint, architecture guard and its three tests, TypeScript production
  build passed. Existing main-bundle >500 kB advisory remains unsuppressed.
- Backend changed-module Ruff/mypy and dependency-direction checks passed.
- Minimal cloud Docker image built and its import-isolation check passed without
  ML imports or local pipeline routes. Cloud route contract was generated with
  the actual locked cloud dependencies (host local venv lacks psycopg).
- Versioned route contracts updated additively; publication v1 schema retained,
  publication-v2 schema added and checked by the default publication guard.

The first full frontend invocation ran alongside CPU analysis with high test
parallelism. It found an outdated 12-tab assertion and a 15-second large-fixture
timeout. The assertion now reflects the added map; the full coverage run with
two workers passed without increasing any test timeout or weakening thresholds.

## Real HTTP/browser rehearsal

An isolated SQLite cloud-profile API runs at localhost:8004, frontend at
127.0.0.1:3002. The existing developer login is copied only into this private
rehearsal database. Production accounts and data are unchanged by rehearsal.

Normal login/upload/review/publish HTTP routes activated the initial real export
in the rehearsal. All **7,421 unique articles** loaded across pinned pages.
The browser showed complete counts, source coverage and all article dots; checked
the 256-record Iran/Hormuz topic and its bounded 20-group relationship overlay.
Article drill-down returned to the selected topic correctly. Zoom/reset worked.
At 390px viewport, document width was 382px with no horizontal overflow. No
warning/error entries were returned by the browser log API during these checks.

Evidence:

- `output/article-map-20261020/complete-atlas.png`
- `output/article-map-20261020/mobile-atlas.png`
- `output/article-map-20261020/rehearsal-proof.json`
- `output/article-map-20261020/audit-initial.json` and `audit.json`

The topic labels were inspected as machine-generated keyword groups, not human
verified event labels. Some are broad/generic. Titles and snippets cannot support
full fact verification; neither topic proximity nor a saved evolution link proves
misinformation, copying or observed transmission. Human topic-quality/relationship
evaluation and completing source-text collection remain separate research work.

## Delivery

PR: https://github.com/theputhra-hue/global-mass/pull/9.
This report initially records local completion and the reviewed candidate;
live deployment/activation evidence will be appended after delivery checks pass.
The existing public revision 2 is retained until that separate activation.
