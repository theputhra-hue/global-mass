# Article analytics visibility and navigation corrections

Date: 2026-10-18, Asia/Calcutta. Baseline: `392d3df`.
Status: implemented and verified locally; not committed, pushed or deployed.
Antigravity's existing developer-workflow changes were preserved.

## Findings and changes

1. Explore data was an ordinary link with a decorative arrow, not a disclosure.
   It is now a button with real expanded state and an associated controlled
   submenu. Mouse and keyboard activation collapse/expand without redirecting.
   Navigating into an Explore destination opens its group and marks its child.
2. Nine article links and four inline group labels exceeded the available width.
   Desktop/tablet navigation now uses wrapping group panels, with no horizontal
   tab scrollbar. Mobile uses one section selector, retaining selected claim,
   pagination and the safe return destination.
3. Article Overview hid saved assessments behind further navigation. It now shows
   aggregate stored-label counts and a bounded preview of saved statements. Claim
   cards show the recorded label, uncalibrated support score and saved rationale.
   Existing selected-claim evidence remains available without automatic inference.
4. Both full local and cloud article detail APIs now include additive
   `assessment_counts`. SQL aggregates the complete article's claims, independently
   of pagination. Cloud queries are pinned to the active release and article.
   Null/blank labels are counted as UNASSESSED; case/outer spaces are normalized.
   An older API without this field displays an explicit unavailable-summary note.
5. Empty analysis and failed requests remain distinct. Overview previews have
   request error/retry UI and do not turn outages into zero-claim claims.

## Actual published data

The local cloud-profile API read the existing managed release:
`8121d828-a47e-47cc-b5f6-a578984b694d`.

- 7,421 articles; 5,157 claims; **0 saved relationships**.
- The inspected NEET-PG article `c43fff87-4ec5-4d6a-87d4-83a4b959551c`
  has five claims and five stored UNSUPPORTED labels. Its first saved support
  score is 0.287, displayed as uncalibrated previous model output.
- Full source text/evidence payloads are not part of publication v1.
- Relationship maps, related coverage and automatic version pairs cannot contain
  links absent from the published release. Their empty states are legitimate data
  limitations; no links or scientific results were invented for this correction.

## Verification

- Full frontend suite: **264 tests in 38 files passed**, including Antigravity's
  pending UI work. Coverage statements 86.68%, branches 77.72%, functions 77.95%,
  lines 89.82%; original thresholds unchanged.
- Targeted frontend article/navigation checks: 47 tests passed.
- Targeted backend article investigations, published results and cloud isolation:
  **27 passed**. Includes all-claim aggregation beyond a page, article scoping,
  active-release scoping, replacement/rollback and no model imports in cloud.
- ESLint, TypeScript/build, frontend architecture checks and its 3 failure fixtures:
  passed. Backend architecture, targeted Ruff and mypy checks: passed.
- Build retains Vite's existing >500 kB bundle advisory (582.36 kB main JS,
  162.57 kB gzip); this is not suppressed or described as a performance pass.
- Initial sandboxed backend pytest run stalled before reporting tests and was
  stopped. The escalated fixture-only run above completed successfully.

## Browser evidence

Local frontend `http://localhost:3000`; locally served cloud-profile API
`http://127.0.0.1:8003/api/v1`, reading real published data.

- Existing approved developer sign-in succeeded.
- Explore data collapsed by mouse and expanded by Enter without route change.
- Saved claims opened their owning article and selected recorded assessment.
- Overview showed all five saved labels and three preview statements; Claims
  showed all five statements, labels, scores and rationale.
- All nine sections were visited, including full source-text availability,
  evidence, manual comparison fallback, empty related coverage, single-record
  timeline, empty-edge graph and published relationship provenance.
- At 1440 px, all nine desktop links fit within the workspace; document width was
  1432 px. At 390 px, document width was 382 px with no horizontal overflow.
- Mobile selector changed sections while retaining selected claim and back route.

Ignored evidence: `output/navigation-review/article-ui-coverage-2026-10-18.log`,
`article-analysis-desktop-2026-10-18.png`,
`article-sections-completed-2026-10-18.json`.

## Boundaries

This fixes browsing and display of existing results. No fresh AI job, feed
collection, cloud upload/publication, account change or live deployment was run.
The daily-analysis preflight and startup packages C1–C3 remain separate pending
work. Passing frontend fixtures does not complete that backend plan. The original
local corpus and currently active cloud release were not replaced.
