# Recorded graph contract and layout method

Implemented locally: 2026-10-18. Layout version: `recorded-force-v1`.

## Scientific interpretation

The primary mode is a weighted layout of **recorded relationships**. It is not
an embedding projection, truth detector, copying detector or transmission map.
The former implementation imposed a golden-angle disk on unlinked records,
snapped connected layouts to a hexagonal lattice and packed components in rings.
Those shapes could be present even with no relationship data. The old similarity
target range, 38–50 units, also provided little visible score differentiation.

The replacement positions connected records only. Isolates remain searchable
and paginated in a separate record list. A fetched graph with no usable links has
no node canvas. The interface distinguishes a failed request, malformed response,
empty records, missing links, filters removing links, and hidden unlinked records.
Known zero source totals are stronger evidence than zero links in a bounded view;
the copy explicitly distinguishes them.

## Additive API contract

Existing `nodes`, `edges`, and `counts` remain supported. Legacy responses without
relationship metadata are labelled unknown; a numerical score does not establish
that an edge is similarity.

| Field | Meaning |
| --- | --- |
| Node `id`, `title`, `domain` | Stable record identity and supplied display/source text |
| `kind`, `article_id`, `url`, `published_at` | Record kind, owning article and source metadata when supplied; unavailable values remain absent/null |
| Edge `id`, `src`, `dst` | Stable relationship-group identity and endpoints |
| `relationship_type`, `directed` | Typed relationship and arrow convention; unknown direction is null |
| `score`, `score_kind`, `score_family` | Recorded numerical value, interpretation and comparability family |
| `score_min`, `score_max`, `support_count` | Underlying returned-record range/count for a projected group |
| `references`, `references_truncated` | Up to 25 underlying claim references with owning article IDs |
| `run_id`, `basis` / `edge_source` | Immutable published release where available, and source of the records |
| `scope` | Source totals if known, hard limits, returned underlying count, within-node count, truncation, selection/aggregation policy |
| `counts` | Returned normalized nodes and relationship groups, not whole-corpus totals |

Similarity (`SIMILAR`, `SIMILAR_TO`) is undirected. `EVOLVED_FROM` points from
child to candidate parent, as stored by the evolution pipeline. `DUPLICATE_OF`
points from duplicate to canonical record. Neither arrow means observed copying
or transmission. Unknown types retain their name and supplied boolean direction;
without valid direction metadata they use a dashed line.

The client rejects malformed array envelopes and bounds input to 10,000 nodes /
40,000 relationships. Duplicate IDs, missing endpoints, self-links, invalid
records, invalid scores and capped input are counted in validation notices.
Finite scores in [0,1], including zero, are retained. Other scores become null;
the normalized raw value is retained for export diagnostics. Unsafe source URLs
never become outbound source links. Source/query objects are not mutated.

## Selection and projection policies

Published article and claim graphs are pinned to the active release read at the
start of the request. Limits remain **1,000 nodes / 2,000 underlying links**.
The server reads at most 2,001 candidate links in stable edge-ID order, admits
both endpoints together while space permits, then fills remaining node slots
with stable node-ID order. Article mode prioritizes cross-article links before
within-article ones. This is an edge-aware bounded selection, not a random or
representative statistical sample. It may omit later connected components.

Article projection groups accepted claim records by endpoint pair and type;
undirected pairs are canonicalized and directed pairs preserve order. The group
score is the maximum returned score, accompanied by its range, support count and
bounded claim references. Counts describe accepted records, not unseen evidence.
Within-article relationships are counted separately rather than drawn as loops.
Source totals describe all rows of the same release; truncation is explicit.
No N+1 database reads or inference are introduced.

Local Neo4j article reads now cap at **10,000 nodes / 40,000 relationships**,
prefer recorded endpoints, fill remaining nodes, and return known source totals.
They have a 12-second query budget and return 503 on timeout. Local PostgreSQL
claim reads cap at **3,000 nodes / 6,000 links**, prioritize endpoints of a bounded
saved-edge selection, and have a 15-second budget. Their global totals and
completeness remain explicitly unknown. These mutable local sources have no
immutable release ID. Both graph types may still require indexed store scans.

The local claim reader no longer silently falls back to KNN when saved links are
absent. The existing KNN path requires explicit `infer_similarity=true` and is
labelled `pgvector_knn`. The ordinary website does not request it. This change
does not alter data ingestion, relationship analysis or publication.

## Layout algorithm and distance

The solver uses the narrow, pinned `d3-force@3.0.0` package and
`@types/d3-force@3.0.10`. D3's mutable particles/links are private copies. The old
custom solver, lattice snapping and circular packing were removed. This choice
provides a maintained Barnes–Hut repulsion implementation and collision force
without installing a full visualization framework. See the official
[simulation](https://d3js.org/d3-force/simulation),
[link](https://d3js.org/d3-force/link) and
[many-body](https://d3js.org/d3-force/many-body) documentation.

Preferred spring distances, in layout units:

- Named, comparable similarity family with a valid score: `45 + 150 * (1 - score)`;
  score 1 prefers 45 units and score 0 prefers 195.
- Duplicate membership: 55 units; its score is not treated as similarity.
- Evolution, unknown interpretation/family or missing score: neutral 100 units.

For each endpoint pair and type, multiple evidence records contribute one spring
using the shortest preferred distance. Constraints of different types share the
mean of their target lengths; raw scores from different families are not averaged
or given a common threshold. The inspector preserves all normalized groups even
when the spring representation is simpler. Scores are not calibrated probabilities.

Initial positions use seeded jitter, not final decorative placement. The default
seed is 104729; the version, seed and resulting positions are exported. Stable
sorted input produces repeatable coordinates in the same implementation/runtime.
Repulsion strength is -65, link strength .25, velocity decay .4, and collision
radius is node radius +3. Radius is `4 + min(3, log2(1 + displayed degree) * .55)`.
Degree means distinct neighbors in the filtered view, not corpus importance.

Each component receives 180 ticks up to 500 nodes, 100 up to 2,000 nodes and 32
above that; large components use a looser Barnes–Hut theta and one collision
iteration. Maximum remaining velocity below .5 is reported as cooled; otherwise
the interface reports **iteration limit reached**. No universal overlap or
distance guarantee is claimed for dense or unfinished layouts. Bounding-box shelf
packing separates components. Packing gaps have no semantic interpretation.

Actual screen distance is influenced by the whole network, competing links,
repulsion, collisions, density, packing and user pins. It is not an exact semantic
metric, elapsed time, graph hop count or truth probability. A genuinely symmetric
topology may retain symmetry. No shortest-path or embedding-projection feature is
claimed by this implementation.

## Lifecycle, interaction and export

Layout runs in a module worker with progress, cancellation, stale-result rejection
and a 20-second wall budget. Large unsupported-worker browsers keep the list
instead of blocking the main thread; the <=500-record fallback yields every five
ticks. Only necessary layout fields are cloned into the worker. Four completed
layouts are cached per mounted graph. Unchanged refetches preserve the canvas,
camera, selected record and pins. Scope, mode, source version, topology or seed
changes deliberately select a new layout. Recompute changes the seed; Reset view
fits the camera; Clear pins restores computed positions. Pins never write records.

Canvas draws only for changes and interactions, with no permanent physics/RAF
loop. Hidden unfinished layouts are cancelled. Resize/high-DPI rendering uses a
bounded pixel ratio of 2; touch vertical scrolling remains available. Keyboard
selection, paginated records and exact neighbor lists provide canvas alternatives.
Escape closes the inspector and restores picker focus. There is no animated
transition requiring motion; ordinary page focus styles remain in use.

Search explicitly searches fetched titles and adds exactly their direct neighbors
after outlet/type/score filters. Thresholds apply only to the selected named
similarity family; other families remain. Details links preserve current graph
filters, selected node and selected claim. Camera and pins persist across unchanged
refetches, not across a page reload or article-page unmount. The picker bounds its
options to 200; searching and paginating can reach all fetched records.

`gmee-graph-view-1` JSON export contains permitted normalized records/relationships,
source scope, release, filters, diagnostics, timestamp, seed/version, positions,
pins and camera. It whitelists fields rather than exporting article/model objects
or embeddings. It is a reproducible visualization artifact, not a full experiment
or proof of truth. No image-export feature was added.
