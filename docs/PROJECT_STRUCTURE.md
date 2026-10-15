# GMEE target project structure and module contracts

Status: proposed, 2026-10-14. Scope and budget: [production plan](PRODUCTION_PLAN.md).
All paths in target trees are design destinations, not claims that files exist.

## 1. Structural rules

Keep `backend/`, `frontend/`, `infra/` and `evaluation/` as top-level roots.
This preserves current Docker contexts, imports, CI filters and contributor
familiarity. Create directories when real code moves into them; do not generate
empty scaffolding. Structural moves and behavior changes use separate commits.

Use feature modules with thin HTTP adapters and explicit storage/model
dependencies. Do not create interfaces or repository wrappers for every
function. Introduce boundaries where they enable isolation, testing or reuse.
One business rule has one implementation shared by API, CLI and worker.

## 2. Repository layout

```text
GMEE/
  README.md                      # setup and links to current entrypoints
  ARCHITECTURE.md                 # current implemented architecture only
  CHANGELOG.md                   # released behavior changes
  LICENSE
  .github/workflows/             # quality, integration, artifact/release checks
  backend/
    pyproject.toml               # package/tool definitions
    requirements.lock            # proposed resolved runtime dependencies
    requirements-dev.lock        # proposed resolved test/tool dependencies
    Dockerfile                   # API/worker/test targets as justified
    alembic.ini
    alembic/versions/            # preserve all published migration history
    app/                        # module tree below
    scripts/                    # thin compatible CLI wrappers
    tests/
      unit/                     # pure logic; no network or stores
      api/                      # route validation, authorization, response shape
      integration/              # real pgvector/Redis/Neo4j where relevant
      contracts/                # OpenAPI, job results and model metadata
      fixtures/                 # small, non-sensitive, explicitly synthetic
    benchmarks/                 # bounded latency/memory workloads and manifests
  frontend/
    package.json
    package-lock.json
    src/                        # feature tree below
    public/                     # public assets; no private corpus exports
    tests/
      unit/
      integration/
      fixtures/
    e2e/                        # real-browser journeys on disposable stack
  evaluation/
    README.md                   # reproducible research entrypoint
    protocols/                  # versioned hypotheses and evaluation plans
    configs/                    # datasets, baselines, seeds, thresholds
    annotation/                 # rubric, assignments, adjudication schema
    manifests/                  # data/model/source hashes and release metadata
    scripts/                    # experiment CLIs, using shared backend logic
    results/                    # selected immutable reports with manifests
    legacy/                     # historical artifacts, moved only with references
  infra/
    docker-compose.yml          # retain current paths during sprint
    docker-compose.dev.yml
    docker-compose.test.yml
    docker-compose.smoke.yml
    runtime.env.example         # descriptions and placeholders, no credentials
    scripts/                    # validate, migrate, backup, restore and smoke
    tests/                      # infrastructure policy and helper tests
  docs/
    PRODUCTION_PLAN.md
    PROJECT_STRUCTURE.md
    IMPLEMENTATION_BACKLOG.md
    decisions/                  # concise architecture decisions with tradeoffs
    runbooks/                   # startup, migration, recovery, incident handling
    releases/                   # redacted evidence tied to commit/image hashes
    research/                   # manuscript outline and submission checklist
    openapi.json                # generated and checked for drift
```

Lockfile names are proposed, not a selected new tool requirement. Choose one
resolver and verify Windows development and Linux image installs before
committing its lock format. Record direct research dependencies explicitly;
do not rely on accidental transitive installation of numerical libraries.

Large/private corpora, model weights, full backups and credentials belong in
configured external artifact locations, not Git. Git contains release manifests
and small permitted fixtures. Inventory rights and checksums before moving any
existing CSV, JSON or report; preserve historical artifacts and links.

## 3. Backend layout

```text
backend/app/
  main.py                       # app factory, composition and lifecycle
  api/
    deps.py                     # request-scoped dependencies and role gates
    errors.py                   # stable, sanitized error translation
    v1/                         # HTTP adapters; retain public route prefixes
  core/
    config.py                   # validated runtime configuration
    security.py                 # cryptographic primitives
    ops_security.py             # rate limits and audit policy
    observability.py            # structured logs and request/job IDs
  modules/
    identity/                   # users, sessions, atomic token rotation
    collection/                 # source adapters and ingestion use cases
    preprocessing/              # cleaning, language, deduplication
    claims/                     # claim extraction and entity use cases
    evolution/                  # candidate retrieval, typed changes, clustering
    evidence/                   # corpus retrieval, stance and abstention
    corpus/                     # read queries and pagination
    graph/                      # projection reads, freshness, rebuild operations
    annotations/                # blinded tasks, label revisions and consensus
    operations/                 # admin job inspection and recovery use cases
  models/                       # shared ORM registry, retained during migration
  db/                           # store clients, sessions and transaction helpers
  ml/
    registry.py                 # model IDs/revisions/artifact metadata
    lifecycle.py                # preparation, readiness and bounded loading
    embeddings.py               # explicit model-space contract
    extraction.py               # structured extraction adapter
    stance.py                   # versioned NLI adapter
  jobs/
    service.py                  # submission, idempotency and result visibility
    repository.py               # atomic claims, leases, terminal transitions
    handlers.py                 # job type -> application use case
    worker.py                   # worker process lifecycle
    scheduler.py                # enqueue scheduled work only
  research/                     # pure reusable evaluation/export logic
  cli/                          # operator and research commands
```

Typical feature module contains `service.py`, `schemas.py` and, only when
needed, `queries.py` or `repository.py`. Add files because responsibilities
require them, not to satisfy a template. Retain the ORM registry and migration
imports until an isolated migration proves a later change safe.

Dependency direction: HTTP/CLI/job adapters -> application use cases -> storage
and ML adapters. Pure mutation/metric functions must not import FastAPI, fetch
URLs, read secrets or open a database. Research runners may call production
algorithms with frozen inputs; production modules must not import experiment
scripts or read evaluation labels.

## 4. Frontend layout

```text
frontend/src/
  app/                          # routing, providers, app shell
  pages/                        # landing and dashboard composition
  features/
    account/                    # sign in/out, account and session UI
    corpus/                     # article list, filters and search
    claim-check/                # submit, queued/running/result/error states
    mutation/                   # comparison and supporting spans
    graph/                      # graph views, dossier and timeline
    evaluation/                 # blinded annotation workflows
    operations/                 # health, jobs and admin controls
  shared/
    api/
      transport.ts              # real HTTP, auth, timeout, cancellation
      generated.ts              # checked types generated from backend schema
      errors.ts                 # normalized error contract
    ui/                         # dialogs, buttons, empty/error/loading states
    hooks/                      # visibility/polling and animation lifecycle
    lib/                        # URL validation, downloads and small utilities
    session/                    # session state and refresh coordination
  demo/                         # explicit deterministic demonstration adapter
  styles/
```

Move one feature at a time. Existing imports may use temporary re-export shims
with a removal issue. Features consume shared transport; no global transport
branch returns random claims or silently falls back to public JSON. Production
requests and demonstrations have different cache keys and visible mode labels.

Generate types after response models cover the relevant API. Type assertions
do not validate server JSON: validate critical job/evidence responses at the
boundary and test representative error bodies. Avoid hand-maintained duplicate
schemas without a drift check.

## 5. Runtime and persistence contracts

| Boundary | Contract |
|---|---|
| API | Short requests; validate, authorize, read or enqueue; no scheduler and no startup data imports |
| Worker | Concurrency one initially; explicitly prepared models; bounded work; renew leases; shutdown cleanly |
| Scheduler | Optional; creates uniquely keyed scheduled jobs; can be disabled without losing manual execution |
| PostgreSQL | Authoritative content, labels, jobs, model provenance and projection checkpoints |
| Neo4j | Derived graph; lag reported; retry/rebuild without changing scientific labels |
| Redis | Rate limiting and revocation; sensitive operations fail closed on outage |
| Experiment process | Frozen export inputs; no writes to live annotations or production results |

### Job state machine

Proposed states: `queued -> running -> succeeded | failed | cancelled`.
Expired attempts become `abandoned`; an explicit retry creates a new attempt
linked to the original logical job. Preserve attempt history and bounded retries.

Add fields only through new migrations: logical job ID/idempotency key,
validated payload and schema version, attempt ID/count, owner/fencing token,
lease and heartbeat times, requested-by identity, result reference, safe error
code, cancellation request and processing-version metadata.

- Atomically claim queued jobs with PostgreSQL locking/conditional updates.
- Preserve the existing one-running-per-type constraint until a deliberate,
  tested concurrency policy replaces it. Restrict duplicate active logical jobs.
- Define idempotency by principal, operation and key; reject key reuse with a
  different payload. Scheduled keys include stage and scheduled interval.
- Renew leases independently of a slow model call, using short-lived sessions.
- Check fencing at each durable mutation; job-record fencing alone is insufficient.
- Commit output and success together where they share a transaction. For graph
  projection use a durable retry/checkpoint record and idempotent upserts.
- Thread cancellation does not stop CPU inference. Stop accepting new work,
  fence late results, and use process isolation if hard termination is required.
- A browser disconnect never determines whether durable work succeeded.

Proposed API: `POST /api/v1/jobs` returns 202 and a status location;
`GET /api/v1/jobs/{id}` returns authorized status/result;
`POST /api/v1/jobs/{id}/cancel` requests best-effort cancellation.
Users can inspect their own claim-check jobs. Admins can trigger pipeline
jobs and inspect operational metadata. Server-side authorization applies to
every job type and result; arbitrary handler names or filesystem paths are rejected.
Migrate existing `/trigger` clients using additive endpoints and contract tests.

### Models and scientific records

Each model artifact records identifier, immutable revision/hash, tokenizer,
dimensions, preprocessing version, license, local path and preparation status.
Query embeddings must match stored embedding-space identity, not just size.
Prepare models explicitly before worker launch; no request-triggered downloads.
Record inference provider and disclose remote text transfer when configured.
External claim checking is a separate capability with tested source attribution;
disable it if that evidence contract cannot be met within the sprint.

Retain article/claim IDs and existing embeddings during migration. Add
versioned derived results; do not overwrite old outputs as if they were produced
by the new method. Legacy probability fields remain compatibility fields with
explicit uncalibrated-score semantics until an API migration removes ambiguity.

### Health, observability and security

Liveness reports process survival. Readiness reports the declared deployment's
required dependencies. Feature capability status separately reports worker,
models and graph availability/freshness. Missing optional capability produces
an explicit unavailable state; missing required auth dependency blocks the
protected action. Missing clients must be handled before readiness dependency
resolution can escape as an unstructured 500.

Log request/job IDs, route templates, durations, error codes and attempt state.
Exclude passwords, tokens, query claim text and raw provider errors. Persist
audits for admin triggers/recovery with principal, action, time and outcome.
Track queue age, lease loss, failures, worker heartbeat, model readiness,
projection lag and backup age. Avoid claim/user IDs as metric labels.

Keep existing memory-only browser tokens initially; test reload/sign-out
behavior explicitly. Refresh rotation must use an atomic database transaction.
Revocation loss on Redis restart needs a tested policy (for example session
version invalidation); Redis persistence alone is not an authentication proof.
Provision the two users and admin deliberately; disable open registration in
the private pilot or enforce an invitation policy. Include provider prompt
injection, untrusted links/text, admin recovery abuse and secret leakage in tests.

## 6. Migration map

| Current | Target | Sprint decision |
|---|---|---|
| `services/pipeline/*`, `core/scheduler.py` | `jobs/*` | First meaningful extraction; implement lifecycle tests |
| `services/auth_service.py`, auth repositories | `modules/identity/*` | Fix atomicity first; move only if checks stay green |
| `services/nlp/*` | `ml/*` and `modules/claims/*` | Separate lifecycle and use cases; preserve adapters |
| `services/evolution/*` | `modules/evolution/*` | Preserve algorithm behavior and fixture results |
| `services/verdict/*` | `modules/evidence/*` | Preserve scientific semantics; no silent re-score |
| `services/eval/*` | `research/*` plus `modules/annotations/*` | Pure evaluation and live annotation kept distinct |
| `frontend/src/api/*` | shared transport plus feature APIs | Remove fabricated transport first |
| flat React components | feature folders and shared UI | Move touched features only this sprint |
| research/backup scripts | documented thin wrappers | Identify canonical entrypoint; preserve old commands temporarily |
| historical exports/results | manifests and legacy classification | No automatic deletion or relabeling |

For each move: inventory callers -> add targeted contract fixture -> move and
update imports -> run relevant checks -> update CI/Docker/docs paths -> review
diff -> remove temporary shim only after caller search is empty. Never combine
folder migration, schema rewrite and algorithm replacement in a single change.
