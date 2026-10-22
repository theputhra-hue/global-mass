# Article and topic investigation pages

Implemented locally, 15 October 2026. See the
[experience plan](TOPIC_DETAIL_EXPERIENCE_PLAN.md) and
[validation record](validation/TOPIC_DETAIL_VALIDATION_2026-10-15.md).

## Reader journey

1. Sign in and search/browse the collection.
2. Choose **Open details** to stay inside GMEE. **Read original source** remains
   a separate external action on the reader cards and detail page.
3. Explore Overview, Article, Claims, Related coverage, Evidence, Changes,
   Timeline, Graph and Data & methods. Select a claim to prefill its evidence or
   comparison form. Analysis runs only after an explicit submission.

The page keeps the existing theme. All ten advanced workspaces remain available
under **All advanced tools**, with their scope stated. Runtime/cache statistics
remain system-wide. Developer and annotation permissions remain unchanged.

Internal detail links are also available from semantic search, corpus listings,
timeline dossiers, graph inspectors, evidence results and stored verdict dossiers.
An article UUID anchors the page. This is related topic context around an
article, not an invented permanent topic identifier or a definitive event cluster.

## Navigation

Example: `/#/dashboard/articles/<article-uuid>/claims?claim=<claim-uuid>`.

The tab, selected claim, claim-page offset and safe return-to-results route live
in the hash URL. Reader search and pagination, corpus filters and semantic query
are preserved for the return journey. Signed-out detail links return to their
requested destination after sign-in. Reloads restore a tab-scoped session for up
to eight hours by rotating its saved refresh credential and verifying `/auth/me`
before mounting protected pages. Access tokens and account identity stay in
memory. See [the session design](architecture/RELOAD_SESSION_RECOVERY.md).
Programmatic local navigation uses History API events to avoid unwanted reloads.

## Read-only APIs

| Endpoint | Contract |
|---|---|
| `GET /api/v1/corpus/articles/{uuid}` | Metadata, plain-text stored body, body field, processing states, claim count; completeness unknown |
| `GET /api/v1/corpus/articles/{uuid}/claims` | Default 20 / maximum 50 per page, nonnegative offset; entities and stored score/evidence fields |
| `GET /api/v1/corpus/articles/{uuid}/claims?selected=<uuid>` | Selected claim must belong to the article; selection can be outside the current page |
| `GET /api/v1/corpus/articles/{uuid}/connections` | Default 100 / maximum 200 direct stored claim relationships, strongest first, total and truncation flag |

These preserve the existing public corpus GET access policy. The dashboard UI
continues to require sign-in. The responses exclude credentials, source secrets,
embeddings and arbitrary raw metadata. They do not invoke models or change data.
Malformed IDs/query limits return 422; missing articles or a selected claim from
another article return 404.

Connections use PostgreSQL relationships in both directions. Same-article links
are retained and labeled. Related coverage excludes the selected article itself.
The timeline includes it and sorts known publication dates before unknown dates.
The graph groups edges by article, shows up to 25 nodes in its diagram and lists
all returned exact claim links below. Evolution arrows mean child → candidate
parent. A graph/timeline limited by the relationship cap is explicitly labeled.

Neo4j remains available through the existing advanced tools, but is not required
to read this focused stored-claim neighborhood. The dashboard snapshot now also
handles graph-driver acquisition failure without dropping PostgreSQL totals.

## Interpretation and remaining boundaries

- An article can contain only a feed summary. No new full-text collection or
  generated summarization was introduced by this navigation change.
- Claims, model scores, entity labels and inferred relationships inherit the
  research limitations recorded in the 500-article report.
- No links recorded, failed relationship query and model unavailable are
  separate states. Missing provenance is shown as unknown.
- Current relationship context is one hop and bounded, not an exhaustive topic
  search. No publication-date inference is made from collection timestamps.
- Evidence/comparison APIs retain their existing timeouts and runtime model
  requirements. The new page never downloads models or processes the corpus.
- The public snapshot activation workflow and deployment remain separate work.

No database migration is required specifically for these investigation endpoints.
Apply the separate publishing-console migration only through its documented
backup/rehearsal workflow when deploying those features.
