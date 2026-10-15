# Local analysis and cloud publication

## Daily workflow

1. Open the local site, sign in with an approved developer account and run the
   analysis stages in Developer console. Wait for completed job records.
2. Review the source coverage, claims, stored assessments and relationships.
3. Open **Publishing**, choose the extraction period and verify the actual source
   commit, configuration fingerprint and model revisions. Download the JSON.
   Hints describe the current local configuration, not historical provenance.
4. Open the live website, sign in with an approved developer account, open
   **Developer uploads**, choose the exact downloaded file and upload it.
5. Open **Review this release**. Inspect the complete JSON as well as the sample
   and provenance. Confirm approval and click **Publish reviewed release**.
6. Check the publication date, articles and saved claims in the reader workspace.
   Your PC and its local API can now be switched off; the cloud serves the release.

Each file is a **complete replacement collection**, not a daily incremental batch.
Choose a cumulative extraction period if earlier coverage must stay visible.
Keep the downloaded file for retries and backups. The server accepts at most
10 MiB per release, 20,000 articles, 50,000 claims and 100,000 relationships;
the byte limit may be reached first. Chunked/incremental publication is not
implemented. Do not split a large full release into separate replacement files.

## Release behavior

Uploads are private staging records until publication. A single PostgreSQL
transaction validates the fingerprint, prepares immutable versioned projections
and switches the active pointer. A concurrent publication with an old revision
fails with 409; refresh the review. Exact retries do not duplicate a release.
Failed transactions leave the prior complete release active. To roll back, review
an older upload in the history and publish it again. No local articles, accounts,
sessions or analyst labels are replaced by publication.

Stored data is served from the active release only. Existing tabs refresh when
they detect a changed publication revision, at most once a minute by default.
Current publication time and analysis period remain distinct. Empty databases
report that no release has been published, rather than showing fabricated data.

## Cloud capabilities

The standalone `app.cloud:app` serves authentication, uploads/review/activation,
article browsing, literal text search, saved claims and assessments, focused
relationships and article timelines, a bounded graph projection, deterministic
text comparisons, private Casebook and public Project Lab controls.

AI extraction, embeddings, new NLI/evidence checks, scheduler, collection,
Neo4j administration and research annotation stay in the local application.
Cloud source text and entity/evidence payloads are deliberately absent from the
publication-v1 contract; source links and stored derived claims remain available.
Text search is explicitly labelled and does not claim semantic search parity.
Published metadata and derived claims are readable by the public API, matching
the existing corpus read policy. Uploads, review, publication and private cases
require authentication; publication additionally requires an active admin whose
exact email is in the server allowlist. Registration never grants admin rights.

## Deployment

Use `render.cloud.yaml` or configure a free Docker web service from the repository:

| Setting | Value |
| --- | --- |
| Root directory | `backend` |
| Dockerfile | `./Dockerfile.cloud` |
| Docker context | `.` |
| Health check | `/api/v1/health/ready` |
| CORS_ORIGINS | `["https://global-mass.onrender.com"]` |
| ENABLE_SCHEDULER | `false` |
| DEVELOPER_PIPELINE_ENABLED | `false` |
| PUBLICATION_ACTIVATION_ENABLED | `true` |
| DEVELOPER_UPLOAD_EMAILS | `["prab@gmee.com","pavan@gmee.com"]` |
| JWT_SECRET | Privately generated strong secret, at least 32 characters |
| POSTGRES_URL | Private Neon URL using `postgresql+psycopg://`, preserving TLS/channel binding |
| REDIS_URL | Private Upstash native `rediss://` URL, not its REST token |

The cloud dependency lock excludes all ML packages. Its PostgreSQL driver is
psycopg, so Neon's SSL and channel binding URL parameters remain supported.
Fresh deployment runs the normal migration chain through `gmee07` before Uvicorn
starts. On Windows, a cloud-only local probe using psycopg needs a Selector event
loop; production Render runs Linux. The ordinary local analysis API retains
asyncpg and its existing launch commands.

Use a separate cloud database. Do not point this service at the local corpus.
Provision the two approved accounts through trusted operator database access;
accounts are never carried in publication JSON. On the frontend set
`VITE_API_BASE_URL=https://<api-service>.onrender.com/api/v1`, update the existing
CSP `connect-src` to that exact API origin, then rebuild. Preserve all other
security headers. Verify authentication, publish/rollback, source links and
reading data while the local analysis API is stopped before declaring cutover.

## Quotas and backup

Free Render API instances can sleep and need time to wake. Connection and login
UI allow for this; paid always-on hosting is a separate decision. Neon and Upstash
also have quotas. The server defaults to 20 stored upload records and refuses
further uploads at the configured limit; it never silently deletes a release.
Before increasing the limit, measure database storage. Archive reviewed old
releases with an operator backup/restore procedure; no automatic pruning is done.
Keep local exported JSON and regular encrypted cloud database backups outside
the database provider. A free account is not an uptime or unlimited-storage guarantee.
