# Topic and article detail experience

Status: first article-anchored version implemented and verified locally,
15 October 2026. See [usage](ARTICLE_INVESTIGATIONS.md) and
[validation](validation/TOPIC_DETAIL_VALIDATION_2026-10-15.md). The original batch
checklists below remain the design/acceptance reference; the validation record
states the actual tested scope. Deployment and permanent topic identities remain
separate work. This supplements the production and data-publishing plans.

## 1. Product decision

Keep the existing information, options and advanced tools. Make each selected
article or claim open a dedicated internal investigation page, with the related
topic information organized in tabs. Readers can go deeper without repeatedly
returning to a global dashboard or losing their selected item.

Core journey:

`Search / browse → open result → dedicated detail page → inspect tabs → open related item`

“Read original source” remains available as a separate external link. Opening
details must not automatically leave GMEE. Clicking a graph node still selects
it for inspection; its visible Open details action navigates to the detail page.
Other entry points include search results, related coverage, timeline items,
claim lists and existing article previews.

## 2. Scope and identity

An article, a claim and a topic are different objects. The first version uses the
existing permanent article UUID as its anchor and shows the associated topic
context around it. Relatedness is labeled as a modeled connection, not proof
that every result describes the exact same event.

Proposed deep links, following the existing hash-router deployment:

- `/#/dashboard/articles/:articleId/overview`
- `/#/dashboard/articles/:articleId/claims?claim=:claimId`
- `/#/dashboard/articles/:articleId/timeline`
- Other tab names use the same article route and explicit tab segment.

Claims link to their owning article with the claim selected. Pagination, filters,
active tab and selected claim should survive refresh/back/forward through URL
state. A return-to-results link restores the previous query and page. Existing
dashboard routes remain functional.

Do not invent permanent topic URLs from display titles or temporary cluster
numbers. A later topic-first page requires an explicit stable topic identifier,
membership provenance and handling for merged/split clusters or release changes.
That is a separate data-model decision, not a prerequisite for article details.

Current dashboard sign-in requirements remain. After sign-in, return to the
requested safe internal detail route rather than always sending users home.
Public anonymous access is a separate product decision.

## 3. Page structure

The page uses the current red/bone/ink palette, display typeface, monospace
metadata, borders, buttons and spacing tokens.

1. Breadcrumb: Collection → selected article/topic context.
2. Header: title, source, author when known, publication time, collection time,
   processing state, source link and dataset/update provenance when available.
3. Short orientation: what is available for this item, including whether the
   stored text is a summary, full text or unknown. Never infer full text from
   word count alone. Show a labeled excerpt unless a generated summary with
   provenance actually exists.
4. Tab navigation with an optional More tools menu on small screens.
5. Selected tab content, with independent loading/error/empty states.
6. Context controls: select a claim, inspect a related article, return to results.

Tab selection must not reset the selected article. The page fills the available
width responsively. Long text wraps; tables and tab strips may scroll inside
their containers without making the document overflow.

## 4. Detail tabs

| Tab | What it contains | Expected behavior |
|---|---|---|
| Overview | Source metadata, available-text excerpt, processing/coverage indicators, related-item counts | Clear starting point; counts scoped to this item and labeled if bounded |
| Article | Stored article text, source link, timestamps and content completeness | Render text safely; distinguish missing text and summaries; preserve original context |
| Claims | Extracted claims, entities, extraction metadata and available analysis | Select a claim; show its provenance; heuristic confidence is not a truth probability |
| Related coverage | Other articles connected to this article's claims or stored article relationships | Show source, date, relationship basis and similarity; selecting an article opens its own detail page |
| Evidence | Available supporting/conflicting passages and explanations for the selected claim | Explicit claim selection and Run check action when computation is needed; no automatic expensive checks for every claim |
| Changes | Side-by-side wording, number/entity changes, stored mutation evidence and comparison controls | Choose two claims/versions explicitly; show changed text without asserting copying or falsehood |
| Timeline | Dated related coverage and available evolution links | Start with a readable list; retain the existing richer timeline option; unknown dates remain unknown |
| Graph | Focused article/claim neighborhood with a readable list alternative | Bound graph size, show truncation, provide node details and links to the full corpus graph |
| Data & methods | IDs, source/model/run provenance when recorded, limitations, freshness and relationship definitions | Mark unavailable fields as unknown; distinguish stored data from newly requested analysis |

Keep tabs discoverable even when there is no data. Explain “No claims extracted”,
“No related coverage recorded” or “Analysis unavailable” as appropriate. Empty,
unavailable and failed are distinct states. A missing Neo4j projection must not
hide the article or be presented as proof of no relationships.

## 5. Preserve every existing option

Retain all ten advanced destinations:

| Existing option | Access in the new experience |
|---|---|
| Overview Vitals | Advanced tools → Collection/system overview |
| Neo4j Graph Engine | Advanced tools → Graph engine; retain technical inspection |
| Postgres Vector | Advanced tools → Semantic search; result Open details links |
| Redis Queue | Advanced tools → Runtime/cache status, clearly system-wide |
| Graph | Focused Graph tab plus Open full corpus graph |
| Timeline | Focused Timeline tab plus existing timeline workspace |
| Masala Lab | Existing full lab; relevant comparator links from Changes |
| FactCheck | Evidence tab can prefill a selected claim; standalone tool retained |
| Eval Lab | Existing role-controlled annotation workspace; contextual links only where supported |
| Corpus | Existing collection workspace; all article results gain Open details |

These are all accessible options, but global cache/service metrics must never be
displayed as measurements of the selected article. Tools that accept article or
claim context receive it explicitly. Tools without that capability are labeled
as collection-wide. User input is preserved when navigating to a tool and back
where practical; no silent analysis submission on navigation.

Developer collection, processing, upload and future release activation remain
restricted to approved developer accounts. This plan does not expand access.
Existing research-role restrictions remain server-enforced.

## 6. Current implementation and required API work

Verified existing building blocks:

- Reader cards currently link externally; the frontend corpus client lacks an
  article-detail method, although `GET /corpus/articles/{article_id}` exists.
- Article detail currently returns metadata and available body, not all claims
  and relationships needed for these tabs.
- Existing semantic search, article listing, claim verdict detail, lineage and
  mutation comparison can be reused with explicit adapters.
- Existing timeline accepts an `article_id` filter, but uses Neo4j and needs
  graceful dependency handling. Do not reuse a global graph as a focused result.
- Current selected-article state is an in-memory singleton. It can support
  previews, but URLs must become the durable detail-page context.
- The current route parser needs explicit article/tab handling before its broad
  dashboard fallback so deep links do not fall into system overview.

Proposed implementation contracts, finalized against existing response shapes:

1. Typed article detail response and UUID validation: invalid ID → 422/400,
   unknown valid ID → 404, without leaking database errors.
2. Paginated article-claims endpoint, scoped by article UUID, including entities
   and recorded extraction metadata; bounded page sizes and deterministic order.
3. Paginated article-related endpoint with the explicit relationship basis,
   contributing claim IDs and source dates. PostgreSQL claim relationships can
   supply results when available; article-graph links remain a separate basis.
4. Bounded focused graph/timeline adapters. Use existing filtered endpoints where
   correct; add targeted queries where current endpoints return global data.
5. Evidence and comparison reuse existing authenticated APIs and explicit user
   actions. Show stale/uncalibrated results and missing analysis honestly.
6. Include dataset/release identifiers where actually recorded. Until public
   release activation exists, do not fabricate snapshot provenance or live status.

All joins must enforce the requested article/claim association. Avoid one API
request per displayed claim and avoid downloading the full corpus for client-side
filtering. Graph queries require node/edge/depth bounds and a truncation indicator.
Opening a page must never initiate collection, NLP, graph recomputation or upload.

## 7. Implementation batches

### Batch A — Internal detail foundation

- [ ] Add typed route parsing, safe sign-in return path and unknown-route behavior.
- [ ] Add article detail API client and bounded typed backend claims response.
- [ ] Build the page shell, metadata header, Overview, Article and Claims tabs.
- [ ] Add Open details to reader cards and preserve Read original source.
- [ ] Handle loading, missing/invalid IDs, empty text, zero claims and stale data.

Exit: a real article opens internally, survives refresh, and retains all existing
reader/advanced routes. No inference or development action runs on page open.

### Batch B — Related topic investigation

- [ ] Add scoped related coverage, focused graph and timeline data adapters.
- [ ] Build Related coverage, Timeline and Graph tabs.
- [ ] Connect search, corpus, timeline and graph entry points to stable details.
- [ ] Preserve back-to-results query/filter/page and selected claim URL state.
- [ ] Distinguish graph outage, no recorded edges and bounded/truncated results.

Exit: every supported data entry point leads to the correct article and related
context. Unrelated global counts/nodes never appear as topic-specific results.

### Batch C — Evidence, changes and complete tool access

- [ ] Build selected-claim Evidence and Changes views using existing services.
- [ ] Add Data & methods and all advanced tool links with context labels.
- [ ] Preserve developer/research authorization and standalone tools.
- [ ] Add tab descriptions and clear explanations of uncertain/model outputs.

Exit: all existing options remain reachable; claim selection, evidence, comparison
and analysis provenance are understandable without leaving the investigation.

### Batch D — Verification and release readiness

- [ ] Test deep links, refresh, back/forward, sign-in return and invalid IDs.
- [ ] Test correct scope with two unrelated articles and multiple claims.
- [ ] Test summary-only, full-text/unknown provenance, zero-claim and no-link cases.
- [ ] Test model unavailable, graph unavailable, slow API, retry and partial failure.
- [ ] Test user/developer/research roles at both UI and API boundaries.
- [ ] Test safe external URLs and safe text rendering with hostile fixture data.
- [ ] Test tab keyboard operation, focus, labels and screen-reader states.
- [ ] Verify desktop and mobile; avoid body overflow and eager loading of heavy graphs.
- [ ] Run appropriate backend/frontend regression, build, lint and type checks.
- [ ] Verify real local data and save screenshots; update documentation/task ledger.

Exit: tested end-to-end journey and preserved old tools, with explicit remaining
limitations. Push/deployment are separate from this planning request.

## 8. Definition of done

A reader can search, open an item internally, read its context, inspect all
available topic-related tabs, switch claims or related articles, and return to
their results. The page preserves the existing theme and access boundaries.
No existing tool is removed, no result is invented, and a dependency failure in
one tab does not make the rest of the page unusable.

This changes how existing research data is explored. Full-text collection,
extraction-quality improvements, durable workers and public snapshot activation
remain tracked by the original plans and the 500-article validation report.
