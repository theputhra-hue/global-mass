# Spacious city graph — implementation and verification

20 October 2026, Asia/Calcutta. Feature branch: `codex/spacious-city-network`.
This report is updated with live evidence only after the release is verified.

## Implemented

- Width-unbounded atlas workspace, large map, responsive exploration controls,
  selection inspector, fullscreen layout and source article drill-down.
- Distinct article/topic/theme marks. Article sizes show retained semantic degree;
  hub sizes show article count. Log-compressed area scales are frozen per release
  and capped at the 95th percentile; uniform article sizes remain available.
- Semantic streets, topic highways and theme superways built locally from cached
  embeddings. Original UMAP article positions and all source arrays are preserved.
- Zoom-dependent streets, explicit visibility override, displayed/loaded route
  counts, route picking and keyboard lists, supporting-pair inspection, minimap,
  search, topic/theme filters, and an unsupported-input inset excluded from fit.
- Existing recorded relationships remain a separate typed, direction-preserving,
  release-matched overlay. No line is added to force a component to connect.
- PNG view export has scope, legend, release and exploratory-method footer.
- Publication v3, additive gmee09 tables, immutable paginated road reads and
  server/client verification of degree, membership and aggregate support.
- Existing validated runtime survives a background capabilities-refresh failure;
  publication refresh no longer unnecessarily invalidates runtime capabilities.

## Real local processing

The same 7,421 articles, 5,157 claims, 300 recorded relationships and complete
topic-map assignments were retained. All 7,372 usable cached vectors were reused.
The 49 unsupported-language records do not receive semantic roads or positions.
Original corpus fingerprints before/after match:
`ae454dcb36b24c932238a35296f80992`.

Exact mutual top-10 cosine candidates were evaluated at three thresholds:

| Minimum cosine | Streets | Connected articles | Topic highways | Themes | Superways |
| --- | ---: | ---: | ---: | ---: | ---: |
| 0.72 | 2,697 | 2,256 | 0 | 98 | 0 |
| 0.62 | 6,728 | 3,899 | 5 | 93 | 0 |
| 0.55 | 10,442 | 5,113 | 23 | 76 | 1 |

The 0.55 exploratory candidate takes approximately six seconds from the cached
vectors and fits the 10 MiB transport at about 7.0 MiB. Its 76 themes include
singleton topics; only useful multi-topic hubs (and required superway endpoints)
are drawn as extra navigation hubs. Synthetic hubs are never counted as articles.

Examples near the threshold include related subjects that are not necessarily the
same event. The UI explicitly labels these roads exploratory and not human-
validated. The cutoff is a construction parameter, not measured precision, a
truth probability or evidence of copying/transmission. No research accuracy claim
is made. A frozen labelled evaluation and human review remain necessary for a paper.

## Verification to date

- Local HTTP rehearsal uploaded/reviewed/activated the real 0.55 candidate in the
  isolated SQLite cloud-profile database, not the original or production database.
  All 10,442 paginated streets exactly match the local export.
- First full frontend pass: 296 tests; 77.45% statements, 72.43% branches,
  75.60% functions, 87.72% lines. Existing thresholds were unchanged.
- Further aggregate/runtime regression additions: 24 targeted frontend tests pass.
- Backend full run: 680 passed and one expected stale cloud-route contract failed.
  After updating that additive contract, all 29 contract/map/city tests passed.
- Backend Ruff, full mypy (222 files), architecture checks, frontend lint and
  TypeScript production build pass.
- Minimal cloud image built; network-disabled import/isolation check passes
  without numpy, torch, BERTopic, spaCy or local pipeline routes.

The backend and frontend full CI suites will run against the final source before
merge. No coverage threshold, timeout or architecture protection was weakened.
The existing >500 kB frontend bundle advisory remains visible.

## Practical limits and remaining plan phases

This implements the working city-network release. The larger master plan remains
the design direction: human usability/accuracy studies, vector paper exports,
cross-release identity matching, advanced comparison/casebook integration and
measured mobile-device performance are separate phases, not completed claims.

The renderer has an explicit 3,000-visible-route budget. All retained roads remain
in the loaded graph and available through source/route inspection; visual hiding
does not imply missing data. Small components and isolated articles remain real.
Free-service cold starts and transient networking are distinct from renderer speed.

## Delivery

Completed: source-pinned export, browser checks, all CI checks, normal merge,
both deployments, reviewed publication and complete public API comparison.
Final identifiers and evidence follow.

## Final candidate and browser evidence

The final source-pinned export is
`publication-outbox/gmee-city-network-source-pinned-20261020.json`:

- Run: `315d6109-57bf-4cb1-9395-261825f633da`.
- Canonical SHA-256:
  `40447bbc111fe0a8df3d924b0c2d67f158f4710fba207c253f349a9fd7f29766`.
- Producer commit: `b8580c9`; subsequent feature commits change the UI only.
- Size: 7,325,604 bytes; local computation: 6.47 seconds from cached vectors.
- Final isolated HTTP rehearsal compared all street pages, hierarchy metadata,
  article assignments and unchanged base arrays against the export.

Browser checks exercised all 7,421 articles, a 256-article topic filter, recorded
relationship overlay, exact 2000% camera restoration after opening/back from an
article, and the superway inspector's five supporting pairs. The 1707 × 1067
fullscreen view has no horizontal overflow; the 771-pixel-wide view also has no
horizontal overflow. Controls collapse into an exploration drawer at that width.
These checks do not substitute for measured handheld-device performance.

The prepared-image flow was downloaded through its visible browser link. The
1047 × 1203 PNG has an opaque brand background (corner alpha 255), a legend,
size interpretation, active layers, immutable release, filtering scope, route
budget and exploratory-method footer. Evidence files are in the ignored local
`output/article-map-20261020/` folder:

- `city-local-fullscreen.png`
- `city-export-with-footer.png`
- `city-rehearsal-proof.json`

PR #10 final feature head is `5b4fca0dbcd6b547a1604a86f3f6d6d2cd611e38`.
Its frontend CI passed 304 tests in 42 files, plus three architecture tests.
Coverage: 77.08% statements, 72.38% branches, 75.90% functions, 87.52% lines.
Both push and PR deployment contracts and the cloud minimal-runtime check pass.
Backend CI and deployment/publication evidence follow.

## Final CI and code deployment

All checks on `5b4fca0` passed before normal PR #10 merge. Backend CI ran
681 unit/API tests (83.21% coverage), three real pretrained model checks and
14 real PostgreSQL/pgvector integration tests with zero required-suite skips.
Lint, mypy, dependency boundaries, minimal-runtime isolation and both copies of
deployment contracts passed. The 17 tests deselected from the first pytest stage
were run by the dedicated model/integration stages.

Merged commit: `43b63ea98b51a22f8239e5db9222290d14361c98`.
Render backend deployment `dep-dbba11m7bikc73afru30` succeeded in 42.4 seconds;
logs confirm `gmee08 -> gmee09` migration and readiness HTTP 200.
Frontend deployment `dep-dbba1cs9v7es73ef0i5g` succeeded in 30.9 seconds,
manually pinned to the same merge commit. Both `/` and `/index.html` served
`/assets/index-CwKS6Nh7.js` with the existing revalidation headers. The previously
published v2 release remained available during rollout; its new roads endpoint
correctly returned `available: false` rather than fabricating roads.

## Live publication and final verification

The existing authorized developer account uploaded the exact final candidate,
reviewed its immutable digest and counts, then published it once through the UI.
The UI reported revision **4**. No automatic write retry or direct database edit
was used. Public `published_at`: `2026-10-19T23:01:33.724335Z` (20 October local).
The publication review is technical/data-integrity approval; it is not a claim
that every semantic pair was human annotated or that article claims are true.

The read-only verifier fetched all **15 article pages** and **six road pages**:
7,421 unique articles and all 10,442 street triples match the local candidate
exactly. Coordinates, topic assignments, network metadata, degree array,
23 highways, 76 themes and one superway also match. There are 5,113 articles
with retained semantic neighbors; isolated records remain represented honestly.
The recorded graph separately retains 213 article groups from 300 saved claim
relationships, and the claim graph returns all 300 links. The old v2 release is
retained and its roads endpoint correctly reports no city roads for that release.
Evidence: `output/article-map-20261020/city-live-proof.json`.

Live browser checks loaded the whole collection, filtered the 256-article Iran/
Hormuz topic (514 displayed/loaded routes), and opened the theme superway's
five supporting source pairs with their cosine scores. Fullscreen fits within
1707 × 1067 with no horizontal overflow. Captured console warning/error list
was empty. The clean overview was restored and left open for the user.
Screenshot: `output/article-map-20261020/city-live-fullscreen.png`.

Live entry: https://global-mass.onrender.com/#/dashboard/atlas

All original data arrays and publication history are preserved. The completed
release is an exploratory navigation tool; labelled accuracy evaluation, paper
figures and measured mobile-device performance remain the next research phase.
