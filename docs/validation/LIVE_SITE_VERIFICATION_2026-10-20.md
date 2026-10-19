# Live site verification — 20 October 2026 (IST)

The site is reachable and its main reading workflows work. It is not yet fully
ready: the active public dataset has no relationships, and the deployed graph
still arranges disconnected records in an artificial circular layout. The new
300-relationship release is safely staged but has not been published.

## Scope and account

- Frontend: https://global-mass.onrender.com
- API: https://global-mass-api.onrender.com/api/v1
- Existing account: `pavan@gmee.com`; login succeeded, active admin role confirmed.
- API observations began at `2026-10-19T19:13:11Z` (20 October in IST).
- Browser checks used the actual hosted site, including a 390 × 844 viewport.
- No upload, publication, deployment, account creation, saved-case creation or
  local AI processing was performed. One transient comparison used artificial
  bridge-opening examples to test the wording analyzer.
- Existing application changes were preserved. This report and ignored
  verification artifacts are the only additions from the verification.

## Operational API checks

All 12 requests below returned HTTP 200 in this session. Timings are single
observations from a warm service, not latency guarantees or cold-start tests.

| Request | Time (ms) | Observation |
| --- | ---: | --- |
| `/health` | 290 | Published mode, healthy |
| `/health/ready` | 310 | PostgreSQL and Redis OK; Neo4j not required |
| `/capabilities` | 275 | Live AI/pipeline disabled; literal text search; source text not published |
| `/auth/me` | 286 | Existing active admin account |
| `/publications/status` | 610 | Public revision 1; 7,421 articles / 5,157 claims / 0 relationships |
| `/publications/access` | 296 | Developer upload access allowed; 10 MiB limit |
| `/publications` | 1,189 | Three uploaded releases visible |
| `/publications/0cc697f0-1089-4d96-905a-f6f718789ec8/review` | 1,117 | Correct counts and fingerprint; 6,336-byte review response |
| `/dashboard` | 694 | Counts agree with active publication |
| `/corpus/articles?q=NEET&limit=5&offset=0` | 323 | 56 matching records, five requested records returned |
| `/graph/full` | 1,372 | 1,000 article nodes, zero edges |
| `/graph/claims` | 1,358 | 1,000 claim nodes, zero edges |

Summarized machine-readable results: `output/live-verification-20261020/api-checks.json`.
No password, bearer token or service credential is included there.

## Browser journeys

| Journey | Result |
| --- | --- |
| Landing → sign in → dashboard | Passed with the existing account |
| Article search for NEET | 56 results; result cards and pagination controls present |
| Result card → Open details | Correct article metadata and source reference loaded |
| Article → Back to results | Preserved `q=NEET&offset=0` |
| Claims search → owning article | Correct claim selected in the article Evidence tab |
| Evidence → Claims → Changes | Article, selected claim and return-search context retained |
| Saved evidence display | Heuristic assessment displayed with uncalibrated-score explanation |
| Compare older/newer text | Correctly identified 2020 → 2021 and 5 → 8 million dollars; returned `NUMERIC_DRIFT` and `WORDING_DRIFT` |
| Advanced tools directory | Available and local-PC-only capabilities distinguished |
| Developer workspace → release review | Existing staged release opened successfully without retry/upload |
| Publication confirmation | Checkbox remained unchecked; publish button disabled |
| My investigations | Existing account's empty casebook loaded; nothing created |
| Mobile navigation | Menu opened; selecting destinations closed it and navigated |
| Mobile review page | At width 390, document/body scroll width 382; no document-level horizontal overflow observed |
| Browser error/warning log | No entries returned by the tab log API during the inspected session |

One initial click on an article title did not navigate; its explicit **Open
details** link worked. This was not reproduced sufficiently to classify it as a
confirmed broken link.

## Outstanding issues and concrete next actions

### 1. New relationship data is not public

The active release remains `8121d828-a47e-47cc-b5f6-a578984b694d`, revision 1,
published `2026-10-15T19:04:31.682807Z` (16 October IST). It contains **zero**
relationships. This explains empty related-coverage and graph neighborhoods;
successful API requests cannot create missing analysis.

The staged release `0cc697f0-1089-4d96-905a-f6f718789ec8` contains **7,421 articles,
5,157 claims and 300 relationships**, matching the completed local export.
Its SHA-256 is:

`7d7f6387d62884d144c1c9b21225f7c25da153551b8fb4d4c703dd45a5f3bb95`

Finish the separate release review and activate that existing release when
approved. Do not upload a duplicate to solve a review timeout. Publication
changes the visible dataset, so it was deliberately excluded from this check.

### 2. Hosted graph still uses the old visual implementation

The browser shows a symmetric disk labelled “The connected corpus” and “1,000
articles · 0 similarity links.” These positions are not distances derived from
saved connections. A no-links explanation is present, but the decorative
geometry still suggests structure that the data does not establish.

The live APIs also lack the newer scope/run metadata expected by the local
graph work. Deploy and verify the graph frontend/backend changes together.
Test both a zero-edge release and the new linked release after deployment;
publishing data alone does not replace the graph renderer.

### 3. Data availability must remain explicit

An inspected article had zero extracted claims, while another had five. Full
source text is intentionally unavailable on this cloud archive; publisher links
are provided. Cloud live AI and ingestion are disabled by capabilities. These
are dataset/deployment limits, not evidence that an empty tab failed to load.

“NLP: published” is archive status and should not imply that every record has
completed extraction. Claim scores remain historical heuristic outputs; this
operational check does not validate their accuracy or establish misinformation.

### 4. Timeout behavior was not stress-tested

Review succeeded in both the API and browser today. The earlier reported
15-second failure did not recur. This does not prove the timeout fixes have been
deployed or eliminate cold-start/intermittent latency. Verify the local
operation-specific timeout handling after deployment using a controlled test.

## Evidence and limits

- `output/live-verification-20261020/live-dashboard.png`
- `output/live-verification-20261020/live-graph.png`
- `output/live-verification-20261020/mobile-review.png`

These checks cover selected reading, comparison and developer-review journeys.
They do not certify every route, authorization-denial paths, mobile hardware,
external publisher content, concurrency, upload/publication writes, uptime,
security or scientific accuracy. No application unit suite was rerun because
this task only inspected the hosted application and added this report.
