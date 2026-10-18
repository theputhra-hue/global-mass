# Workspace simplification

## Audit and information architecture

The previous app presented competing reader and twelve-tab technical navigation,
database names and ports as feature labels, a repeated three-column guide, and
service/ingestion panels before the task on almost every research page. Article
pages gave nine sections equal prominence. Optional annotation fields appeared
before the pair being reviewed. Article results used large repeated cards and
several all-tools catalogues repeated the same navigation.

The starting point is article search. Four primary destinations cover reading,
claim checking (saved claim search in published mode), comparing wording, and
private investigations. Expandable research and system groups provide the other
tools without competing with the main task. Account actions and the existing
allowlist-gated developer links remain in Account.

| Existing route | User goal and new placement |
| --- | --- |
| `/`, `#/signin`, `#/project` | Explain the project, authenticate, try public analyzer examples |
| `#/dashboard`, `/browse` | Search titles/authors, browse dated source articles |
| `/check`, `/factcheck` | Check local evidence or inspect saved published claims |
| `/compare` | Compare two versions of a statement |
| `/casebook` | Save, review, archive and export private investigations |
| `/fullgraph` | Explore individual articles/claims and recorded connections |
| `/graph` | Explore related story clusters |
| `/timeline` | Explore the existing story timeline |
| `/vector` | Local semantic retrieval; published article search |
| `/corpus` | Search/filter collection, then inspect clusters and ingestion history |
| `/project`, `/masala`, `/eval` | Analyzer examples, experimental analysis, role-restricted annotation |
| `/overview`, `/cache` | Dependency status, alerts, collection activity, operations and cache measurements |
| `/tools` | Complete tool directory with local/published availability |
| `/developer`, `/upload` | Existing backend-authorized pipeline/publication administration |
| `/articles/:id/:tab` | Source overview, text and claims first; evidence, changes, related coverage, timeline, graph and methods under Investigate further |

All abbreviated workspace paths above are relative to `#/dashboard`.

## Implementation

`WorkspaceShell` owns one navigation system, a collapsible desktop sidebar,
accessible mobile dialog, skip link, active destination and account control.
`Header` now contains only service refresh controls. `AdvancedTabGuide` provides
a title, purpose and optional interpretation help. Technical status and polling
controls remain available after research content. The system overview links to
specialist tools instead of mounting several competing charts. Recent collection
activity remains available in an expandable panel.

Article results are scan-friendly rows with source/date, headline and original
source links. Article investigations preserve every tab and URL parameter, with
three primary sections and expandable analysis. Claim checking leads with the form;
stored assessments and outlet statistics remain available in an expandable panel.
The dedicated directory replaces
repeated all-tool catalogues. Annotation pairs precede optional notes/context/span
metadata; vote validation, blinding and payloads are unchanged.

Shared tokens use neutral dark surfaces and the existing rose brand accent.
Inter, restrained borders, rounded controls, readable muted text, focus rings and
consistent spacing apply to reader, research, administration, auth and public
pages. Decorative ticker/equalizer/globe content is removed. The original graph
still renders individual nodes and real links, with source filters, node search,
edge toggle, pan/zoom, keyboard selection and article/timeline actions intact.

## Preserved contracts

No new product features, dependencies, API contracts, backend source changes or
database migrations are introduced by this redesign. Authentication, token
lifetime, authorization/allowlists, review/export restrictions, cloud capability
boundaries, form validation, private-case snapshots, calculations, polling pause
behavior and real data requests remain in their existing implementations.
All existing hash routes remain valid. No business metrics are fabricated.

## Validation

Validated on 18 October 2026 against the local production build and real stores.

- ESLint: passed with zero warnings.
- TypeScript compilation and Vite production build: passed in the Node 24 Docker build.
- Vitest: 206 tests passed, zero failed or skipped. Coverage: 89.17% lines,
  85.11% statements, 76.24% branches and 76.94% functions; above the CI gates.
- Navigation tests cover the existing deep links, active sections, desktop collapse,
  mobile dialog Escape/focus restoration, skip link and published capability labels.
- Regression tests cover article tabs and return context, authentication and role
  restrictions, API errors/retries, form payloads, casebook, polling and annotation.
  Published-mode tests verify that local-only routes remain explanatory and do not
  request local analysis APIs.
- Browser walkthrough: sign-in and protected-route return, title/author search,
  all nine article sections, numeric wording comparison, live corpus NLI evidence
  retrieval, semantic retrieval, saved case listing, graph selection/zoom and article
  links, story clusters/timeline, collection history, analyzer examples, experimental
  lab, research annotation, service status, cache and account access.
- Real-data examples: 10,879 articles and 10,254 claims; semantic search returned
  eight related articles. The tested claim returned eight source passages with
  explicit model stances and uncertainty. No result was fabricated for the review.
- Desktop, 768px tablet and 390px phone layouts were reviewed. Long evidence
  identifiers now wrap; source/score labels no longer squeeze related-story titles.
  The original connected graph, mobile navigation and expandable annotation fields
  were inspected at phone width.

### Local runtime reconciliation

The old running backend lacked the capabilities endpoint already present on main.
The local deployment was aligned with that existing source and its existing gmee07
migration. A full PostgreSQL backup was restored to a separate rehearsal database
before migration; row counts and content digests of all 17 existing application
tables were preserved in both rehearsal and live migration. The backup and runtime
evidence remain in ignored local storage. The redesigned frontend is served at
http://localhost:3000; PostgreSQL, Neo4j, Redis, backend and frontend report healthy.
No new migration or backend source change is included in this branch.

### Limits of validation

The live walkthrough used the existing local review account. Developer allowlist
and publication workflows are covered by the automated tests; this account does
not have developer access. Production cloud publishing and external Wikipedia
retrieval were not exercised live in this redesign review. Research votes, private
case edits and ingestion/publication jobs were not submitted as smoke tests against
retained data. Model accuracy and scientific validity are unchanged; successful
execution does not validate a factual verdict or establish publication readiness.

### Main files

- `frontend/src/components/WorkspaceShell.tsx`: shared desktop/mobile navigation.
- `frontend/src/styles/globals.css`, `frontend/tailwind.config.js`: common design tokens,
  controls, typography, focus states and responsive layouts.
- `frontend/src/App.tsx`: shared shell around authenticated routes and service errors.
- `frontend/src/pages/ReaderDashboard.tsx`, `ArticleInvestigation.tsx`,
  `ToolsDirectory.tsx`, `SystemHealth.tsx`: page hierarchy and navigation consolidation.
- `frontend/src/components/Header.tsx`, `AdvancedTabGuide.tsx`, `Dialog.tsx`:
  compact controls, optional guidance and accessible focus behavior.
- `CorpusExplorer.tsx`, `VectorTelemetry.tsx`, `FactCheck.tsx`, `EvalLab.tsx`,
  `MutationComparator.tsx`: task-first layouts, optional details and readable results.
- Existing auth, developer, published and public pages use the shared design system;
  duplicate global headers and the competing `ReaderNavigation` were removed.

