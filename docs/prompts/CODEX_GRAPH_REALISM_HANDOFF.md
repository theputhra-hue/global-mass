# Codex implementation prompt: an honest, relationship-driven research graph

Prepared: 2026-10-18, Asia/Calcutta.
Purpose: paste or reference this prompt in the next Codex turn to implement the
graph work. This preparation document does not change application behavior.

---

You are the lead engineer implementing GMEE's research graph. Work thoroughly
from the existing code and actual data, implement the change end to end, and
verify it. The goal is an understandable network whose layout reflects recorded
connections, with truthful explanations of distance and missing information.
Do not stop at a design, cosmetic randomization, or a screenshot of fixture data.

## 1. Preserve the current project

Workspace: `D:\expirements\GMEE`. Inspect current Git status, applicable repository
instructions and coordination files before editing. The branch currently has
uncommitted Antigravity developer-workflow work plus Codex article analytics and
navigation corrections. Preserve all of it. Read:

- `docs/architecture/ARTICLE_ANALYSIS_UI_FIXES_2026-10-18.md`.
- `docs/architecture/DAILY_ANALYSIS_PARALLEL_PLAN.md`.
- Both files in `docs/coordination/`.

Antigravity previously released frontend ownership; verify the current status
before assuming it remains released. Do not reset, clean, stash away or overwrite
other work. Keep this graph task distinct from unfinished daily-analysis backend
packages. Do not silently mark those packages complete.

Do not change credentials, accounts, cloud publication, original corpus data or
deployment settings. This task authorizes local implementation and testing, not
automatic live data generation, publication, Git push, merge or Render deployment.

## 2. Reproduce and explain the real problem

Inspect these actual implementation points:

- `frontend/src/features/graph/components/FullCorpusGraph.tsx`.
- `frontend/src/features/graph/lib/corpusGraph.ts`.
- `frontend/src/shared/api/graph.ts`.
- `frontend/src/app/layouts/PublishedWorkspace.tsx`.
- `frontend/src/features/articles/pages/ArticleInvestigation.tsx`.
- `backend/app/api/v1/graph.py`.
- `backend/app/api/v1/published.py`.
- `frontend/tests/corpusGraph.test.ts`, graph component tests, and cloud-reader tests.

Current root causes confirmed during prompt preparation:

1. `articleScene` deliberately positions unlinked nodes using golden-angle,
   constant-area spiral placement. A release with no edges therefore looks like
   a circular disk; it conveys no measured similarity between those dots.
2. Connected components get a finite force pass, then a hexagonal-slot assignment
   that can displace the force result. Components are packed into rings and
   isolates into an annulus, further giving a decorative circular appearance.
3. Link-score target lengths currently vary over a narrow 38–50 layout-unit
   range. Explain its effect before replacing it; do not assume all stored
   scores have the same meaning.
4. GraphEdge/GraphLine discard much of the relationship meaning. Published
   article projection currently drops relation type and can return multiple
   claim links between the same article pair, including within-article links.
5. UI descriptions call claim edges near-duplicates even when saved relationship
   types can include similarity and candidate evolution.
6. Cloud graphs currently select at most 1,000 nodes and 2,000 edges; these are
   bounded projections, not an exhaustive graph of 7,421 articles. Local full
   graph queries currently have different bounds and data sources; audit them.

Last verified release: 7,421 articles, 5,157 saved claims, **zero stored
relationships**. Recheck read-only; do not assume these figures remain current.
Zero edges in a selected/filtered subgraph must be distinguished from zero edges
in the whole release and from a failed relationship request.

## 3. Establish what distance means

Choose one documented primary mode: **weighted recorded-relationship layout**.
Connected nodes exert link forces; unconnected nodes repel/collide for readability.
Within a comparable similarity-score family, stronger valid scores should map
monotonically to shorter preferred link distances. State the chosen formula,
range, assumptions and behavior for missing/invalid scores. Do not silently treat
a missing score as zero similarity or NaN as a valid coordinate input.

Rendered Euclidean separation is an approximate layout outcome influenced by
the entire graph, repulsion, collisions, density and constraints. It is not exact
semantic distance, a probability of truth, evidence of copying or elapsed time.
Disconnected component packing and isolate placement have **no comparative
semantic distance interpretation**. Include that explanation in the interface.

Graph shortest-path distance is another distinct quantity. If shown in an
inspector, define it as hops in the displayed graph and label disconnected pairs
as unreachable there; do not equate it to pixels or reach across a truncated view.
Do not add a shortest-path feature merely to fill space if core work needs time.

Preserve legitimate symmetry in a symmetric graph. The objective is to remove
imposed ornamental geometry, not to force every real network to look asymmetric.
Never infer semantics from title order, outlet identity, color or random jitter.

A future embedding projection would be a separate named mode requiring actual
versioned embeddings, an explicit metric and projection evaluation. Do not claim
it exists or generate it from text in this lightweight cloud graph task.

## 4. Fix the no-edge and isolate experience first

When the fetched valid graph has zero usable edges, show a prominent network
unavailable state: articles/claims exist, but recorded connections are absent
within this graph scope. Explain whether whole-release totals are known.

Use searchable, paginated/list-based unlinked records as the useful default,
with existing source/article/claim-detail links. An optional unlinked-node map
must be labelled as non-semantic placement; do not present a decorative disk as
an observed network. Do not show an endless empty simulation or a misleading
“connected corpus” heading.

Distinguish: no nodes, no fetched edges, no edges after filters/threshold, all
isolates hidden, unavailable API, connecting/waking cloud and malformed data.
Offer relevant Retry/Clear filters/Show unlinked records actions. Ordinary users
must not be offered local developer execution. Approved developers can receive
a link to the existing workflow with guidance; do not trigger jobs automatically.

For mixed graphs, emphasize connected components; give isolates a separate
labelled shelf/list or explicit visibility toggle. Show the number hidden.
Component packing must prevent overlap without implying links between components.

## 5. Normalize and preserve relationship meaning

Design an additive typed graph contract that works with local and published
sources and tolerates the previous response format without inventing metadata.

Include or explicitly mark unavailable:

- Stable node IDs, node kind, owning article IDs, source/domain, date and title.
- Stable edge identity, source/destination, relationship type, raw score,
  score interpretation, direction convention and data basis.
- Release/run identifier and graph selection scope where available.
- Returned counts, known total counts, limits, truncation and selection strategy.

Maintain separate semantics for undirected similarity, duplicate records and
directed candidate evolution. Candidate evolution is not observed transmission.
Confirm the current child-to-parent convention in code; arrow and inspector
copy must match it. Unknown types remain visible as unknown rather than being
relabelled as similarity. Do not combine unlike score families in one threshold.

For article projections, specify how multiple claim edges are represented.
Prefer a documented per-pair/per-type aggregation preserving supporting link
counts, score range and underlying claim references. Keep directed edges directed.
Report within-article links separately rather than losing them or drawing
unexplained article self-loops. A layout may use a simplified spring graph while
the inspector preserves the full underlying relationship records and counts.

Validate dangling endpoints, duplicate IDs, repeated edges, invalid scores,
non-finite values and unsafe URLs. Explain discarded/unusable records in bounded
diagnostics; do not silently invent or corrupt scientific records. Never serialize
whole ORM objects or publish embeddings/private annotations to make rendering easy.

Improve bounded selection so a slice of isolated articles does not hide every
real connected component when links do exist. Document an edge-aware sampling
policy, retained isolates and limits. Keep a stable release scope. Apply hard
server limits and safe timeout behavior to large local queries as needed; do
not remove caps to claim the whole corpus is visible. Avoid N+1 queries.

## 6. Implement a stable topology-driven layout

Separate normalization, graph analysis, layout calculation, rendering and view
state. Keep source API/query-cache objects immutable; node dragging must operate
on separate layout state. Audit the existing mutation of scene coordinates.

Use bounded weighted link forces, scalable repulsion, collision avoidance and
component handling. Replace post-layout lattice snapping with topology-preserving
collision handling. Deterministic initial jitter is allowed as initialization,
never as the final explanation of structure. Record seed and layout version.

Evaluate the existing solver against a small maintained layout library before
choosing. Reuse current Canvas rendering where appropriate. If adding d3-force
or another package, verify official documentation, compatible types and bundle
impact; add the narrow required dependency, not an entire visualization suite.
Useful primary references: [D3 force](https://d3js.org/d3-force),
[link forces](https://d3js.org/d3-force/link),
[simulation](https://d3js.org/d3-force/simulation).

Use a Web Worker for expensive layouts when measurements justify it, or a
measured bounded/chunked alternative with no material UI freeze. Handle stale
results and cancellation when filters, mode or release change. Set a finite
iteration/time budget, report unfinished relaxation honestly, and stop when
converged or hidden. No permanent idle physics loop or repeated polling relayout.

Keep stable positions for unchanged nodes on the same release/settings. Preserve
pan, zoom, pins and selection across harmless refetches. Reset deliberately when
mode/release changes or the user requests it. Provide separate Reset view and
Recompute layout actions if they have different effects. Clear stale selections.
Dragging, pin/unpin and neighbor highlighting must not alter backend records.

## 7. Make the network understandable and usable

Match GMEE's existing fonts, red/bone palette, spacing and shared shell. Keep
outlet colors stable with a visible legend. Color alone must not carry meaning.
Use consistent node-size semantics such as distinct displayed neighbor count;
avoid mixing corpus-wide degree with filtered degree or implying importance/truth.

Core controls: article/claim mode, explicit search, outlet filter, relationship
type filter, comparable-score threshold when valid, connected/unlinked visibility,
fit/reset, zoom and node inspection. Show visible/fetched/known-total counts with
scope labels; explain thresholds operate on the fetched subgraph if so.

Provide an exact accessible neighbor list with relationship labels, score meaning,
supporting claim references and links to article details. Preserve return state
and selected claim on drill-down. Distinguish search matches from added one-hop
neighbors. Do not relayout merely on hover; avoid tooltip occlusion and trapping.

Support keyboard node selection/list alternatives, visible focus, Escape to
close an inspector, screen-reader summaries, touch interaction, reduced motion,
resize/high-DPI rendering and narrow screens. Keep graph controls usable while
layout computes; do not trap normal page scrolling in an oversized canvas.

Add an unobtrusive “How to read this graph” explanation: dot, line, arrow, score,
color, node size, distance, isolates and sample limits. For research use, provide
a permitted-data export of the displayed normalized graph plus layout seed,
version, filters, provenance, coordinates and timestamp. If image export is
implemented, include a legend and graph scope. The export is a reproducible
visualization artifact, not evidence of truth or a complete experiment.

## 8. Test the behavior, not visual randomness

Create clearly labelled synthetic test fixtures for zero edges, a single pair,
weighted chain, star, two dense groups joined by a weak bridge, disconnected
components, symmetric clique, mixed directed types, duplicate projected edges,
isolates, malformed scores, dangling endpoints and large bounded networks.
Fixtures must never appear as real published data.

Assert invariants: no lost valid node/relationship records, immutable inputs,
finite coordinates, reproducibility with the same seed/configuration, usable
spacing, correct grouping, correct directions and stable state across refetches.
For score effects, use controlled fixtures and relative/statistical checks rather
than demanding every linked pair be closer than every non-linked pair. Dense
graphs and competing constraints do not permit such a universal guarantee.

Remove tests requiring the old halo/lattice only after replacing them with
meaningful topology and no-edge assertions. Do not weaken coverage gates, extend
timeouts to conceal unbounded work or accept a merely noncircular picture.

Test edge-aware sampling, release isolation, type preservation, aggregation and
truncation through backend queries if changed. Verify the cloud still imports
no ML libraries and offers no local pipeline execution.

Measure layout elapsed time, main-thread blocking, idle work, memory behavior,
render/interaction responsiveness and bundle delta at realistic sizes. Include
the current 1,000-node/2,000-edge cloud cap and larger local fixtures up to existing
10,000-node/40,000-edge tests where supported. Record hardware/browser and measured
results; do not invent benchmarks, promise 60 FPS or imply unlimited scale.

Run relevant tests, full frontend checks, lint, build and architecture guards.
Use the browser for both actual zero-link published data and clearly labelled
connected test data. Verify mouse, keyboard and 390 px mobile behavior. Capture
screenshots with legends/scope and retain commands/logs in an ignored output folder.
Real-data checks and fixture checks must be reported separately.

## 9. Finish with a candid handback

Deliver implemented source, regression tests, a concise graph contract/method
document and a verification report. Explain the old symmetry, the new distance
semantics, chosen score mapping, sampling policy, remaining missing data and
measured performance. List paths and actual checks, and identify anything not
tested. Leave an appropriate local preview open if available.

If the real release still has no edges, the finished interface should say so and
provide useful browsing. Connected fixture demonstrations do not mean real
connections were generated. Identify a separate local-analysis/publication task
if that is needed; do not silently run it or claim the visualization fixed data.

Complete essential data integrity, no-edge handling and weighted layout first;
then interactions, reproducibility and performance verification. Prefer a coherent
working graph over a long list of unfinished controls. Preserve all existing
article analytics, sidebar corrections and Antigravity changes. Report Git and
deployment status accurately and stop before unrequested rollout.
