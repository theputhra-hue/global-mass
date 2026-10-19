# Semantic city network — publication v3

The collection city adds typed exploratory similarity streets and supported
aggregates. Existing article, claim, relationship and topic-map records remain
unchanged. V1/v2 canonical fingerprints remain identical; their schemas are
retained. This extension does not turn similarity into verified transmission.

## Local processing

After building a complete article map, run from `backend`:

```text
python -m scripts.build_city_network --base ../publication-outbox/gmee-article-map-source-pinned-20261020.json --work-dir ../output/article-map-20261020 --output ../publication-outbox/new-city-release.json --neighbors 10 --min-similarity .55
```

The command reads the original local corpus in read-only repeatable-read
transactions. It checks the input fingerprint against the completed map, loads
only matching cached unit vectors, and computes exact cosine neighbors in bounded
batches. Mutual top-k candidates above the chosen threshold become undirected
streets. Ties are ordered deterministically. No weights are downloaded and no
source data, original embeddings, claims or recorded relationships are updated.
The article-map builder also accepts a v3 base; it explicitly drops old roads
before generating new topics. Run the city builder again for the new map.

Highways aggregate cross-topic streets with at least three distinct pairs and
two distinct endpoints on each side. Themes use seeded Louvain communities over
the highway network, weighted by support divided by the geometric mean of topic
sizes. Isolated topics remain singleton themes. Superways aggregate qualifying
highways crossing themes. All aggregate counts are recomputed during validation.

The minimum similarity is an exploratory construction parameter, not a measured
probability or a universally validated cutoff. This implementation explicitly
publishes calibration=`exploratory_not_human_validated`. Broadly related articles
can be connected without describing the same event. Human pair/event evaluation
is separate work required before paper accuracy claims.

Output files are exclusive-create and bounded by 10 MiB; no records are truncated
to fit. Audit includes configuration/implementation hash, before/after corpus
fingerprint, coverage, components, degree histogram, time, bytes and 100
score-stratified example pairs for review. Nothing uploads automatically.

## Envelope and validation

V3 requires the existing complete `topic_map` plus `city_network`:

- Method/model revision, construction configuration hash, timestamps, source
  revision and input fingerprint.
- Parent map run ID and canonical fingerprint.
- A unique complete article-ID index; compact roads `[left_index,right_index,score]`.
- Canonical sorted unique pairs, no self/dangling/unsupported-input roads, finite
  bounded scores and a degree bound matching the declared mutual-neighbor policy.
- Exact topic membership, highway support and endpoint counts, theme membership
  and article counts, and superway support/highway counts.

The SQL projection stores bounded summary metadata in `published_city_networks`
and separately paginated compact roads in `published_city_roads`. Additive
migration gmee09 creates these tables. Activation uses the existing transactional
publication-head switch. Prior published releases remain available for rollback.

## Public read API

`GET /api/v1/graph/atlas/roads?release=<uuid>&offset=0&limit=2000`

Release is required and pages are capped at 2,000 roads. Only the first page
returns summary, exact article index, degrees, highways, themes and superways.
Each page carries run, total, offset and next_offset. Unpublished/old releases
return an explicit unavailable state; a staged city cannot be read publicly.
Stored row count must match the declared count, otherwise the API returns 503.

The frontend verifies every page, degree and aggregate before enabling the layer.
Mixed-release data, partial pages, malformed indices, model/input mismatch and
incorrect support counts cannot become a complete network. A failed road load
leaves the article atlas available with a retry control.

## Visual semantics

The existing atlas route becomes a spacious city workspace, with a width-unbounded
main content area, compact search/layers, minimap and a responsive inspector.
All article records remain represented. Inputs without a projection use a separate
inset and remain in accessible article lists; they never change semantic fit.

Article size represents retained semantic degree; topic/theme size represents
member count. Scales are frozen per release, log-compressed by area and capped at
the 95th percentile. Uniform article size is optional. Selection uses a halo.
Topic/theme hubs are synthetic navigation objects and not counted as articles.

Major routes appear in the overview; local streets appear with zoom or an explicit
override. At most 3,000 visible routes are drawn in one view, with selected routes
prioritized and viewport culling. The badge distinguishes drawn and loaded counts.
Crossings are not junctions. Recorded relationships use a separate toggle, keep
their types/direction, and only appear when their release matches the atlas.

PNG export includes a legend, scope, release and exploratory-method footer. It is
a screen-resolution view export; a separate vector publication-figure pipeline
and scientific evaluation are not claimed as completed by this implementation.
