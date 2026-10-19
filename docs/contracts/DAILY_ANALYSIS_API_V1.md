# Daily analysis interface contract — revision 1

Frozen for parallel work on 2026-10-17. Coordinator/owner: Codex.
Status: existing interfaces inspected; new preflight endpoint is **planned**, not
implemented. Antigravity may build fixture-backed UI against this contract.

## Existing interfaces: preserve behavior

All paths below are relative to `/api/v1`. Use the existing API client and session
refresh/error conventions. Never add a second hard-coded base URL or store tokens.

- `GET /capabilities`: existing runtime authority. Published mode is
  `mode: "published"`, `live_ai: false`, `pipeline: false`. Use the existing runtime
  provider and its loading/error behavior rather than probing arbitrary endpoints.
- `GET /publications/access`: authenticated access result with `allowed`, `mode`,
  `max_bytes`. Server authorization remains authoritative; do not compare emails
  in frontend code as a permission mechanism.
- `GET /developer/overview`: local-only operational counts, source list and job
  history. Shape remains `DeveloperOverview` in shared API code. Only request this
  on a confirmed local runtime after developer access is allowed.
- `POST /developer/sources/{id}`: existing-source toggle, `{ "enabled": true }`.
- `POST /collection/trigger`, `/preprocessing/trigger`, `/nlp/trigger`,
  `/evolution/trigger`: existing explicit triggers with `{}`. Preserve stage
  confirmation and `DeveloperRunResult`. Do not invent async queue IDs, cancellation
  or completion progress percentages. A response can describe skipped work.
- `GET /developer/export-hints`: current commit/config/model metadata and notice;
  not historical execution provenance or a guarantee that inference works.
- `POST /developer/export`: existing body `{ provenance, reviewed: true }`, JSON
  attachment response. Provenance keys remain `analysis_started_at`,
  `analysis_completed_at`, `source_commit`, `config_sha256`, `model_revisions`.
- Existing upload/list/review/publish endpoints and publication-v1 JSON remain
  exactly as described by `frontend/src/shared/api/publications.ts` and
  `backend/app/schemas/publication.py`. Preserve SHA and expected-revision checks.

The frontend may improve labels, helper copy and error explanations without
renaming API keys. Use “Claim extraction started/completed” for export time inputs.
UI must explain that selection is by claim extraction time and includes only
eligible completed articles with matching claims. It is not a date filter on
article publication dates and does not promise export of all collected articles.

## New local preflight

`GET /developer/preflight` — Codex implements; Antigravity consumes.

Authorization: `require_developer`, so approved admins can inspect why pipeline
execution is disabled. Actual writes retain `require_local_pipeline`. Not mounted
in `app.cloud`; cloud UI does not call it.

Read-only and bounded: no model downloads, no inference, no pipeline triggers, no
database mutations, no external feed/provider requests. Datastore probes have
timeouts. Do not import model libraries into cloud or load them during preflight.

Successful inspection returns HTTP 200 even when individual checks are blocked.
Normal authorization/network/5xx errors still use existing client handling.

```json
{
  "schema_version": "1",
  "runtime": "local",
  "pipeline_enabled": false,
  "checked_at": "2026-10-17T12:00:00Z",
  "checks": [
    {"id":"pipeline","status":"blocked","message":"Local processing is disabled.","action":"enable_local_pipeline"},
    {"id":"postgres","status":"ok","message":"Database is reachable.","action":"none"},
    {"id":"redis","status":"unknown","message":"Redis readiness could not be confirmed.","action":"check_local_services"},
    {"id":"neo4j","status":"unknown","message":"Graph readiness could not be confirmed.","action":"check_local_services"},
    {"id":"model_metadata","status":"unknown","message":"Model preparation metadata is unavailable; inference has not been tested.","action":"prepare_models"}
  ]
}
```

Fixed fields/types:

| Field | Type / meaning |
| --- | --- |
| `schema_version` | Literal string `"1"` |
| `runtime` | Literal string `"local"`; deployment profile, not proof of physical machine location |
| `pipeline_enabled` | Boolean from backend configuration |
| `checked_at` | UTC ISO datetime |
| `checks` | Array; tolerate extra IDs and missing individual IDs |
| `checks[].id` | String; initial IDs pipeline/postgres/redis/neo4j/model_metadata |
| `checks[].status` | `ok`, `blocked`, `warning`, `unknown` |
| `checks[].message` | Bounded sanitized plain text, no provider exception bodies/secrets/paths |
| `checks[].action` | `none`, `enable_local_pipeline`, `check_local_services`, `prepare_models`, `review_configuration` |

The example is a schema fixture, not evidence of actual service state. A valid
model manifest is at most `warning`: metadata recorded, inference unverified. UI
must not translate it into “AI ready.” Unknown action IDs use generic guidance.

Preflight is advisory. No new server-wide stage authorization rule is introduced
by its aggregate display. Write authorization, job concurrency guards and stage
outcomes remain authoritative. Do not show “ready for all stages” from these
checks alone or permanently hide existing controls after a transient probe failure.

## Error and state requirements

- Capabilities offline/unknown: show Retry and setup guidance; never assume local.
- Preflight absent/404/503: explain check unavailable and offer Retry; no automatic
  network retargeting, no assumed success, no repetitive request loop.
- 401/403: respect existing sign-in/access handling; no bypass or frontend-only admin.
- Trigger timeout: outcome unknown; refresh job records before retrying manually.
- `running` stage: show stage and timestamps, not invented percentages or ETA.
- 409 export: refresh/review jobs; do not auto-run or auto-cancel anything.
- 422 export: show actionable validation/empty-period guidance; no fabricated file.
- 413 export/upload: preserve complete-replacement warning. Never recommend splitting
  one full collection into independent publication files.
- 409 publish: refresh release review and ask for explicit approval again.

No preflight response fields or example text may claim truth verification,
real-world propagation, calibrated probability, or scientifically validated AI.

## Changes to this contract

Only Codex edits this document. Antigravity records any request in its status
file with exact fields and blocking reason. Until a new revision is written,
both sides target revision 1. Optional implementation details stay internal.
