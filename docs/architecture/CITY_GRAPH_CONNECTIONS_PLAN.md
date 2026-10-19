# GMEE City Graph — Product, Visual Design and Engineering Master Plan

Version 2 · 20 October 2026 · Planning only

This replaces the earlier city-connections proposal. It specifies the complete
experience, meaningful size differences, graph methods, release architecture,
implementation order and acceptance tests. It changes no application code or
published data. All analysis continues locally; the cloud serves reviewed results.

## 1. Product vision and success criteria

Build an explorable research atlas: articles form neighborhoods, related
neighborhoods connect through highways, and broader themes connect through
superways. A newcomer should understand the collection before opening advanced
controls. An investigator should be able to trace any displayed route to its
supporting source records.

The initial screen answers: what this collection contains, what the colors and
sizes mean, which connections are shown, how current the release is, and how to
find a particular subject. The graph is a working instrument, with a carefully
composed overview, readable local detail and explainable relationships.

Quality is demonstrated by task success, trustworthy encodings, accessibility,
measured responsiveness and reproducible data. “Best in the world” is an ambition,
not a performance or scientific claim we can establish before evaluation.

Current baseline: 7,421 articles, 98 machine-generated topics, 2,334 unclassified,
5,157 extracted claims and 300 recorded claim relationships. Existing article
projection groups those relationships into 213 article links. There are 7,372
usable article embeddings and 49 unsupported-language inputs. Most article inputs
are titles only. These scopes must never be mixed in a headline count.

## 2. The first impression

Open to a composed **Collection city** overview with meaningful aggregate routes
already visible when published road data exists. Do not make users discover a
hidden checkbox to understand why the product is a graph. If roads are not yet
published, say so directly and offer the existing recorded links.

Use a short explanation: “Explore related reporting. Larger topic hubs contain
more articles; wider routes have more supporting similarity links.” A compact
legend always explains size, color, line type and the current zoom level.

The map receives most of the screen. Avoid stacking long explanatory cards above
it. Show essential scope and release status in a compact strip; put detailed
methodology in an accessible inspector. Keep the original source one action away.

Default experience: overview → choose a theme/topic or search → inspect an article
or route → open sources → return to the same investigation state.

## 3. Spatial hierarchy and exact visual vocabulary

| Object | Role | Proposed detail-level size | Meaning of its size |
| --- | --- | --- | --- |
| Article | One real source record; circular mark | 5–14 CSS px diameter | Retained semantic-neighbor degree in this release; zero remains visible |
| Topic hub | Synthetic neighborhood navigation object; outlined rounded square | 24–48 px | Number of member articles |
| Theme hub | Synthetic group-of-topics object; double-outline rounded square | 56–80 px | Number of distinct member articles, without double-counting |
| Selected object | Same object plus high-contrast outer halo | Original size plus 4 px halo | Selection state only; metric value is unchanged |
| Unsupported input | Article mark with hollow center, in an explained inset | Same minimum article size | No usable semantic projection; no invented degree |

These are prototype tokens at their intended inspection zoom, not a claim that all
three classes should simultaneously occupy those sizes in the overview. Tiny
article marks are 1–2 px at the whole-city scale, then reveal the meaningful size
range as the user approaches. The legend changes explicitly with representation.
Keep all article records available and represented; disclose overlap/occlusion.

Article degree means distinct retained document-similarity neighbors, under the
published construction policy. It is not credibility, impact, readership, truth,
source quality or the number of people exposed. A hub is not an additional article.

### Size mathematics

Freeze scale domains per release and object type; filtering must not silently
resize the same article or change its apparent importance. Use a log-compressed
area mapping with a bounded radius, rather than scaling radius directly by count:

```text
u = clamp(log1p(value) / log1p(max(1, release_p95)), 0, 1)
r = sqrt(r_min² + u × (r_max² − r_min²))
```

The 95th-percentile cap limits oversized hubs. Include numeric examples and mark
capped values in the inspector. This maps circle area to a compressed quantity;
it is not linear area-to-count proportionality. Zero and unknown are different
states. Other shapes use equivalent bounded area logic.

Default article mode: Connections. Also provide **Uniform articles** for a neutral
comparison. Changing modes updates the legend and is included in saved state.
Highlight rings and larger invisible hit areas do not alter the encoded value.

## 4. Roads, highways and superways

| Route | Connects | Proposed visible width | What it expresses |
| --- | --- | --- | --- |
| Local street | Article ↔ article | 0.6–1.4 px | Retained semantic similarity; exact score in inspector |
| Topic highway | Topic ↔ topic | 1.8–4 px | Aggregated cross-topic article-pair support |
| Theme superway | Theme ↔ theme | 4.5–7 px | Aggregated supported highways crossing themes |
| Membership spoke | Article → topic, topic → theme | 0.75 px dotted | Membership only, normally on selection |
| Recorded relationship | Existing typed records | 1.3–2.3 px, separate pattern | Recorded relation type and its supporting references |

Widths are screen-space tokens, separately normalized within each layer. The
legend shows that a street and a superway use different units. Aggregate width
uses a disclosed log-compressed count of distinct supporting article pairs; raw
count, endpoint count and size-adjusted ranking remain visible in the inspector.
A hover highlight changes contrast, not the underlying width metric.

Local streets are undirected. Arrows are used only for meaningful recorded
directions, with their interpretation shown. No moving particles or flowing light
may imply observed transmission. Recorded similarity and candidate evolution are
not interchangeable with article-topic similarity.

Render roads behind nodes. Use a restrained background casing where needed to
separate overlapping major routes. Curve highways gently; keep local streets
simple. Optional bundling is a visual aid, and selecting a bundle must unpack its
routes. A crossing is not a junction unless it is an explicit hub object.

All lines have typed endpoints and a reason. Never connect two articles because
their dots happen to be close on screen. Never add a bridge solely to make every
neighborhood connected. Disconnected components are a valid finding.

## 5. Semantic zoom and a stable mental map

Use four named viewing levels, with camera-scale thresholds tuned in prototypes:

1. **City:** themes, topics, strongest qualifying aggregate routes, subdued article
   field and concise labels. Every article is represented; synthetic hubs are
   counted separately. No wall of local lines.
2. **District:** selected theme and its topics, connected highways, topic counts,
   visible article neighborhoods and selected local examples.
3. **Neighborhood:** individual articles with size differences, local streets,
   topic membership and relevant external highways.
4. **Article:** selected record, direct neighbors and their typed connections;
   surrounding map fades but does not disappear without explanation.

The camera changes presentation, not published topology. Use hysteresis around
level thresholds so labels and layers do not flicker when zoom hovers at a boundary.
Keep a small “City / District / Neighborhood / Article” indicator and an override
for showing additional roads with the current visible/retained counts.

Start from the validated semantic projection. Topic hubs use robust representative
positions; theme positions derive from member topics. Representative hubs remain
clearly distinct from actual source records. Keep label offsets and halo placement
separate from article coordinates. Do not push articles into rings for decoration.

Label neighborhoods using low-opacity contours or split envelopes when their
points are spatially disconnected. These boundaries summarize projected membership;
they do not represent geography, exact semantic distance or verified event borders.
Do not wrap unrelated empty space with one enormous convex hull.

Layout is deterministic for the same release/configuration. Filtering keeps the
camera stable and preserves selected context. An updated release prompts the user
to refresh; it must not move a saved investigation underneath them. Topic IDs are
release-scoped. Cross-release identity matching is separate future work.

## 6. Page composition and theme integration

Desktop concept:

```text
┌ Collection city · release/date · search · save/share · help ──────────┐
│ Explore / filters │                                                 │
│ themes & topics   │        Main map and meaningful routes            │
│                   │                                    Inspector    │
│                   │                                    when chosen  │
│                   │  minimap                 fit / zoom / fullscreen │
├ scope counts · visible layers · size/line legend · load status ───────┤
└─────────────────────────────────────────────────────────────────────┘
```

On wide displays, allow a 240–280 px exploration rail and a 320–360 px inspector,
while keeping the map usable. On narrower screens, collapse one panel at a time.
Mobile uses the entire available map region plus a draggable bottom sheet with
snap points; ordinary page navigation must remain accessible. Use dynamic viewport
height, account for browser bars/safe areas, and test orientation changes.

Preserve the existing GMEE maroon, bone and red visual system. Reuse design tokens
for surfaces, borders, buttons, spacing and the existing font families. Use the
established display face for headings, readable existing body typography for
explanations, and monospace for identifiers/numbers. Dense labels need a small
background treatment; avoid long uppercase paragraphs.

Reserve red for brand/selection emphasis, not an unsupported fake-news verdict.
Theme color has one consistent purpose. Topic variants use a controlled palette;
labels and shape identify groups when colors repeat. Outlet coloring is an
explicit alternate mode, not simultaneously competing with topic coloring.

Subtle depth may distinguish hubs and the selected item. No permanent pulsing,
starfield, bloom, glossy 3D city buildings or decorative traffic. Visual emphasis
must improve reading and selection. Routes and small marks stay crisp at device
pixel ratios 1 and 2; bound higher-DPR rendering work.

## 7. Labels and readable density

Prioritize selected item → searched match → current neighborhood → important hubs.
Use deterministic collision avoidance and a viewport label budget. Labels are
screen-space sized and do not become unreadable when zoom changes. Preserve a
selected label even if this displaces a lower-priority one.

On initial overview, prioritize readable theme/topic names rather than thousands
of article titles. Show the exact label and member count on focus. Article titles
appear on deliberate hover, keyboard focus or selection, with a full inspector.
Truncate only visually; retain the complete accessible title and source link.

Distinguish density from importance. A large cloud is not automatically a major
real-world event. If an optional density layer is later added, explain that it
counts overlapping projected records, not people, reach or misinformation volume.

## 8. Interaction that supports investigation

Core controls are Search, Layers, Fit, Zoom, Fullscreen and Help. Put advanced
settings in a compact panel, not a permanent row of switches. Fit and Fullscreen
are different actions with accurate labels. On narrow screens, prevent controls
from covering the selected article or hiding behind the bottom sheet.

- Click/tap an article to pin its inspector; hover only previews.
- Click a topic to frame its neighborhood; offer an explicit expand action.
- Click a route to inspect its meaning and supporting records.
- Click empty space or Escape to clear selection predictably.
- Provide back/forward within graph exploration without taking over browser history.
- Preserve camera, selected IDs, release, layer, size mode and filters on source
  drill-down. Validate saved values; unknown IDs produce a helpful recoverable state.
- Search shows ranked results with title, outlet, topic and input basis. Selecting
  a result frames it. If filters hide it, explain and offer Reveal this article.
- A **Focus neighbors** action shows direct supported connections; optional two-hop
  expansion has explicit limits and counts. Do not call graph paths propagation paths.
- A minimap shows viewport position and supports returning to context. It uses
  the same projection and makes no second semantic claim.
- Undo visual dragging, Restore published positions, and Reset filters are separate.
  Dragging is view-only and cannot edit published coordinates.

Provide Explore and Evidence presets in one page. Explore presents topic/similarity
routes. Evidence emphasizes existing typed recorded relationships. Presets name
what changed and preserve the user's place. An explicit layer switch can combine
them while the legend keeps their meanings separate.

## 9. Inspectors and better research tools

Article inspector: full title, outlet, date and date uncertainty, original URL,
input basis, release, machine topic/theme, exact degree, typed neighbor list,
extracted-claim availability and links to existing article tabs.

Route inspector: endpoint identities, relation type, score family/method, distinct
support count, support normalization, text-basis breakdown, example references,
retention rule and the difference between exported, loaded and visible support.
Offer a sortable table of supporting pairs, with pagination; never present a few
examples as the entire backing set.

Topic/theme inspector: understandable name, machine/human label provenance, exact
member count, representative titles, outlet distribution, date coverage, within-
and cross-group links, unclassified handling and method/version.

An explain-this-view panel answers why sizes differ, why two nearby articles lack
a road, why some lines are hidden, and why an island is disconnected. It reports
counts with defined units instead of a single ambiguous “connections” number.

Research additions after the core is accepted: two-article comparison drawer,
saved investigation views using existing private casebook permissions, source/date
filters with missing-date handling, and a release comparison table. A date filter
shows publication time, not observed spread; no spreading animation is inferred.

Export a selected view as PNG and an accessible data table with legend, release,
method and scope. Plan a separate static SVG/PDF figure path for paper exports,
with embedded provenance and reproducible camera/settings. Never export private
notes into a public view. A share link shares the graph selection, not private notes.

## 10. Ground the road network in real calculations

Reuse cached, normalized article embeddings only after matching input and model
configuration fingerprints. Unsupported-language records remain visible in a
labelled inset, excluded from semantic fit and neighbor construction. The inset
must not pull the main city out of view and shrink it to an unreadable speck.

Compute cosine nearest-neighbor candidates in bounded exact-search batches at the
current corpus size. Consider approximate indexing later only after measuring
recall against exact search. Keep identical prepared input distinct from observed
copying, and retain the real article IDs.

Evaluate configurable mutual-neighbor policies such as k=5 and k=10, together
with minimum similarity thresholds. Examine title-only versus stored-text pairs,
rare/common topics, duplicates, cross-topic candidates and rejected near-threshold
pairs. Freeze a documented configuration using reviewed evidence. No universal
threshold or precision claim is assumed before measurement.

Create local streets from retained canonical article pairs. Aggregate cross-topic
streets into highways with distinct pairs and distinct endpoints on both sides.
Rank candidate highways with a documented size-adjusted measure, displaying raw
support separately. Group the topic network into machine themes through a
versioned, deterministic community method; aggregate supported cross-theme
highways into superways. Keep traceability down to supporting article pairs.

A topic centroid can propose candidates for review; it cannot substitute for
missing pair-level support. Unclassified articles may have qualifying streets but
are never forced into a topic. Islands and zero-degree articles remain visible.
Record total candidates, retained pairs, pruned pairs, component distribution,
input coverage, timing, peak memory and calibration status.

## 11. Versioned publication and project structure

Add publication v3 explicitly, preserving v1/v2 parsing and fingerprints. Store
article streets, topic highways, theme membership, superways, scale metadata and
construction provenance separately from existing claim relationships.

Each aggregate must reproduce its declared support scope. If exported roads are a
subset of the graph used for aggregation, encode that difference explicitly and
retain the backing audit; do not imply complete traceability from examples alone.
Version canonical endpoint indices and verify them against the exact article order.

The current export is about 6.5 MiB under a 10 MiB cap. Measure compact normalized
road payloads before setting a retention budget. Never truncate silently or raise
limits without measuring request and database cost. If needed, introduce a bounded
companion-artifact manifest with digests and atomic activation after all parts are
validated. Staged data remains private and old releases remain available for rollback.

Use release-pinned paginated overview/road/support APIs, with schema versions,
limits, clear completeness states and immutable cache keys. Validate IDs, unique
pairs, finite coordinates/scores, declared membership, score ranges and aggregate
references. Public responses contain neither embeddings nor private source bodies.

Proposed internal boundaries, adapted to the existing feature architecture:

```text
backend local analysis / city_network
  candidates → retained streets → topic aggregates → theme aggregates → audit
backend publication schemas / projection store / read APIs
frontend features/graph
  domain/       typed nodes, routes, visibility and scope
  lib/          size scales, spatial index, label placement, view state
  rendering/    layer adapter, drawing, picking, camera
  components/   CityMap, toolbar, legend, minimap, inspectors, accessible lists
frontend shared/api
  release-pinned loaders and validated transport types
```

Do not move files simply for cosmetic consistency. Extend the current feature
without routing publication writes through renderer code or importing ML into the
cloud runtime. A future renderer replacement must not change data semantics.

## 12. Rendering, performance and honest loading

Profile the current Canvas implementation first. Build a layer-aware renderer
contract so a WebGL implementation can be substituted when measurements justify
it. Avoid one SVG/DOM object per article/edge. Put expensive graph preparation,
spatial indexing and labels in a worker where supported.

Separate camera updates from data updates. Use stable buffers, spatial indices for
picking, viewport culling, cached routes and requestAnimationFrame drawing. Do not
rebuild every node/edge or send React state updates for every raw pointer event.
Dispose observers, workers, listeners and renderer buffers on unmount.

Load validated overview aggregates first; load detailed streets/support on demand.
Distinguish “overview ready,” “article collection complete,” “roads loading,” and
“partial road failure.” Show every article only after validating its full loaded
scope. Layers can fail independently without replacing a useful map with a blank page.

Proposed acceptance targets, measured on documented hardware and fixtures:

| Measure | Target to validate |
| --- | --- |
| Overview preparation after overview payload is available | ≤1 second desktop |
| Pan/zoom p95 frame time, bounded visible graph | ≤20 ms desktop; ≤33 ms representative mobile |
| Selected-item feedback p95, already-loaded data | ≤100 ms desktop; ≤200 ms mobile |
| Retained browser heap after 20 repeated navigation cycles | No monotonic leak beyond explained caches |
| Dataset baseline | Real 7,421 records plus synthetic stress fixture at current 20,000-record schema limit |
| Payload correctness | All pages match one release; zero dangling/duplicate IDs or unsupported fake roads |

These are proposed budgets, not achieved results. Measure bytes, p50/p95 times,
peak RAM and loaded/visible edge counts. Network/free-Render cold-start latency is
reported separately from rendering. If a target fails, reduce visible work with
explicit counts before changing the renderer. Do not promise future 100,000-record
support within the current 20,000-record publication contract.

## 13. Accessibility, failure states and operational quality

Provide the same investigation tasks through keyboard-accessible article and route
lists. Dense small dots alone cannot be the only way to select records. Use generous
hit areas and a disambiguation list when multiple records overlap; touch controls
aim for 44 px. Check accessible target sizing and spacing with W3C guidance.

Preserve keyboard focus through inspector changes and returning from a source.
Support Escape and visible focus; use deliberate shortcuts only outside text inputs.
Pinch/pan gestures must coexist with ordinary page scrolling. Supply a gesture hint
and button alternatives. Respect reduced motion and system contrast preferences.
Color never carries the sole meaning of object type, selection or relationship.

Display explicit states for no qualifying roads, roads switched off, hidden by zoom,
filtered-out endpoints, unsupported input, incomplete load, unavailable old release,
request failure, reconnecting and publication change. Maintain the last validated
view during recoverable refresh failures, with a timestamp and clear stale notice.
Never display a half-loaded network as the complete collection.

Abort superseded reads. Retry only safe reads with bounded backoff. Publishing is
never automatically repeated after an uncertain timeout; verify history/status.
Collect privacy-preserving operational timings without article text, credentials
or private casebook data. No paid services are introduced by this plan.

## 14. Quality gates and staged execution

| Phase | Deliverable | Gate before proceeding |
| --- | --- | --- |
| 0 — Baseline | Current screenshots, counts, task problems, browser/runtime profile | Agree on units and real source limitations |
| 1 — Design prototype | City/neighborhood/article screens; size/road/label tokens; desktop/mobile interactions | Visitors correctly identify every symbol and size meaning |
| 2 — Local data | Candidate/threshold evaluation, streets, highways, audit and payload-size report | Traceable routes, reproducible aggregates and documented quality |
| 3 — Contracts | v3 validation, migrations, staged publication, pinned readers and rollback | Compatibility, real-Postgres and malformed-data tests pass |
| 4 — Working city | Renderer layers, differentiated sizes, zoom levels, search and inspectors | Core tasks work on real corpus; performance targets measured |
| 5 — Refinement | Themes/superways, minimap, accessibility, reduced motion, exports | No hidden meaning, visual overlap blockers or inaccessible core task |
| 6 — Release | Local rehearsal, full required checks, deployment, reviewed publication, live proof | Every public count/fingerprint and critical browser flow verified |

Do the design prototype and data-policy review before investing in decorative
animation or a new graphics stack. Deliver the first useful increment as validated
local streets plus topic highways, meaningful sizes, zoom levels and route
inspection. Superways follow once their aggregate meaning is sound.

Keep a shared task ledger with owner, exact file scope, contract version, status,
checks and handoff notes. If work is later delegated to another environment,
freeze shared types first and give each worker disjoint ownership; integrations
happen through a reviewed branch. This plan does not start delegation or code work.

Validation includes:

- Unit/property tests: deterministic sizing, frozen release scale, clipping/zero/
  unknown handling, canonical pairs, support aggregation, LOD hysteresis and filters.
- Integration tests: staged invisibility, v1/v2 compatibility, atomic switch,
  rollback, mixed-release rejection, byte limits and interrupted companion uploads.
- Browser tests: search → focus → route → supporting pair → source → back;
  selection, clear/reset, mobile/keyboard, overlays, dense picking and error recovery.
- Visual checks: empty/sparse/dense graphs, 98 long topic labels, high-degree hubs,
  unclassified/unsupported inputs, selected states, color repetition and high DPR.
- Performance: actual PC, representative lower-powered device, reduced bandwidth,
  repeated navigation, maximum supported corpus and bounded large edge fixture.

Retain existing CI coverage thresholds and architecture checks. Save screenshots,
exact release/method IDs and test reports. A successful deployment is not proof of
research accuracy or uninterrupted free-service availability.

## 15. Validate the experience and the paper claims separately

Run a formative review with 5–8 people unfamiliar with GMEE. Ask them to explain a
large dot, find a subject, inspect a highway's support, find an isolated article
and return from its source without assistance. Proposed acceptance: at least 80%
complete each core task; report exact participant counts and failures. This small
study guides design; it does not establish universal usability superiority.

For a paper, evaluate neighborhood/road quality on a frozen, stratified labelled
sample. Use two reviewers where possible, report disagreements/adjudication,
precision/coverage and uncertainty, and avoid threshold tuning on the final test
sample. Compare against the previous map and simple nearest-neighbor baselines
under equivalent data and edge budgets. Separate topic coherence, pair relevance,
rendering performance and user-task success into different outcomes.

No visual element may imply that GMEE has measured fake-news prevalence, readership,
real-world dissemination, causality or publisher reliability when those labels and
evidence do not exist. More polished graphics do not strengthen an unsupported claim.

## 16. Definition of done

A newcomer can explain the page and find a subject. Every mark has a type, every
size has a unit, every road has traceable support, every hidden subset has a count,
and every source remains reachable. City-level structure and article-level detail
are both legible. The theme matches GMEE; desktop and mobile support the same core
investigation. The real corpus and published release agree exactly, old releases
remain recoverable, tests pass, performance is measured, and limitations are visible.

## Reference basis

The specifications above are GMEE design proposals, not benchmarked achievements.
The following primary sources inform particular implementation details:

- [D3 radial scale documentation](https://d3js.org/d3-scale/linear#scaleRadial):
  area-aware radius mapping; the proposed log compression is our explicit choice.
- [W3C target-size guidance](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum):
  pointer-target sizing/spacing; the 44 px control target is our product goal.
- [deck.gl performance guidance](https://deck.gl/docs/developer-guide/performance):
  minimize unnecessary layer/data updates and measure device limits. This does not
  commit GMEE to deck.gl or transfer its example performance figures to this project.
