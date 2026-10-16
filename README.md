# GMEE — Global Misinformation Evolution Engine

GMEE ingests news and social content, extracts factual claims with LLMs,
embeds them for semantic search, tracks how claims **mutate** as they spread,
and maps candidate relationships in a graph database.

**Status:** research prototype with engineering hardening, not a validated truth
oracle or a production-readiness claim. Corpus support is not factual truth;
text changes and temporal ordering are not proof of copying or causation.
The upgrade adds authenticated corpus-local checking, typed mutation comparison,
provenance-aware evaluation and durable operational controls. Controlled research
experiments are **UNPERFORMED**; see [the audit](docs/AUDIT.md) and
[research protocol](docs/RESEARCH.md).

| Layer      | Stack |
|------------|-------|
| Backend    | Python 3.11+ · FastAPI (async) · SQLAlchemy 2 · Alembic |
| Frontend   | React 18 · TypeScript · Vite · Tailwind CSS |
| Storage    | PostgreSQL 16 + pgvector · Neo4j 5 · Redis 7 |
| Ingestion  | Reddit · NewsAPI · RSS collectors |
| NLP        | all-mpnet-base-v2 embeddings · spaCy NER · BERTopic clustering |

## Quick Start

Choose the workspace you need:

- **Read published data:** the [hosted reader](https://global-mass.onrender.com)
  uses the cloud API and stored releases while the analysis PC is off.
- **Collect/analyze and publish:** run the full local stack below, then follow
  [the daily publishing workflow](docs/CLOUD_PUBLISHING.md). Model inference
  remains local; cloud hosts the completed collection.
- **Inspect the interface offline:** use `Start-Preview.bat` after a frontend
  build. This mode does not provide accounts, cloud data or live inference.

Contributors: use the [documentation index](docs/README.md),
[current project map](docs/PROJECT_STRUCTURE.md) and [change rules](CONTRIBUTING.md).

For current development status, ordered work packages, acceptance checks, and
the next implementation batch, follow the [master task sheet](TASK_SHEET.md).

The [hybrid hosting runbook](docs/HYBRID_HOSTING.md) remains an optional
PC/tunnel configuration. The published cloud reader uses
[cloud publication](docs/CLOUD_PUBLISHING.md) without a continuous PC connection.

For the new guided Project Lab, private Investigation Studio, demonstration
walkthrough and completion strategy, see [Major-project upgrade](docs/MAJOR_PROJECT_UPGRADE.md).
The [verification record](docs/VERIFICATION.md) distinguishes current checks
from the Docker-dependent rollout.

**Inspect without Docker:** after `npm ci` and `npm run build` in `frontend`,
run `Start-Preview.bat` at the repository root. Open
[Project Lab](http://localhost:4173/#/project). This read-only preview
runs the real authored text controls; accounts, saved cases, corpus and model
services require the full stack. It creates no substitute corpus or labels.

The public `#/project` route exposes fixed engineering controls only. The
reader and advanced `#/dashboard/*` workspaces preserve the dedicated sign-in
boundary. See [integration and verification](docs/INTEGRATION_REVIEW.md) for
the upstream merge scope and outstanding deployment gates.

### Prerequisites

- Docker Desktop (the whole stack runs in Compose)
- For local backend/frontend development: Python 3.11+ and Node 24 LTS
- Compose with `env_file.required` and `config --no-env-resolution` support
- A private root `.env` with real runtime credentials; there are no safe public defaults

### 1. Clone & configure

Open the repository root (`GMEE`). If `.env` does not already exist, copy
[`infra/runtime.env.example`](infra/runtime.env.example) to root `.env` and fill
the empty password/JWT fields locally. On POSIX, `cp -n infra/runtime.env.example
.env` preserves an existing file. Do not commit, print or upload `.env`.

For an existing deployment, retain the actual database user/name and volume
identity; changing initialization variables does not change credentials in an
already-initialized PostgreSQL/Neo4j volume. See the [upgrade runbook](docs/OPERATIONS.md).

Optional keys in `.env` unlock more ingestion sources: `REDDIT_CLIENT_ID` /
`REDDIT_CLIENT_SECRET`, `NEWS_API_KEY`, `ANTHROPIC_API_KEY`.

### 2. Bring up the local stack

```bash
docker compose --env-file .env -f infra/docker-compose.yml -f infra/docker-compose.dev.yml up -d --build
```

The API is at http://127.0.0.1:8000 (OpenAPI docs at `/docs`) and the UI at
http://127.0.0.1:3000 **after readiness succeeds**. Migrations run automatically:
`alembic upgrade head` must succeed before the single Uvicorn worker starts.
Models are loaded lazily by the application, not preloaded by deployment scripts.
Scheduler jobs default to off until an operator explicitly enables them.

### 3. Production-like deployment

```bash
docker compose --env-file .env -f infra/docker-compose.yml up -d --build
```

Without the development override, PostgreSQL/Neo4j/Redis and the backend API
publish no host ports. The SPA binds to `127.0.0.1:3000` for a separately managed
TLS gateway; backend source is not bind-mounted. This is a deployment baseline,
not evidence that capacity, disaster recovery or public-exposure gates passed.

> **Demo Telemetry:** select “Launch Demo Telemetry” to view a clearly labeled
> simulated infrastructure preview. Unavailable live services remain visibly
> unavailable until this mode is selected. Exit from the yellow banner; polling
> is suspended while simulated. Simulated telemetry never establishes
> readiness, supplies scientific labels, or proves an API feature works.

## Development (without Docker)

Backend:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install --no-deps 'torch==2.14.1+cpu' --index-url https://download.pytorch.org/whl/cpu
pip install -c requirements.lock -e ".[dev]"
# Configure host-local connection URLs first; the container URLs are different.
python -m spacy download en_core_web_sm
python scripts/prepare_models.py  # download local embedding/extraction/stance weights
alembic upgrade head
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Frontend:

```bash
cd frontend
npm ci
npm run dev                        # add -- --port 5175 to pin a port
```

## Port Mappings (host : container)

| Service | Development override (loopback only) | Base deployment |
|---------|--------------------------------------|-----------------|
| PostgreSQL | `127.0.0.1:55432 → 5432` | No host port |
| Neo4j HTTP | `127.0.0.1:7474 → 7474` | No host port |
| Neo4j Bolt | `127.0.0.1:7687 → 7687` | No host port |
| Redis | `127.0.0.1:6379 → 6379` | No host port |
| Backend API | `127.0.0.1:8000 → 8000` | Only the private nginx proxy |
| Frontend | `127.0.0.1:3000 → 80` | Loopback; put a TLS gateway in front |

## Testing

Locally (backend):

```bash
cd backend
./.venv/Scripts/python.exe -m pytest tests/ -q     # POSIX: python -m pytest tests/ -q
pytest --cov=app --cov-fail-under=70               # offline unit gates
pytest -m model -o addopts=''                     # real pretrained NLP smoke
```

Locally (frontend):

```bash
cd frontend
npm run lint        # eslint, zero warnings allowed
npm run test        # vitest
npm run build       # type-check + production bundle
```

In containers:

```bash
docker compose --env-file infra/fixture.env -f infra/docker-compose.test.yml run --rm --build backend-tests
docker compose --env-file infra/fixture.env -f infra/docker-compose.test.yml run --rm --build frontend-tests
```

The test services build dedicated Python/Node targets; the nginx runtime has no
`npm`. CI runs lint, type checks and coverage for relevant backend/frontend,
infrastructure and Render changes. Required integration results reject missing,
empty or skipped tests rather than going green when PostgreSQL is unavailable.

Static checks (no containers, `.env` reads or database access):

```bash
python infra/scripts/validate_deployment.py  # requires PyYAML and Docker Compose
python -m unittest discover -s infra/tests -v
powershell.exe -NoProfile -File infra/scripts/validate_powershell.ps1
```

Deployment CI also runs the bounded, tmpfs-isolated
[`infra/scripts/http_smoke.py`](infra/scripts/http_smoke.py) through real nginx
and API containers: register/login/me, denied admin triggers, all-store readiness,
valid empty corpus, evidence authentication, and typed comparison with a
no-change control. It writes **no evaluation labels or verdict feedback**. This
is **HTTP end-to-end smoke, not browser E2E**. Browser rendering, accessibility,
load, restore and research experiments remain separate gates. Manual fixture
commands and branch-protection guidance are in [Operations](docs/OPERATIONS.md).

## Local administrator and pipeline controls

Register a normal account in the UI. An operator with database access can assign
its role explicitly from `backend`:

```bash
python scripts/set_user_role.py --email your-account@example.com --role admin
```

Log in again to see Pipeline operations: collection, preprocessing, NLP,
evolution, graph reconciliation, durable run inspection and expired-work
recovery preview. Public registration always creates an ordinary user.

Graph/corpus screens query the live backend. Optional demo telemetry is labeled
and selected explicitly; it never intercepts corpus or graph requests.

See [Verification](docs/VERIFICATION.md) for completed checks and research
requirements.

## Documentation

- [`docs/PROJECT_REVIEW.md`](docs/PROJECT_REVIEW.md) — B.Tech rating, strengths, repaired defects and publication assessment
- [`ARCHITECTURE.md`](ARCHITECTURE.md) — system design, data flow, service map
- [`docs/API.md`](docs/API.md) — REST endpoint reference
- [`docs/DATASET.md`](docs/DATASET.md) — dataset schemas, volumes, and ingestion pipelines
- [`docs/LIMITATIONS.md`](docs/LIMITATIONS.md) — algorithmic boundaries, heuristics, and hardware constraints
- [`docs/EVALUATION.md`](docs/EVALUATION.md) — human vs automatic labels, exploratory reports, annotation and reproducibility
- [`docs/AUDIT.md`](docs/AUDIT.md) — phased findings and engineering/product/research acceptance checklist
- [`docs/RESEARCH.md`](docs/RESEARCH.md) — hypotheses, baselines, ablations, frozen splits and UNPERFORMED experiments
- [`docs/OPERATIONS.md`](docs/OPERATIONS.md) — deployment, proxy trust, durable jobs, safe backup and isolated restore
- [`backend/README.md`](backend/README.md) — backend local setup, testing, and evaluation guide
- [`docs/openapi.json`](docs/openapi.json) — machine-generated OpenAPI 3.1 spec
- [`CHANGELOG.md`](CHANGELOG.md) — notable changes

## Repository Layout

```
├── backend/
│   ├── app/
│   │   ├── ai/                    # model integrations
│   │   ├── api/v1/                # REST routers (auth, collection, dashboard, …)
│   │   ├── core/                  # config, security, scheduler, leader lock, ops hardening
│   │   ├── db/                    # postgres/neo4j/redis clients
│   │   ├── models/                # SQLAlchemy models
│   │   ├── repositories/          # data access
│   │   ├── schemas/               # pydantic schemas
│   │   └── services/              # collectors, preprocessing, nlp, evolution pipelines
│   ├── alembic/                   # migrations
│   └── tests/
├── frontend/
│   ├── src/components/            # dashboard UI
│   ├── src/api/                   # typed clients
│   └── tests/
├── infra/                         # docker-compose + images
└── docs/                          # API, audit, operations and research protocols
```
