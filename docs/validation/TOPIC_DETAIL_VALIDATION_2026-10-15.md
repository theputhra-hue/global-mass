# Article investigation validation — 15 October 2026

Scope: local implementation of the article-anchored topic detail plan; no push
or deployment. Existing unrelated local work is preserved.

## Implemented behavior

- Dedicated internal page with nine independently navigable sections.
- Article-scoped claims, stored evidence, related reporting, chronological list,
  focused graph and provenance/limitations.
- Existing comparison and evidence forms accept selected text without an
  automatic POST. All ten advanced destinations remain reachable.
- Reader cards preserve original-source links. Corpus, semantic search, timeline,
  graph and evidence entry points link internally to details.
- URL context retains the article, active section, selected claim and return
  query/page. Safe internal sign-in return paths and unknown-route handling.
- Bounded PostgreSQL-only neighborhood queries; no inference on reads and no
  Neo4j requirement for the focused page.
- Driver acquisition failure now degrades only the graph part of the dashboard.

## Automated coverage

Backend article tests use real ORM queries against the isolated test database,
not mocked endpoint responses. They exercise plain-text body output, unknown
completeness, counts/entities, pagination, selection outside a page, cross-article
selection denial, incoming/outgoing connections, exclusion of unrelated edges,
empty neighborhoods, truncation, malformed IDs, bounds and missing records.
An additional dashboard regression covers unavailable driver acquisition.

Frontend coverage includes nine detail sections, URL serialization and safe return
paths, explicit claim selection, no inference on mount, older/newer prefill order,
dependency errors, empty data, unsafe source links, all advanced links, keyboard
navigation and retention of the memory-only session during repeated navigation.
The App routing suite also covers sign-in returning to an article deep link.

Final results (logs under `output/topic-detail-*.log`):

| Check | Result |
|---|---|
| Backend full default suite | 524 passed, 8 integration tests deselected; 44.44 seconds |
| Frontend full suite | 140 passed across 24 files |
| Backend Ruff | Passed |
| Backend mypy | Passed, 95 application source files |
| Frontend production build and lint | Passed |
| Real PostgreSQL-backed HTTP checks | All six expected status/scope outcomes verified |

The default suite excludes eight opt-in integration tests. Those were not rerun
for this change; the new endpoints were additionally checked against the real
isolated PostgreSQL dataset through the running API.

## Real local data and browser checks

Test stack: frontend 127.0.0.1:5050, API 127.0.0.1:8002, existing isolated
`gmee_bench500_20261015_144907` database. Main/public corpus was not replaced.
No new collection or 500-article reprocessing was needed for this UI change.

Real PostgreSQL-backed HTTP checks:

- Article detail: HTTP 200, seven claims in the selected example.
- Claims with selected same-article claim: HTTP 200.
- Connections limited to one: HTTP 200, total three, truncated true.
- Malformed article ID: 422; valid unknown article ID: 404.
- Selected claim requested under another article: 404.

Browser verification used actual sign-in and the stored Disney D23 article as
an example with recorded relationships. Overview, Article, Claims, Evidence,
Changes, Related coverage, Timeline, Graph and Data & methods loaded. Evidence
and comparison fields were prefilled from actual selected claims/edges.
No evidence-scoring or comparison computation was automatically submitted.

Mobile viewport: 390 × 844. Overview, Claims, Graph and Data & methods each had
document width 382, within the 390 viewport. The tab strip intentionally scrolls
horizontally inside its container. The viewport override was reset afterward.

Search journey: the submitted query `Disney` survived Open details → Back to
results. Submitting the identical search again kept the user signed in. The
returned URL was `/#/dashboard/browse?q=Disney&offset=0`.
Browser Back restored that query; browser Forward restored the detail page.
Final preview confirmed nine detail-section links.

The retained experiment database contains 700 articles and 1,548 claims at final
inspection, including collection timestamps after the historical 500-article run.
Do not confuse this mutable local preview database with that frozen run's input
manifest. The original `gmee` database still contains 7,421 articles, 5,157 claims
and three users. No cleanup or replacement of these data was performed here.

## Defects found and repaired during verification

- Missing graph-driver configuration previously failed before dashboard section
  error guards. Driver acquisition now safely degrades the graph section.
- Sign-in and repeated query navigation could perform a document reload,
  clearing memory-only authentication. Programmatic navigation now uses History
  API state and an explicit route event; the real search journey was repeated.
- Empty corpus filters unnecessarily changed the canonical route. Empty filter
  parameters are now omitted.
- Relationship query failure must not render a misleading no-links message.
  Each detail section now distinguishes failure from an empty successful result.

## Evidence and limits

Artifacts under `output/topic-details/`:

- `overview-desktop.png`, `overview-mobile.png`, `graph-desktop.png`, `final-preview.png`.
- `browser-checks.json`: visited sections, mobile widths and search restoration.
- Additional HTTP evidence: `output/topic-detail-live-checks.json`.

This validates navigation and recorded-data presentation, not the correctness of
the underlying claims or evidence. Existing Neo4j-only global tools were retained
but their live projection was intentionally unavailable in this isolated profile.
The existing evidence/comparison suites test their services; no fresh end-to-end
500-article accuracy or expensive verdict experiment was performed here.
Production hosting, full-text collection, stable topic identities and public
release activation retain their separate plan requirements.
