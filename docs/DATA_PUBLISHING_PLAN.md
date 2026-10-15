# Companion plan: local AI, cloud published results

Date: 2026-10-15. Status: first contract slice implemented; no hosting cutover. See [contract and inventory](PUBLICATION_CONTRACT.md).

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
through the website. This is partial P03/P05 work: public activation and cloud
data serving are still pending. No live migration/allowlist has been applied.

| ID | Status | Work | Acceptance |
|---|---|---|---|
| P01 | PARTIAL | Inventory the dashboard's required fields/endpoints; define a versioned publication format and public-data boundary | Article, claim, relationship and score exports include stable IDs, source references, analysis timestamps, model/config versions and run ID; credentials, sessions and private annotations are excluded |
| P02 | PARTIAL | Separate cloud data serving from local AI execution; choose persistent free storage and verify current quotas | Cloud startup imports/downloads no AI models; required browsing endpoints run against an isolated published fixture within host limits |
| P03 | OPEN | Implement authenticated, bounded upload batches with schema validation, checksums and idempotency | Repeating a batch creates no duplicates; conflicting payloads, unauthorized writes and invalid references are rejected; incomplete runs never become visible |
| P04 | OPEN | Add local export/upload command and durable retry state | Upload after each completed analysis batch and reconcile at day end; an interrupted upload resumes safely; local data is retained until acknowledgement |
| P05 | OPEN | Connect the frontend to published results and expose freshness/capabilities | Show last successful publication and analysis period; failed uploads preserve the previous complete release; unsupported interactive AI actions explain availability |
| P06 | OPEN | Deploy, restore-test, and switch over | Validate data integrity, user journeys, backups, reboot behavior and rollback; website works with the PC and temporary tunnel switched off |

## Publication rules

- Publish only completed, validated analysis. Stage chunked uploads under a run
  ID, then activate the release atomically after manifest/count checks pass.
- Start with versioned snapshots if the measured corpus/storage budget permits;
  add incremental publication only when necessary. Define updates, deletions
  and stable references explicitly before implementing synchronization.
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

Keep the frontend at https://global-mass.onrender.com. Choose the lightweight
API host and persistent database after measuring exported size and checking
current free-tier limits; a cloud provider has not been selected for this track.
Do not rely on ephemeral service files for published data or expiring trial
databases for ongoing storage. Semantic search must either use a verified
lightweight query-embedding option or be explicitly replaced by text search;
do not silently claim feature parity.

Develop and restore into isolated storage first. Leave the current local stack
and working frontend connection intact until P06 passes. At cutover, take a
fresh backup, publish a verified release, update frontend API/CORS/security
headers, and retain the previous configuration for rollback. Keep encrypted
backups outside the cloud database and test restoring one.

Suggested sequence: P01-P02 -> P03-P04 -> P05-P06. Allow approximately 3-5 working
days after hosting access is available, subject to the endpoint inventory,
storage quotas and required feature changes. Record actual evidence in the
master task sheet rather than treating this estimate as a completion promise.
