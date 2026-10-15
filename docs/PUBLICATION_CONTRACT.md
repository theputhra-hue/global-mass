# Published-results contract and endpoint inventory

First implementation slice, 2026-10-15. Runtime contract:
`backend/app/schemas/publication.py`. No live data or deployment changes.

## Endpoint inventory

Inspected frontend api modules/ReaderDashboard and backend app/api/v1.
All paths below use the /api/v1 prefix.

| Endpoints / consumer | Planned cloud behavior |
|---|---|
| GET /dashboard, reader home | Derive counts from active release; distinguish publication time from response time; no invented live pipeline telemetry |
| GET /corpus/articles, reader browse | Published article metadata; title/author text search and pagination |
| GET /corpus/articles/recent, /corpus/stats | Need collection/status aggregate contract extension before enabling |
| GET /corpus/articles/{id} | Metadata and claims initially; full source text and entity panels require separate review |
| GET /graph/full, /graph/claims, /graph/timeline, /graph/scoops, /graph/lineage/{id}, /corpus/graph/* | Derive supported reads from relationships; validate each endpoint's semantics before enabling |
| GET /verdicts and stats/summary/leaderboard/detail | Saved results only; games need separate review |
| Alerts, evolution clusters/status | Not in initial snapshot; explicit unavailable capability until extended |
| POST mutation comparison/summary, verdict checks | Runtime AI unavailable in first cloud slice; saved results cannot answer arbitrary new input |
| Pipeline triggers, alert evaluation, graph simulation | Not mounted in cloud app |
| /auth/* | Separate cloud authentication; accounts/sessions never transferred in publication uploads |
| /eval/*, verdict feedback, alert acknowledgement | Separate authenticated storage; never replaced by automatic snapshots |

## Version 1 rules

The bounded snapshot contains stable run/record UUIDs, generation time, analysis
period, source commit, config hash, model revisions, articles, claims and edges.
Unknown fields, nonfinite/out-of-range scores, naive timestamps, duplicate IDs
and edges, orphan references, self edges and multiple evolution parents fail
validation. This does not certify scientific validity, acyclic graphs or model
revision authenticity. Actual immutable revisions must be supplied; legacy
unknown provenance needs an explicit policy before export.

Full article content, arbitrary metadata, embeddings, credentials, accounts,
sessions and human labels are absent. Derived text still needs publication
review. The receiver must additionally enforce a byte limit before parsing.

Canonical UTF-8 JSON and SHA-256 identify exact retries/conflicts; they are not
authentication. Lists remain ordered: exporter sorts by ID and persists the
exact envelope, including timestamps, for retry. Same run/digest replays safely;
same run/different digest conflicts. Stage chunks and activate only after full
manifest validation; readers retain the previous release on failure.

## Next slice and remaining gaps

Build the standalone cloud app and minimal dependency installation, authenticated
staging and atomic activation, then a consistent read-only exporter with durable
outbox. Use isolated data and retain current frontend configuration until tests
pass. No provider/database is selected yet; persistent storage quota and export
size must be measured before selection. Semantic search requires a separate
lightweight query-embedding solution or an explicitly labeled text-search mode.

P01 is PARTIAL: contract and inventory exist; advanced fields and legacy
provenance remain. P02 is PARTIAL: design inventory exists; runtime import
isolation, minimal install and resource feasibility remain unverified.
