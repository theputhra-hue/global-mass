# Complete article topic map — publication v2

The existing v1 format remains supported with byte-identical canonical
fingerprints. V2 adds a required `topic_map`: versioned method/model/input
provenance, topic labels/counts and exactly one assignment per article. Missing,
duplicate or foreign assignments and non-finite coordinates are rejected.
Existing article/claim/relationship arrays and claim-analysis provenance are
preserved. A topic assignment is not a claim relationship or verified event.

`basis` is `stored_text`, `title_only`, `unsupported_language` or `unavailable`.
Stored text means at least 30 stored words after markup removal; it may still be
only a publisher snippet. Title-only input is never described as full-text
analysis. Unsupported/unavailable inputs remain unclassified. Noise from topic
clustering retains null topic membership rather than being forced into a group.
Duplicate means identical prepared model input, not independently verified copying.

The local CPU processor uses pinned MPNet embeddings, normalized overlapping
320-token windows with 48-token overlap, normalized mean pooling, BERTopic with
seed 42 and a separate cosine UMAP 2D projection. These are exploratory methods.
Topics can span several related events, and projected distance is not exact
semantic distance. Keywords use up to the first 1,000 document words; embeddings
consume every window. The English model does not classify explicitly non-English
inputs. No original source row, existing claim or relationship is rewritten.

Vectors are checkpointed in an ignored SQLite file keyed by prepared text and
embedding configuration. Changing topic settings does not invalidate vectors.
Each completed vector commits independently. The processor reads its database
with repeatable-read/read-only transactions and compares full source article-row
fingerprints before/after. A concurrent source change prevents export.

## Run locally

Use the installed Docker datastores, backend Python environment and existing
cached pinned model. From `backend`:

```text
python -m scripts.build_article_map --base ../publication-outbox/gmee-full-relationship-analysis-20261018T101021Z.json --work-dir ../output/article-map-20261020 --output ../publication-outbox/new-reviewed-article-map.json
```

This performs local analysis only. It does not gather new publisher content,
call paid providers, extract new claims, upload or activate a release. Existing
collection/preprocessing/NLP/evolution stages handle new articles and claims;
choose a cumulative base export containing all records intended for publication.
Run this processor afterward to build the corresponding complete article map.
For daily runs, use the same work directory and a new output filename. Unchanged
vectors are reused; topic grouping/projection is rebuilt as a newly versioned
whole-corpus run. Topic IDs are scoped to that run, not durable across reclustering.

Interrupted/failed work has explicit audit status and can resume using the same
command if no completed export exists. Completed output files are never silently
overwritten. Inspect `audit.json` for coverage, preserved counts, configuration,
source hashes, checksums, reuse and elapsed time. Missing models fail locally;
model downloads are not initiated by this command.

## Publication and reads

Migration `gmee08` adds one map-summary table. Activation still validates the
complete snapshot and atomically changes the release head. Assignments are
materialized into each immutable published article payload. No embeddings or
article bodies are included in the public map.

`GET /api/v1/graph/atlas?limit=500` returns the current run, topic/method summary,
total, first page, and `next_offset`. Every later page includes
`release=<first-run-id>`. Pages are ordered by article ID and capped at 500;
complete releases remain capped at 20,000 articles by the publication schema.
Published older runs remain readable for pinned pagination. Staged map data is
not visible. V1 releases return an explicit map-unavailable state.

The client validates matching run/total, unique IDs, finite coordinate pairs,
monotonic offsets and final completeness before drawing. Failed/partial loading
is never shown as the complete map. The existing 1,000-node recorded-link API
limits are unchanged. An optional overlay uses only actual matching-release
bounded relationship groups; mismatched-release overlays are hidden.

Route: `#/dashboard/atlas`. Every article has one dot, a topic filter/search entry
and a detail link. Unclassified semantic inputs are gray; inputs without a
projection use a separately explained non-semantic tray. Colors repeat and do not
replace exact labels. Lists/picker provide alternatives to dense canvas picking.
Topic and search state survive article drill-down through the back URL.

Review coverage, source references, topic method and complete export before using
the existing developer upload/review/publish flow. V2 remains subject to the 10
MiB limit. Publishing is a complete replacement, so retain the previous release
and current revision for rollback. Operational tests do not validate research
accuracy or turn candidate evolution into observed transmission.
