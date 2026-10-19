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

Pending final source-pinned export, browser sign-off, CI and normal deployment/
reviewed publication. Live release remains the previous validated publication
until those steps complete. Final identifiers and evidence are appended below.
