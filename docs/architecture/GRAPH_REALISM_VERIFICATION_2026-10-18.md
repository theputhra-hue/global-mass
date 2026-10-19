# Recorded graph implementation and verification

Date: 2026-10-18, Asia/Calcutta. Local working tree; no push or deployment.
Method/contract: [RECORDED_GRAPH_V1.md](../contracts/RECORDED_GRAPH_V1.md).

## Outcome and preserved work

Replaced the imposed disk/lattice geometry with a bounded relationship-driven
worker layout, typed API projections, source/sampling explanations, exact neighbor
inspection, filters, reproducible export and honest no-link browsing. Legitimate
topological symmetry remains possible. This does not generate missing links.

Existing article analytics, sidebar corrections and Antigravity's developer upload
and workflow changes remain in the shared working tree. Antigravity's status
explicitly released frontend ownership. Daily-analysis backend packages C1–C3
remain planned; graph verification does not implement preflight/export/startup work.
The broad Python `lib/` ignore rule was narrowly exempted for the graph source
directory so the new solver files will not disappear from a future commit.

## Actual data check — separate from fixtures

Read-only cloud-profile API on local port 8003, using the existing immutable
published data. Frontend production preview on localhost:3000.

- Active release: `8121d828-a47e-47cc-b5f6-a578984b694d`.
- Source totals: **7,421 articles, 5,157 claims, zero stored relationships**.
- Both graph modes return 1,000 records, zero links, 1,000 unlinked records,
  the 1,000/2,000 limits and an explicit partial-projection notice.
- Browser confirms **zero canvas elements** for the real no-link graph, with a
  useful record list. Pagination moved from records 1–12 to 13–24; selecting BBC
  restricted article records to 72. Clearing filters restored the view.
- Claim details opened the owning article's Claims page with the requested claim
  selected; Back to results returned to `#/dashboard/fullgraph?mode=claims`.
- Existing developer sign-in used; no accounts, credentials or permissions changed.
  Only approved access showed the existing developer-workflow link.
- The first graph load timed out at the existing 15-second transport budget.
  The page showed an actionable error, and Retry recovered. A separate read-only
  HTTP request returned 200 in **3.71 seconds** with 426,058 bytes. This is not a
  latency SLA; network/free-database cold starts remain an operational constraint.

No AI stage, dataset replacement, link generation or publication was run.

## Automated checks

Frontend final verification: **277 tests in 39 files pass**, including zero links,
malformed data/scores, threshold families, one-hop search, controlled score-distance
effects, pair/chain/star/clique/component fixtures, immutability, finite coordinates,
determinism, spacing on a controlled clique, 10,000/40,000 retention, worker
cancellation/refetch behavior, export whitelisting and article/claim return state.

Full V8 coverage with unchanged CI gates (lines/functions 60, branches 50,
statements 60): statements **82.50%**, branches **75.67%**, functions **77.26%**,
lines **89.26%**. The former FullCorpusGraph coverage exclusion was removed;
new graph model/layout/state code participates normally. Tests do not require
ornamental halos/lattices. The existing 15-second large-test timeout was retained.

ESLint, TypeScript production build, frontend architecture guard (93 files) and
its three deliberate failure fixtures pass. Backend Ruff and mypy pass for the
changed graph reader/projection modules. Combined article/graph/publication/cloud
regression suite: **39 tests pass**. Backend dependency directions pass.

Backend tests verify endpoint-priority bounded sampling, release isolation,
type/direction preservation, score aggregation/support references, truncation,
and that empty local claim reads do not silently infer links. A fresh cloud
runtime import check passes without torch, spaCy, transformers, sentence-transformers,
BERTopic, sklearn, NumPy or pandas; local execution routes remain absent.

## Browser fixture checks

All synthetic data is served by an isolated ignored harness on localhost:3001,
with an explicit **SYNTHETIC / NOT PUBLISHED DATA** banner and fake example.org
sources. It has no account or publication writes. It imports the actual graph UI,
worker and compiled application styles. No fixture route was added to production.

The 24-record case contains two dense groups joined by a weak link, a separate
chain/evolution component and two isolates: 22 mapped nodes, 62 relationship
groups, two connected components. Verified mouse selection and drag-to-pin;
downloaded JSON confirms the pin. An unchanged refresh preserved all exported
positions, pins and camera; zoom remained 125%. Clear pins and Reset view work.
Keyboard picking record 21 showed an outgoing candidate-parent relationship.
Escape closed the inspector and restored focus to the picker.

Selecting the evolution type produced one relationship and 22 unlinked records.
Setting the named similarity threshold to 1 also retained the separate evolution
family. Export was downloaded through the normal UI and parsed: 24 public nodes,
62 typed edges, 22 positions, seed 104729 and the recorded layout version. Unit
tests independently verify that arbitrary private node fields are excluded.

At **390 × 844**, synthetic and real views had document width 382 at viewport
390, with usable stacked controls and no horizontal overflow. Mobile zoom works;
vertical page scrolling remains available. This was viewport emulation, not a
physical touch-device or screen-reader test.

Browser: ChatGPT in-app Chromium browser on Windows; exact browser build not
captured. CPU: Intel Core 7 240H, 16 logical threads. The isolated dev harness uses
a visible PerformanceObserver long-task counter and canvas draw counter. Timings
include ordinary machine/runtime noise and are single observations.

| Fixture | Worker elapsed | Passes/status | Observed main-thread tasks |
| --- | ---: | --- | --- |
| 24 nodes / 62 groups | 15 ms | 360 total, cooled | One initial 52 ms task |
| 1,000 / 2,000 | 541 ms | 100, iteration limit | Same counter/max remained; no additional long task during layout |
| 10,000 / 40,000 | 1,688 ms | 32, iteration limit | One 121 ms task; zoom to 125% worked |

After the 1,000-node view settled, canvas draw count stayed **40 → 40** across an
idle observation interval of at least two seconds. The worker does no idle physics.
At 10,000 records there is measurable synchronous normalization/rendering cost;
the worker does not eliminate all main-thread work. No 60 FPS or unlimited-scale
claim is made. Browser console checks on the final fixture and real page showed
no captured errors. Early harness configuration/style errors were corrected and
excluded from these measurements. An initial download-tool stall was resolved
by bringing the control into view and using a bounded download wait; the product
download was verified successfully.

## Solver benchmark and bundle

One uninstrumented Node v22.17.1/Vite SSR run on the same CPU, including
normalization and layout, produced:

| Nodes/links | Elapsed | CPU time | Heap delta | Finite coordinates |
| --- | ---: | ---: | ---: | --- |
| 24/62 | 33 ms | 141 ms | +10.97 MiB | yes |
| 1,000/2,000 | 446 ms | 515 ms | −6.25 MiB | yes |
| 10,000/40,000 | 1,713 ms | 2,109 ms | +165.68 MiB | yes |

Heap delta is **not peak memory, process RAM or browser RAM**. A negative value
reflects garbage collection; it does not mean the layout uses no memory. The
larger configurations intentionally stop before velocity cooling. These tests
exercise the existing supported cap, not an arbitrary unbounded graph.

Production main JS: 596.18 kB / 167.24 kB gzip, compared with the preceding
article-fix build's 582.36 / 162.57 kB. Separate worker: 17.28 kB; fallback layout
chunk: 16.83 kB / 6.88 kB gzip. CSS remains 63.28 / 11.07 kB. Vite's existing
>500 kB main-bundle advisory remains visible, not suppressed. Narrow D3 imports
are isolated from the main bundle except for the explicit fallback chunk.

## Repeatable evidence and limits

Ignored evidence lives in `output/graph-verification/`: frontend/backend logs,
`benchmark-results.json`, `benchmark.mjs`, clearly labelled fixture harness,
downloaded `browser-export.json`, and real/synthetic desktop/mobile screenshots.
The earlier frontend check log is in `output/navigation-review/`.

Core commands (from frontend or backend as appropriate):

```text
npx vitest run --coverage --coverage.thresholds.lines=60 --coverage.thresholds.functions=60 --coverage.thresholds.branches=50 --coverage.thresholds.statements=60
npm run lint
npm run check:architecture
npm run test:architecture
npm run build
python -m pytest tests/test_article_insights.py tests/test_graph_contracts.py tests/test_published_results.py tests/test_cloud_isolation.py -q
python -m ruff check app/api/v1/graph.py app/api/v1/published.py app/services/publications/graph_projection.py tests/test_graph_contracts.py tests/test_published_results.py
python -m mypy app/api/v1/graph.py app/api/v1/published.py app/services/publications/graph_projection.py
python infra/scripts/check_backend_architecture.py
python infra/scripts/check_cloud_runtime.py
node output/graph-verification/benchmark.mjs
```

The Windows restricted runner stalled while initializing pytest; the same suite
completed outside that restriction. Actual Neo4j and nonempty local PostgreSQL
graph queries were checked with contract fakes, not a running populated local
store. Connected published projections were integration-tested with SQLite
release fixtures; the real published release has no links to exercise that path.
There is no real connected-data scientific validation or new misinformation
measurement. Screen-reader, cross-browser and physical touch-device testing remain
outside this verification. A real reviewed relationship-analysis/publication run
is a separate task. No Git commit/push/merge or Render rollout was performed.
