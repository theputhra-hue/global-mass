# Companion plan: local AI, cloud published results

Updated: 2026-10-16. Status: manual export, review, atomic publication and a lightweight
cloud read API are implemented and deployed. First live release approval is pending. See
[daily workflow and hosting](CLOUD_PUBLISHING.md).

## Purpose and relationship to the original plan

Keep AI collection and analysis on the owner's PC. Publish completed results to
a lightweight cloud API and persistent database, so the Render frontend remains
usable while the PC is off. This is a companion deployment track to the
[production plan](PRODUCTION_PLAN.md) and [master task sheet](../TASK_SHEET.md).
It does not mark the original worker, recovery, or research tasks complete.
Local processing remains authoritative; the cloud holds a published projection.

Flow: local collection/AI -> durable local upload queue -> authenticated cloud
publish API -> persistent cloud database -> existing Render frontend.

## Small implementation checklist

Developer convenience slice: [website upload guide](DEVELOPER_UPLOADS.md).
Local operator workspace: [developer console guide](DEVELOPER_CONSOLE.md).
Authenticated email-allowlisted administrators can stage a validated JSON upload
through the website, review its provenance and explicitly publish it. Published
reads are separate from the local analysis corpus. The fresh managed database
has been migrated through gmee07; existing local source databases are unchanged.

| ID | Status | Work | Acceptance |
|---|---|---|---|
| P01 | PARTIAL | Inventory the dashboard's required fields/endpoints; define a versioned publication format and public-data boundary | Article, claim, relationship and score exports include stable IDs, source references, analysis timestamps, model/config versions and run ID; credentials, sessions and private annotations are excluded |
| P02 | IMPLEMENTED | Standalone app.cloud with a minimal dependency lock, managed Neon PostgreSQL and Upstash Redis | Linux Docker readiness/authentication passed; observed memory after login about 109 MiB under a 384 MiB container cap; no AI libraries imported |
| P03 | PARTIAL | Complete-file staging, review, idempotent atomic activation, concurrent-writer protection and rollback implemented | Chunked upload remains future work; complete release files are limited to 10 MiB |
| P04 | PARTIAL | Local console exports a consistent read snapshot; the exact downloaded JSON is retained for manual retries | Automatic outbox synchronization and scheduling remain future work |
| P05 | IMPLEMENTED | Published reader, saved claims, article details, relationships, provenance/freshness and explicit capability boundaries | Build, lint and frontend tests pass; public cutover verification remains P06 |
| P06 | IN PROGRESS | Render API and frontend deployed on main; Neon/Upstash readiness, live developer login, comparison, staging and review passed | First draft contains 500 articles, 1,536 claims, 71 relationships. Developer approval, live activation and published corpus reads with the analysis PC disconnected remain |

## Publication rules

- Publish only completed, validated analysis. Stage chunked uploads under a run
  ID, then activate the release atomically after manifest/count checks pass.
- Start with versioned snapshots if the measured corpus/storage budget permits;
  add incremental publication only when necessary. Define updates, deletions
and stable references explicitly before implementing synchronization. The first
implementation uses whole replacement files; partial daily files must not be
mistaken for incremental updates.
- Keep publishing credentials on the PC and server, never in the frontend.
  Separate publishing permission from ordinary user access; support rotation.
- Preserve provenance and release hashes for paper experiments. A published
  dashboard snapshot is not automatically a frozen scientific evaluation set.
- Initially serve existing results. On-demand AI requests and cloud workers
  are outside this first slice; disable those actions clearly where required.
- Maintain the existing authentication boundary for protected data. Publish
  only content permitted for redistribution; avoid uploading full source text
  when metadata, source links and derived results suffice.

## Hosting and rollout gates

The frontend is https://global-mass.onrender.com and the lightweight Render API
is https://global-mass-api.onrender.com, backed by Neon PostgreSQL and Upstash
Redis. Both Render services use main. Deployment and browser evidence is in
[cloud publishing verification](CLOUD_PUBLISHING_VERIFICATION.md).
Do not rely on ephemeral service files for published data or expiring trial
databases for ongoing storage. Semantic search must either use a verified
lightweight query-embedding option or be explicitly replaced by text search;
do not silently claim feature parity.

Develop and restore into isolated storage first. The frontend API/CORS/security
cutover is deployed; the original local source database is preserved and the
isolated preview was backed up before its additive migration. Review the staged
release before activation, then verify reads with local processing disconnected.
Keep encrypted
backups outside the cloud database and test restoring one.

Suggested sequence: P01-P02 -> P03-P04 -> P05-P06. Allow approximately 3-5 working
days after hosting access is available, subject to the endpoint inventory,
storage quotas and required feature changes. Record actual evidence in the
master task sheet rather than treating this estimate as a completion promise.
