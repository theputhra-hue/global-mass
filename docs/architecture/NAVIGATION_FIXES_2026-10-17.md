# Navigation and data experience corrections

Date: 2026-10-17. Branch: `codex/navigation-data-experience`.
Base reviewed commit: `6378c3cc14557bf53518d1421a97d2c3f9f2c353`.
Changes are in the local working tree; this report does not claim a push or deployment.

## Completed corrections

| Review item | Result |
| --- | --- |
| R1: tool IDs shadowed by synonyms | Canonical IDs and hrefs resolve first. Regression covers every registry entry. |
| R2: duplicate application layouts | Reader and developer pages render inside the shared shell with one main landmark. Local advanced pages retain tool controls, polling and navigation through a labelled selector, without another global header/account menu. |
| R3: missing source filter | Article finder submits the supported domain filter and includes it in the query key, pagination, URL and article return links. Clear search resets both filters. |
| R4: local claim state lost | URLs preserve `article`, `articleQuery` and claim `offset`. Article filtering runs on submission. Malformed article IDs and negative offsets are ignored. A selected article remains represented when absent from the bounded selector response. |
| R5: incorrect published notices | System overview and semantic retrieval show their own local-runtime notices with useful available alternatives. Neo4j names resolve correctly. |
| R6: clipped mobile menu | Reuses the portal-based Dialog outside the filtered header. The drawer fills the viewport, scrolls, traps forward/reverse Tab, isolates background content, locks page scrolling and restores focus. It closes when switching to a desktop viewport. |
| R7: desktop sidebar scrolls away | Sidebar stays at the viewport top with bounded height and independently scrollable navigation. Account controls remain reachable. |
| R8: ambiguous percentages | Claim search labels saved values as uncalibrated heuristic support scores. Local extraction-confidence labels also state their meaning. |

Home now provides orientation and explicit reading actions. Article browsing has its
own page instead of repeating the finder beneath Home. Article breadcrumbs display
the actual title and selected section, sharing the existing detail-query cache.
The Advanced tools heading has the same visible and accessible name.

Developer access continues to depend on the server's approved-account response.
No backend contracts, account permissions, publication records or cloud settings
were changed by this correction pass.

## Automated verification

- Full frontend suite: **242 tests passed in 36 files**, including 16 new
  regression cases in `frontend/tests/NavigationCorrections.test.tsx`.
- Statements: **85.92%**, branches **77.60%**, functions **77.08%**, lines **89.30%**.
  All original coverage thresholds pass.
- Architecture guard: **87 files passed**. Architecture failure fixtures: **3 passed**.
- ESLint: passed. TypeScript and production build: passed. Diff whitespace check: passed.
- Main JS: 563.90 kB / 158.42 kB gzip. Vite's existing large-chunk advisory remains;
  no warning limit was increased. Further bundle splitting is separate performance work.

Existing tests were updated where the expected interaction intentionally changed:
the accessible directory name, the advanced-tool selector, browser keyboard-event
targeting and the separation of Home from article browsing. Behavioral assertions
and coverage thresholds were retained.

Logs: `output/navigation-review/fixes-coverage.log`, `fixes-targeted.log`.
The earlier failing log is retained as `fixes-tests.log` for traceability.

## Browser verification with real published data

Preview: **http://localhost:3000**. Local API: **http://127.0.0.1:8003/api/v1**.
Runtime: `app.cloud`, using the existing Neon/Upstash configuration privately.
Release: `8121d828-a47e-47cc-b5f6-a578984b694d` — 7,421 articles, 5,157 claims,
zero stored relationships. This tests a locally served published runtime.

- Sign-in succeeded with the existing approved developer account.
- At 390 × 844, mobile dialog bounds measured exactly 390 × 844; the background
  was inert. Tab/Shift+Tab remained in the menu; Escape restored focus to Menu.
- A mobile destination click at 390 × 600 closed the dialog and restored page
  interaction, with no horizontal document overflow.
- At 1440 × 900, after scrolling 726.67px, the sidebar remained at the viewport
  top with height 900px. One main landmark remained. At 1024 × 768, sidebar
  height was 768px and the document had no horizontal overflow.
- Searching `modi` in `www.thehindu.com` returned **40** matching articles.
  Pagination and article → Article text → Back to results preserved
  `q=modi&domain=www.thehindu.com&offset=6`.
- Article breadcrumbs displayed the source title and Article text section.
- System overview, Neo4j graph inspection and Semantic retrieval each displayed
  the correct named local-only notice.
- Searching published claims for `water` returned **133** statements. The real
  first result displayed `UNSUPPORTED · heuristic support score 0.290 (uncalibrated)`.
- Developer uploads/history loaded with one main landmark and no nested global
  header. No upload, publish, rollback or case-save action was executed.
- Final browser console inspection returned no captured errors or warnings.

Evidence, kept outside tracked source under `output/navigation-review/`:

- `fixed-mobile-menu.png`
- `fixed-sticky-sidebar.png`
- `fixed-availability.json`
- `fixed-home-desktop.png`

## Verification boundaries

Local claim selection/pagination/detail-return behavior and malformed-link handling
were verified with automated API fixtures. The full local model/Neo4j runtime was
not started for this pass. Published-data browser checks do not establish local AI
correctness, publication-write correctness, or a new Render deployment. Ordinary
and unapproved-admin visibility is covered by fixture tests; those live accounts
were not created or modified. Human usability sessions remain a separate task.
