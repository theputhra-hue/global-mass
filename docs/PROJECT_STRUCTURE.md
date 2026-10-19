# GMEE project structure

Updated 2026-10-16. This map describes the implemented foundation, based on
`main` at `1754bf9`. Planned work is labelled separately. Start with
[contributor rules](../CONTRIBUTING.md) and the [documentation index](README.md).

## Runtime model

GMEE is one repository with two backend compositions and one frontend.
Keep this modular monolith while the two-person team develops the pilot.

```text
Analysis PC: app.main:app
  collect -> preprocess -> extract/embed -> inspect -> export publication JSON
                                                             |
                                              developer reviews and uploads
                                                             v
Cloud: app.cloud:app -> managed PostgreSQL + Redis -> published reader website
```

Cloud serves completed publications while the PC is off. It does not load the
local AI stack, run collection or expose local execution routes. The frontend
reads capabilities to choose the available experience. API version prefixes,
hash URLs, CLI names and both ASGI entrypoints are preserved by this refactor.

## Repository roots

| Path | Responsibility |
| --- | --- |
| `frontend/` | React/TypeScript client, feature tests and import-boundary checks |
| `backend/` | Local/cloud FastAPI compositions, services, ORM, migrations and Python tests |
| `contracts/` | Reviewed local/cloud route inventories and publication-v1 JSON schema |
| `infra/` | Compose, deployment checks, smoke fixtures, operating scripts and safety tests |
| `evaluation/` | Reproducible research instructions, scripts and retained artifacts |
| `docs/` | Current architecture, runbooks, plans and verification evidence |
| `scripts/` | Stable developer launchers and read-only preview entrypoints |
| `output/`, `publication-outbox/` | Ignored generated evidence and local exports; not deployable source |
| `1/` | Untracked historical comparison copy; preserved pending a code-level archive review |

No new service, package manager, database migration or dataset transformation is
required for this organization. Existing startup wrappers remain supported.

## Frontend ownership

```text
src/
  main.tsx
  app/
    App.tsx                     # compose destination and runtime-specific page
    routing/                    # pure route resolver and URL/session transitions
    providers/                  # query and publication context composition
    layouts/                    # published workspace composition
  features/
    account/                    # sign-in page and account experience
    articles/                   # reader, search and per-article investigation
    claims/                     # saved claims / local claim checking
    comparison/                 # wording comparison
    investigations/             # private saved investigations
    graph/                      # graph, timeline and source/claim views
    research/                   # evaluation and Project Lab
    publishing/                 # upload, review, publication history
    developer/                  # approved developer controls
    operations/                 # local health/administrative workspace
    navigation/                 # shared workspace header and tool directory
    experiments/                # explicit demonstration controls
    landing/                    # first visit and project explanation
  shared/
    api/                        # transport and typed API clients
    session/                    # memory-only authentication/session state
    runtime/                    # capability detection
    navigation/                 # safe return links, article routes, tab identifiers
    providers/                  # shared polling configuration
    hooks/                      # visibility/polling and other reusable hooks
    lib/                        # reusable formatting, URL/download helpers
    ui/                         # reusable visual elements
  styles/                       # existing theme and typography
```

Dependencies flow from `app` to `features` to `shared`. Shared code cannot import
feature pages or the application. Features cannot import `app`. Features may
compose another feature through an explicit import where already necessary;
do not invent a second shared layer to hide coupling. Type-only imports do not
create runtime dependencies. Direct `fetch` stays in `shared/api/client.ts`.

`npm run check:architecture` rejects incorrect directions, unresolved source
imports, runtime cycles and bypasses of the shared transport. Its failure
fixtures run with `npm run test:architecture`. Both checks run in CI.

The resolver is deliberately small and pure; URL/session side effects live in
`useAppRoute`. Tests preserve landing, sign-in returns, reader/search, article
tabs, developer/upload routes and existing advanced aliases. No router-library
migration is needed merely to organize files.

## Backend ownership

```text
app/
  main.py                       # full local application and lifespan
  cloud.py                      # published-data application and lifespan
  api/
    deps.py                     # request authentication and datastore injection
    v1/                         # existing HTTP adapters and public route prefixes
  core/                         # settings, crypto, security and observability
  runtime/scheduler.py          # local process scheduling and lifecycle
  db/                           # client/engine construction
  models/                       # shared SQLAlchemy registry; unchanged schema
  schemas/                      # request/response and publication validation
  repositories/                 # existing persistence helpers
  ml/                           # extraction, embedding and entity adapters
  services/
    identity/                   # authenticated account/session use cases
    collection/                 # orchestration, source adapters and seeding
    preprocessing/              # orchestration, cleaning/language/deduplication
    analysis/                   # NLP orchestration using model adapters
    evolution/                  # clustering, typed changes and graph projection
    verdict/                    # evidence retrieval, stance and saved assessments
    publications/               # export, staging, validation and active release
    research/
      controls.py               # fixed Project Lab controls
      evaluation/               # annotation, dataset, metrics and experiment logic
    pipeline/                   # durable stage ownership and job records
    operations/                 # alert use cases
    experiments/                # explicit simulation support
```

HTTP/CLI/runtime code composes services. Services and lower layers cannot import
HTTP adapters or ASGI entrypoints. Models/storage/schemas cannot acquire service
or ML dependencies. Deterministic quantity/text/diff modules accept values and
remain free of database, network and model imports.

Run `python infra/scripts/check_backend_architecture.py` without credentials to
check these rules. This is a static import guard, not a security sandbox or
proof of every dynamic dependency. The separate minimal-environment cloud
check verifies the actual cloud import graph and excludes heavy ML libraries.

Two existing `HuggingFaceLLMClient` compatibility methods call pure text analysis
and the stance engine. These exact helper modules are documented exceptions in
the guard, restricted to that adapter. Extracting the stance adapter from the
large verdict engine remains a follow-up, with cache/model tests preserved.

## Stable interfaces and scientific provenance

`contracts/` records HTTP method/path inventories and the complete publication
JSON schema. The snapshots were captured before moving modules. Route
inventories do not prove response compatibility by themselves; existing API,
authorization, publication/concurrency and frontend contract tests remain required.
Intentionally changing an interface requires review of the contract diff.

Research source manifests now use the new evaluation package paths and hash all
14 required sources. Missing sources fail rather than silently disappearing
from the report. Existing frozen reports are retained unchanged; new source
hashes must not be retroactively attached to an old experiment.

Migration scripts, recorded corpus exports and the original local database are
preserved. Structural movement is not authorization to rerun inference, publish
a replacement collection or migrate a live database.

## Move records and safe integration

The complete file mappings are [frontend moves](architecture/frontend-move-map.json)
and [backend moves](architecture/backend-move-map.json). Use these when integrating
another developer's branch: apply their logic to the new destination, resolve
imports and run the relevant checks. Do not restore the old folder tree as a
second implementation. Shared branches must not be force-pushed.

Keep tests near their existing test roots during this migration; renaming every
test directory adds conflict risk without changing its coverage. Keep existing
Docker contexts and script names. Generated logs remain ignored. The original
[structure proposal](architecture/original-structure-proposal.md) is historical
design context, not a list of implemented folders.

## Remaining production work

The structure supports extension; it does not guarantee capacity or publication
acceptance. Follow the [master task sheet](../TASK_SHEET.md) for acceptance gates.

1. Optimize reader route bundles and remaining query payloads against measured budgets.
2. Rehearse full-release backup/restore and rollback with a retained export.
3. Complete publication download/review ergonomics and bounded large-release tests.
4. Separate bounded worker execution from HTTP lifecycles, with lease/fencing tests.
5. Complete prepared model lifecycle/version metadata and stance-adapter extraction.
6. Complete licensed data inventory, independent human annotation, frozen splits,
   baselines, uncertainty analysis and the manuscript's actual results.

Each behavior change belongs in a separately reviewable commit with targeted
tests and deployment evidence. Do not lower existing thresholds to finish a plan.
