# Local article map — 21 October 2026

The desktop Story map now uses the entire local PostgreSQL collection. No articles,
coordinates or links were imported from the cloud deployment. The graph appearance
comes from the current CityNetworkCanvas frontend; the dataset was built locally.

## Result

- Local release: `31c6b6ed-8000-4a62-9440-8d49dce41d76`.
- Snapshot SHA-256: `0fb2852b672cd016fa003cf2e244f3a02fe81f1e0c06b9b44332335c727a96ba`.
- 10,879 local articles, 138 topic groups and 16,136 semantic streets.
- 10,786 articles have semantic coordinates. The 93 unsupported-language records
  remain visible in the separate inset, without invented semantic positions.
- Input coverage: 3,334 stored-text records and 7,452 title-only records.
- 3,984 records are unclassified; a topic is never invented to fill coverage.
- Existing 10,254 claims and 40,174 claim relationships are retained exactly.
- 32 topic highways, 107 broader themes, and zero qualifying superways.

Semantic streets are exploratory mutual top-10 neighbors with cosine similarity
at least 0.55. They are not human-validated same-event links, fact checks or observed
information transmission. Highways require three distinct pairs and two endpoints
on each side. Topic grouping and UMAP use seed 42. The embedding model is
`sentence-transformers/all-mpnet-base-v2`, revision
`e8c3b32edf5434bc2275fc9bab85f82640a19130`, loaded from the local model cache.
Stored text is processed in token windows; title-only records are labeled as such.

## Local runtime and preservation

Open `http://localhost:3000/#/dashboard/atlas`. The sidebar destination is **Story
map**. **Recorded connections** remains the separate saved-claim graph.

The missing map was a data-projection issue, combined with an old frontend bundle
remaining open in the browser. A Git pull supplies graph code, but does not include
the private local map dataset. The local projection is now materialized and the
frontend is rebuilt. Reload an already-open old tab once and sign in again.

The export includes every local article, including records without extracted
claims. Historical claim-model provenance is marked unknown when it was not stored
in the source database; the new map has its own recorded model provenance.

Activation accepts only a local PostgreSQL host and an existing active local
administrator. It verifies every exported article, claim and relationship against
the current collection, checks source fingerprints, and holds source-table SHARE
locks through the projection commit. It writes only the saved map projection and
its activation metadata. Article, claim, relationship, source, evaluation-pair and
annotation fingerprints were identical before and after activation.

The optional recorded-relationship overlay now requests the displayed release.
Article detail, claims, connections, topic context and map links stay pinned to
that same snapshot. Unpinned local article reads continue to use live source rows.

Private recovery artifacts are ignored by Git:

- `local-backups/latest-code-20261021/database.dump` (pre-change PostgreSQL backup).
- `.local-deployment/local-article-map-20261021/` (base, topics, city snapshots,
  audits, activation receipt and executed builder sources).
- The persistent model-cache volume contains the same exports plus the resumable
  embedding checkpoint under `/home/gmee/.cache/local-article-map-20261021/`.

Database backup SHA-256:
`4FA6CA28841BCCD52C68B34EF394F9B15398F854F8F9DB119E0432B513D26D2E`.

## Reproduction

Run from the repository root with the existing local Compose installation. Choose
new output paths for another run; exporters refuse to overwrite prior snapshots.
Replace `FULL_SOURCE_COMMIT` with the actual full Git revision and
`EXISTING_LOCAL_ADMIN_UUID` with the operation owner's existing local user ID.

```powershell
docker exec gmee-local-backend-1 python -m scripts.prepare_local_atlas export --source-commit FULL_SOURCE_COMMIT --output /home/gmee/.cache/new-local-map/base.json
docker exec gmee-local-backend-1 python -m scripts.build_article_map --configured-environment --source-commit FULL_SOURCE_COMMIT --local-only --base /home/gmee/.cache/new-local-map/base.json --work-dir /home/gmee/.cache/new-local-map/checkpoints --output /home/gmee/.cache/new-local-map/topics.json --batch-size 16 --min-topic-size 15
docker exec gmee-local-backend-1 python -m scripts.build_city_network --configured-environment --source-commit FULL_SOURCE_COMMIT --local-only --base /home/gmee/.cache/new-local-map/topics.json --work-dir /home/gmee/.cache/new-local-map/checkpoints --output /home/gmee/.cache/new-local-map/city.json --neighbors 10 --min-similarity 0.55
docker exec gmee-local-backend-1 python -m scripts.prepare_local_atlas activate --snapshot /home/gmee/.cache/new-local-map/city.json --base-audit /home/gmee/.cache/new-local-map/base.audit.json --operator-id EXISTING_LOCAL_ADMIN_UUID
docker compose --project-name gmee-local --env-file .env -f infra/docker-compose.yml -f infra/docker-compose.local.yml up -d --build --wait
```

`--local-only` permits a complete local snapshot up to 64 MiB. It does not increase
the cloud upload limit or upload anything. This complete snapshot is 22,209,113
bytes, so the cloud's 10 MiB upload path cannot be used for it.

## Verification

- 47 focused backend map, city, activation and snapshot-isolation tests passed.
- 28 backend article-insight, graph-contract and snapshot tests passed in the
  separate integration review (overlaps the focused group above).
- Seven frontend ArticleAtlas tests passed; scoped ESLint and Ruff passed.
- Strict mypy checks passed for both new local runtime/preparation helpers.
- Backend production image and frontend TypeScript/Vite production build passed.
  All five local Compose services are healthy.
- Read-only HTTP verification traversed all 22 article pages and nine road pages.
  Every article ID, title and domain matched the local export; every road endpoint,
  score and degree matched the generated snapshot. Source fingerprints still match.
- The recorded overlay returned the same release, with 1,000 local article nodes
  and 2,000 grouped saved relationships in its explicitly bounded projection.
- Browser checks covered complete collection loading, zoom, topic filtering,
  title search, article inspection, release-pinned article navigation, the optional
  recorded layer, and preparation of a downloadable PNG with a release footer.
- A separate read-only review found no actionable source-integrity or snapshot
  consistency regression. All 74 files of previously preserved research work
  still match their pre-sync hashes.

This is local graph functionality and data-integrity validation. It does not
change the scientific paper's evaluation results or establish research accuracy.
