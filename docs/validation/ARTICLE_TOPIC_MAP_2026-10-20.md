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
- Full backend unit suite after the contract update: **668 passed, 17 deliberately
  deselected model/integration tests**. Twelve pre-existing SQLite datetime-adapter
  deprecation warnings were reported on the Python 3.13 host.
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
Filter/selection state is synchronized to the shareable URL; clearing filters
cannot restore an old topic on reload. A Restore projected positions control
returns dragged dots to their published coordinates without altering source data.
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
PR #9 merged as `1fe5ada763758d1944cffc284ee33afe0deb3e5e` after every required
check passed on `c7a3cdef0d3431d7a63e08873cc5c4928af17e08`. Final CI totals:
284 frontend tests / 40 files, 668 backend unit tests, 3 real pretrained model
smoke tests and 14 real PostgreSQL/pgvector integration tests. Architecture,
types, lint, cloud import isolation and all deployment contract checks passed.
Frontend coverage: 82.66% statements, 75.84% branches, 76.74% functions,
89.57% lines. Full backend mypy checked all 219 source files successfully after
adding the missing annotation to the test fixture reported by the first CI run.

Render backend deployment `dep-dbb8pi1srm7s739hrasg` auto-deployed this merge;
logs confirm transactional `gmee07 -> gmee08` and healthy readiness responses.
Frontend deployment `dep-dbb8pt67bikc73fe1tug` manually deployed the same merge.
Its production JS asset is `index-XNLp-uNe.js` (612.82 kB / 171.79 kB gzip).
During propagation, `/index.html` served the new build while `/` still served
cached older HTML; the root is checked separately before declaring completion.

The reviewed candidate was uploaded through the live developer UI under the
existing developer account; the server receipt matches the exact run and digest
above. Activation and final public completeness checks are recorded below.

### Live activation and browser result

The normal developer review/publish UI activated run
`099b879d-ecb0-44e0-bf77-bc0689afab55` as **revision 3**, published at
`2026-10-19T21:40:38.558264Z`. Its public fingerprint matches the local candidate
exactly. A read-only verifier loaded all **15 pinned pages**, confirmed **7,421
unique article IDs**, compared every assignment/coordinate to the exported JSON,
and confirmed all 98 topics, 2,334 unclassified records and coverage totals.
The old revision-2 release remains readable and explicitly reports that it
predates topic maps. The source arrays and original database remain unchanged.

The normal root URL subsequently served `index-XNLp-uNe.js`, matching Render's
new build. Existing HTML cache headers were preserved. Publication took tens of
seconds; the developer page briefly showed a data-service connection fallback.
No write was repeated. Read-only status confirmed successful activation, and a
fresh navigation restored the normal app. Free-service transient connection
handling remains an operational limitation; no claim of continuous availability
or zero interruptions is made.

Browser checks against the normal live site confirmed:

- Complete 7,421-record map before drawing; immutable release in the URL.
- Iran/Hormuz topic filter: 256 records, with 20 real bounded overlay groups.
- Search for `earthquake`: 44 records; filters clear back to the full collection.
- Article details open and Back to results retains release, topic and selection.
- Collection map is discoverable in the navigation menu.
- Recorded article graph retains 213 grouped links from 300 underlying records;
  recorded claim graph retains all 300 links, both on the new release.
- Restore positions, pan/zoom controls, and no horizontal overflow at the current
  763px live browser width. The separate 390px local rehearsal also passed.
- The browser log API returned no captured warnings/errors at final inspection.

Evidence: `output/article-map-20261020/live-proof.json` and `live-atlas.png`.
Live route: https://global-mass.onrender.com/#/dashboard/atlas.
Publication processing, checkpoints and future reruns remain **local only**.
