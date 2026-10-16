# Project foundation verification

Date: 2026-10-16 (Asia/Calcutta). Baseline `1754bf9`; implementation branch
`codex/project-foundation`. This records engineering checks, not research
accuracy, capacity certification or evidence that Render has deployed the branch.

## Change and preservation

- Captured local/cloud HTTP method/path inventories and publication-v1 schema
  before moving modules. Snapshots still match; response/authorization behavior
  is also exercised by the existing API and publication tests.
- Moved 73 frontend source files into app/features/shared ownership. Separated
  route resolution, URL/session transitions and provider composition.
- Moved 30 backend files into responsibility groups; preserved both ASGI
  entrypoints, CLI filenames, routes, migrations and model behavior.
- Added frontend/backend import guards, failure fixtures and CI checks.
- Fixed source-manifest discovery after evaluation moves. New reports hash all
  14 required sources and fail on missing files. Frozen reports were not rewritten.
- Isolated a test-only auth route that previously mutated the global app during
  collection. The full-suite contract check now measures production routes.
- Fixed two existing data-transfer problems found during browser verification:
  status and upload history now select only metadata in SQL. Status reads head
  and release metadata together, avoiding mixed-release revision/count reads.
  History remains limited to ten receipts; neither query transfers the full
  release into the API process. Database-side JSON parsing cost is not eliminated.
- Added current structure/docs/contributor maps. Kept the original proposal as
  historical context, and kept existing launchers and runtime lockfiles.

The ignored baseline manifest records 478 tracked files. Checksums confirm all
28 protected migration, retained research-result and recorded corpus-export
files selected from that manifest are unchanged. No corpus import, publication
activation, account provisioning or production schema migration was performed.

Legacy folder `1/` was inventoried without modification: 159 matching files,
157 differing files and zero legacy-only file paths in the bounded source
inventory. Environments, secret files, logs, dumps, caches and files over 10 MiB
were excluded. Identical paths do not prove identical logic. The folder remains
on disk and is now explicitly ignored to prevent accidental checkout commits.

## Local verification

Host: Windows, Python 3.13.5, Node 22.17.1. Container runtime: Linux,
Python 3.11 and Node 24 as selected by the existing Dockerfiles. CI retains its
Python 3.11/Node 24 profiles and original thresholds.

| Check | Actual result |
| --- | --- |
| Baseline frontend suite | 196 tests passed |
| Baseline backend suite | 643 tests passed; 17 excluded integration/model cases |
| Final frontend suite with CI coverage thresholds | 213 tests in 34 files passed; lines 88.69%, branches 75.73%, functions 76.63%, statements 84.87% |
| Frontend dependency guard and failure fixtures | 79 source files pass; 3 Node tests pass |
| ESLint, TypeScript/production frontend build | Pass; existing >500 kB chunk advisory remains |
| Final backend suite | 649 passed, 17 deselected; 82.81% coverage; original 70% minimum retained |
| Strict mypy | 213 source files pass |
| Ruff | Backend, operator and infrastructure profiles pass |
| Offline infrastructure tests | 30 pass, including backend boundary failure fixtures |
| Static deployment contracts | Compose isolation, CI filters, Docker policy, model URL and local documentation links pass |
| PowerShell syntax contracts | 8 scripts pass |
| API/publication drift checks | Local, cloud and publication snapshots pass |
| Fresh minimal cloud environment | App imports without heavy AI libraries; local execution routes absent |
| Actual PostgreSQL/pgvector integration | 14 pass against a new disposable database migrated from empty to gmee07; includes publication/refresh/lease concurrency and PostgreSQL metadata queries |
| Cached real-model smoke | 3 pass, zero skips: 768-d embeddings, stance support/contradiction, original-sentence extraction; network downloads disabled |
| Cloud Docker build | Pass; final image `sha256:d251ceb06d45ff714ff2a6cdccfa79c063577f681acefbc36d581bf4fb070654`, 73,232,361 bytes reported by Docker; imports without ML |
| Full local stack HTTP smoke | Pass: nginx syntax, three-store readiness, real migrations, SPA headers, registration/login, protected-action denial, comparison and evaluation controls |

The full-stack smoke image was built before the final history-only optimization;
the latest history path passed the full backend suite, API fixtures, real
PostgreSQL integration and final cloud-image build. The exact PR head must still
pass the required remote CI, including its fresh full-stack build, before merge.

No scientific labels or corpus records were written by the HTTP smoke. It used
the isolated `gmee-foundation-smoke-20261016` project with tmpfs data and no host
ports; its containers/networks were removed afterward. Integration databases
were newly named; the original `gmee` database and volumes were not migrated.

Detailed logs, inventory and screenshot are retained locally under ignored
`output/project-foundation/`; credentials and complete private exports are not
included in this report or committed.

## Browser verification

Built frontend at `http://127.0.0.1:5050` using the reorganized cloud app on
`http://127.0.0.1:8003/api/v1`, reading the existing managed published collection.

Verified through the real interface:

1. Landing page -> sign-in -> authenticated article reader.
2. Published date and totals load: 7,421 articles, 5,157 claims, zero relationships.
3. Search `modi` returns 121 matches and stores query/offset in the hash.
4. Opening an article preserves its source and the nine article tab destinations.
5. Claims and graph routes stay within that article and explain missing records.
6. Back to results restores the same query and offset.
7. Reload ends the memory-only session; sign-in restores the intended article URL.
8. Tools directory explains available tools versus local-PC capabilities.
9. Existing approved developer sign-in exposes the upload page and both retained
   upload receipts. No upload or publish button was submitted.

After the metadata fix, one status measurement against the managed release
returned HTTP 200, 360 bytes and 0.851 seconds. This is one observed request,
not a latency percentile or capacity benchmark. Revision 1 and the existing
published collection remained active.

## Release and remaining work

This branch requires PR review and exact-head CI before merge. A merged commit
still requires Render deployment and post-deploy checks before a live-change
claim. No production-readiness or paper-readiness rating follows from this work.

- Stance implementation still lives in the verdict engine; two precise existing
  helper dependencies from the LLM compatibility adapter are documented guard
  exceptions. They are not a general permission for new adapter/service coupling.
- Complete-release download/review ergonomics, larger-release budgets and
  restore rehearsals remain open. Metadata-only polling is one completed part.
- Separate worker execution, prepared model lifecycle/version metadata,
  independent human evaluation and frozen research results remain roadmap gates.
- Route bundle optimization remains open; the build warning was not suppressed.
- Teammates still need to perform an uncoached usability check. Automated tests
  cannot establish that a first-time visitor understands the product.

Follow [the task sheet](../../TASK_SHEET.md) and
[current project structure](../PROJECT_STRUCTURE.md) for the next scoped change.
