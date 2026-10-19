# Real-corpus relationship analysis and export

Completed 2026-10-18, 10:14:54 UTC (15:44:54 IST). Requested local execution and
export only; no cloud upload/publication, Git push or deployment.

## Result

| Item | Actual result |
| --- | ---: |
| Full archive metadata retained | 7,421 articles |
| Existing extracted claims retained and freshly embedded | 5,157 |
| BERTopic clusters excluding noise | 208 |
| Noise assignments | 1,693 |
| Detected claim relationships | 300 |
| Similarity links | 257 |
| Candidate evolution links | 43 |
| Cross-article underlying relationships | 232 |
| Projected article pair/type groups | 213 |
| Articles participating in cross-article relationships | 260 |
| Elapsed including backup/clone, embedding, analysis and export | 272.83 seconds |
| Complete export size | 5,727,897 bytes (5.46 MiB) |

Export: `publication-outbox/gmee-full-relationship-analysis-20261018T101021Z.json`.
Run ID: `0cc697f0-1089-4d96-905a-f6f718789ec8`.
SHA-256: `7d7f6387d62884d144c1c9b21225f7c25da153551b8fb4d4c703dd45a5f3bb95`.
The file fits the existing 10 MiB upload limit. It is a complete replacement
snapshot, not an incremental fragment. Fewer article map lines than claim links
is expected: 68 underlying links are within one article, and multiple cross-article
claim links can share a projected pair/type group.

## Execution and integrity

Started the installed Docker Desktop and used the existing datastores. A fresh
PostgreSQL backup was restored into `gmee_graph_20261018_101021`; migrations
gmee04–gmee07 ran only on that isolated copy. Original `gmee` had 7,421 articles,
5,157 claims and no relationships before and after. Complete article/claim row
fingerprints matched before and after, including original embedding fields.

All 5,157 claim vectors were recomputed locally on CPU with cached, pinned
`sentence-transformers/all-mpnet-base-v2`, revision
`e8c3b32edf5434bc2275fc9bab85f82640a19130`. No paid provider or model download was
used. The ordinary EvolutionOrchestrator, ClusterService, MutationDetector and
durable job recorder were used, with no lowered thresholds or fabricated edges.
Seed 42; topic minimum size 5; similarity threshold .75; evolution threshold .85;
at most 50 candidates per child within a 30-day lag. Algorithm versions and
working-tree source hashes are retained in the audit/config provenance.

Validated finite embedding dimensions, publication-v1 schema and round-trip,
SHA-256, complete record counts, reference integrity, score bounds, unique
evolution parents, cross-article parent ownership and strictly earlier parent
publication times. Evolution evidence was checked for meaningful textual change.
An independent reader verified the exported bytes/references/time ordering.
Public export excludes embeddings, source bodies, accounts and private metadata.

Neo4j projection was deliberately disabled for the isolated copy, so the
orchestrator reports `neo4j_sync_success=false`. This did not prevent durable
PostgreSQL relationship creation or export. The published cloud reader uses
PostgreSQL projections and does not require Neo4j. Original Neo4j was not rewritten.

External Windows memory samples observed a process peak working set of
1,294.22 MiB; the minimum sampled available system RAM was 1,026.54 MiB. Sampling
started during embedding and is not a full-machine attribution. The runner's
optional psutil monitor was unavailable; the external monitor supplied these
measurements instead. The machine had limited free RAM during execution.

## Interpretation and next step

These are inferred text relationships, not verified misinformation, copying or
observed transmission. All article metadata is preserved, but this run did not
extract claims for articles previously lacking them, re-check historical verdicts,
or establish factual/scientific accuracy. Historical extraction/model provenance
remains explicitly unknown; the new relationship run's provenance is separate.
Human review is still needed before publication.

The live release and localhost cloud-profile reader are unchanged and still have
zero published links. Upload this exact file in the developer upload workspace,
review its full-replacement counts and provenance, then explicitly publish it to
make the website display the new relationships. No automatic activation occurred.

Ignored detailed evidence: `output/graph-verification/real-20261018T101021Z/`
contains the backup, audit, source fingerprints, memory samples and independent
validation. Runner: `output/graph-verification/run_real_analysis.py`.

## Subsequent authorized account upload

On the owner's later request to transfer the export using their account, the
exact file was uploaded through the developer workspace as `pavan@gmee.com`.
The live API independently confirmed the staged run ID, SHA-256 and counts
(7,421 articles, 5,157 claims, 300 relationships). The browser showed
"Upload saved successfully" and the new entry in upload history.

No publication activation was performed. Active revision remained 1, run
`8121d828-a47e-47cc-b5f6-a578984b694d`. Receipt and provenance review are retained
in the ignored run folder as `cloud-staging-receipt.json`. The review workspace
was opened for the separate final publication step. This later upload does not
change the scope or original-data integrity conclusions of the local run above.
