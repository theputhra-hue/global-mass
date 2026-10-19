# Codex independent navigation review

**Follow-up:** R1–R8 have now been corrected in the local working tree. See
[the correction and verification report](NAVIGATION_FIXES_2026-10-17.md).
The findings below preserve the original review snapshot and its pre-fix results.

Date: 2026-10-17, Asia/Calcutta. Reviewed branch:
`codex/navigation-data-experience`, head
`6378c3cc14557bf53518d1421a97d2c3f9f2c353`, based on
`df6940c323335e641e1a3526c65df77f3eced308`.

Inputs: [Gemini's handback](NAVIGATION_AND_DATA_EXPERIENCE_REVIEW.md),
[the agreed design](../NAVIGATION_AND_DATA_EXPERIENCE_PLAN.md), actual source
diff and independent automated checks.

**Decision: changes required before integration or deployment.** The redesign
adds useful structure and its existing tests pass, but several explicit
acceptance conditions are missing or incorrect. This review changes no
application implementation, backend, publication, accounts or deployment.

## Verified checks

| Check | Independent result |
| --- | --- |
| Frontend architecture guard | Pass, 87 source files |
| Architecture failure fixtures | 3 pass |
| ESLint | Pass |
| TypeScript/production build | Pass; 562.76 kB main JS / 157.96 kB gzip; large-chunk advisory remains |
| Existing frontend tests | 226 pass in 35 files |
| Coverage | Statements 84.65%, branches 75.60%, functions 76.52%, lines 87.94%; original thresholds pass |
| Additional reviewer acceptance probes | **7 fail**, described below |
| Backend/contracts/workflow diff against foundation | No changes in these roots |
| Fresh independent browser validation | Completed for the published runtime; see browser verification below |

The first test attempt hit a sandbox temporary-cache rename error before any
tests ran. Rerunning with TEMP/TMP directed to an ignored workspace folder
completed successfully. This environmental error is not an application failure.

Logs and executable probe source are preserved under ignored
`output/navigation-review/`. Temporary probe installation into `frontend/tests/`
was removed after execution; Gemini's application and test files are unchanged.

## Findings

### R1 — P1: exact tool IDs resolve to the wrong tools

Location: `frontend/src/shared/navigation/registry.ts:296`.

`findTool` performs one ordered `.find` across IDs, labels and synonyms. Earlier
descriptors therefore shadow later canonical IDs. Independent probes show:

| Requested canonical ID | Actual descriptor | Required descriptor |
| --- | --- | --- |
| `graph` | `fullgraph` | `graph` |
| `corpus` | `browse` | `corpus` |
| `factcheck` | `claims` | `factcheck` |

This affects breadcrumbs, mobile section names and `ToolAvailabilityNotice`.
For example, the cloud `/dashboard/graph` page obtains the recorded-connections
descriptor rather than Neo4j inspection, so it describes the wrong tool as local-only.
The directory itself uses exact `.id` lookup; this finding does not claim its
cards are missing because of this helper.

Fix: resolve canonical ID/href first; only if no exact match exists, resolve
labels/synonyms. Normalize input once and define collision behavior. Assert
`findTool(id).id === id` for every registry entry, not merely that a result exists.
Three independent probes fail here.

### R2 — P1: the new shell still contains the old reader application shell

Locations: `frontend/src/features/articles/pages/ReaderDashboard.tsx:38` and
`frontend/src/app/App.tsx:72`.

App wraps reader destinations in `WorkspaceShell`, but `ReaderDashboard` still
renders `ReaderNavigation`, `PublicationNotice` and its own `<main id="main-content">`.
The resulting page has two main landmarks, duplicate IDs and two global
navigation systems. The old four-item navigation also uses the label
“Tools & guides,” undermining the agreed single, explicit Advanced tools entry.
Skip-to-content targets become ambiguous. The independent single-main probe fails.

Fix: make these pages content-only inside the shared shell. Audit developer,
upload and local advanced pages for the same residual standalone wrappers.
Retain useful page-level controls, not duplicated global application navigation.
Add rendered-page assertions for one main landmark, one main-content ID and
one visible global navigation per viewport.

### R3 — P2: article source filtering is claimed but not implemented

Location: `frontend/src/features/articles/pages/ReaderDashboard.tsx:29`.

The reader parses query and offset only. It never reads `domain`, offers no
source-filter control and calls `corpusApi.list` without the domain argument.
The return URL also omits it. A bookmarked
`#/dashboard/browse?q=flood&domain=news.example&offset=6` therefore searches all
sources and drops the requested source when navigating onward. The independent
request-inspection probe confirms the API receives no domain parameter.

Fix: implement the supported domain filter; include it in request/cache keys,
URL initialization, pagination, clear/reset rules and article return links.
Test Back/Forward and return from article detail with a source filter present.
Do not add unsupported filters as substitutes.

### R4 — P2: local claim exploration loses the user's selected article and page

Locations: `frontend/src/features/claims/pages/ClaimsWorkspace.tsx:25`, `:278`
and `:295`.

The selected article and article-search filter exist only in component state.
Local claim pagination updates state but not the URL. Both detail links use a
bare `#/dashboard/claims` back target. Returning from an article consequently
resets the selector and loses the claim page. A copied/reloaded link cannot
restore the local investigation. The independent return-URL probe fails.

Fix: serialize the selected article, article query and claim-page offset with
explicit parameters; validate them and hydrate on route entry. Preserve those
parameters in all local detail/return links and browser history. Bound/debounce
or explicitly submit article filtering rather than issuing an unmanaged request
for each keystroke. Add a full select -> paginate -> detail -> back regression.

### R5 — P2: cloud System overview bypasses its named availability notice

Location: `frontend/src/app/layouts/PublishedWorkspace.tsx:18`.

The early `overview` return still renders `ToolsDirectory`, so opening System
overview returns the user to the directory without identifying why that requested
tool is unavailable. This contradicts the new tool-specific notice requirement
and the handback's capability matrix. The independent named-overview probe fails.

Fix: route this local-only destination through its own `ToolAvailabilityNotice`
while preserving its URL and correct navigation selection. Keep `vector`'s
existing cloud literal-search fallback truthful and consistent between its
directory card, direct route and descriptor.

### R6 — P1: mobile navigation is clipped and modal focus is not contained

Location: `frontend/src/features/navigation/components/WorkspaceMobileHeader.tsx:66`.

The drawer declares `role="dialog"` and `aria-modal="true"`, focuses Close and
handles Escape, but has no Tab/Shift+Tab containment and does not make background
content inert. Keyboard users can leave the modal for underlying page controls.
The existing test checks opening and Escape only; it does not establish accessible
modal behavior. Independent browser testing now confirms both defects: at a
390 × 844 viewport, the dialog is only 57.33px tall. The screenshot shows its
header and Close button while the destination links are clipped. Shift+Tab from
Close moves focus to the background Account button (`insideDialog: false`).

Fix: use the project's existing accessible dialog behavior or implement containment,
background isolation, scroll handling and focus restoration. Verify the fixed
drawer covers the viewport despite its backdrop-filtered header ancestor. Test
Tab cycling, reverse Tab, Escape, close, link navigation and menu scrolling at 390px.

### R7 — P2: desktop navigation is not persistent on long pages

Location: `frontend/src/features/navigation/components/WorkspaceSidebar.tsx:50`.

The sidebar is a normal-flow flex item with `min-h-screen`, without a sticky/fixed
viewport anchor or independent bounded scrolling. On long article/tool pages its
navigation scrolls away; the flex footer is pushed to the content's bottom. This
does not meet the planned persistent desktop workspace. This is a source/layout
inspection finding, now confirmed by browser scrolling: at scrollY 1303.33 the
sidebar top is -1303.33, and its navigation links are outside the viewport.

Fix: give the sidebar a viewport-bounded sticky/fixed layout with independently
scrollable navigation and reachable account controls, without covering main
content. Verify it on long pages at 1024px and 1440px, including zoom/short heights.

## Other handback corrections

- `WorkspaceShell` accepts article title/tab props, but App supplies neither.
  Breadcrumbs remain generic rather than reflecting the selected article section.
  Derive the tab from the resolved route and share article metadata without a
  duplicate request if the title is needed.
- The report lists extra route aliases such as `/dashboard/home`, `/diff`,
  `/notebook` and `/advanced` which the resolver does not implement. These were
  not foundation routes: correct the report rather than adding unplanned aliases
  merely to make its claims true. `/graph` is not an alias for `/fullgraph`.
- The article methods tab is `/methods`, not `/data`.
- Actual article reads use `/corpus/articles`, not `/corpus`; wording comparison
  uses the existing server API, not just a client-side diff. Verify the claimed
  cache endpoint and annotation roles against source before documenting them.
- Four browser artifact filenames are supplied without accessible paths or an
  identified API/data fixture configuration. They were not located in the
  reviewed checkout/output or the targeted standard Antigravity artifact root.
  Provide the actual files or export them to the review bundle. The reported
  120/450 browser totals alone cannot establish a real published-data test.
  Distinguish fixture UI testing from real API integration; this review does not
  infer fabrication from missing artifacts.
- Preserve scientific score meaning. A bare percentage next to a verdict in
  ClaimsWorkspace is not a calibrated truth probability; label any available
  stored score with its actual semantics or omit the number.

## Independent browser verification — 2026-10-17

Tested the actual current branch production build, initially on port 5050 and
then at the user's requested **http://localhost:3000**. API:
`http://127.0.0.1:8003/api/v1`, running `app.cloud` with the existing private
Neon/Upstash configuration. This is the **published runtime served locally**,
not the full local AI-analysis runtime and not verification of a Render deploy.
Frontend and API remain running for inspection. The ignored local API launcher
was adjusted to permit the requested localhost origin; tracked application
implementation files were not changed.

Verified journeys:

- Landing page → sign-in → authenticated Home, using the existing approved
  developer account. Real release 8121d828-a47e-47cc-b5f6-a578984b694d shows
  7,421 articles, 5,157 claims and zero stored relationships.
- Article search `modi` returns 121 matches. Page two shows items 7–12. Opening
  an article and using Back to results returns to `q=modi&offset=6`.
- All nine article tabs open. Completed empty states explain missing full text,
  claims and relationships; Timeline and Graph render the selected article.
- Claim search `water` returns 133 statements. Selecting its first result opens
  the owning article's Evidence tab with the selected claim and its recorded
  assessment. The saved assessment identifies the score as heuristic and
  uncalibrated. Return links retain the cloud claim query.
- A synthetic comparison from 2020/10 million dollars to 2021/12 million dollars
  returns both changed spans, NUMERIC_DRIFT/WORDING_DRIFT, algorithm
  gmee-typed-text-v2 and its limitations.
- Recorded connections finishes loading its bounded graph. Zero stored links
  are explained. Private investigations loads its empty casebook.
- Approved developer upload page loads both existing release records. Upload,
  publish, rollback and case-save operations were not executed.
- Advanced directory links tested: corpus, factcheck, project, vector, masala,
  overview, graph, timeline, cache and eval. Masala/timeline/cache/eval show named
  local-runtime notices. Graph incorrectly describes Recorded connections;
  overview repeats the directory; vector silently opens ordinary article search.
  Corpus/factcheck breadcrumb names are shadowed as described in R1.
- Responsive checks at 1440 × 900, 1024 × 768 and 390 × 844. Checked pages did
  not exceed the document viewport width. Mobile menu and desktop persistence
  fail as documented above. Temporary viewport overrides were reset.
- No warnings/errors were captured in the tested tab's console at the final
  inspection. This is not proof that every asynchronous/error path is covered.

### R8 — P2: claim-result percentages hide score meaning

`frontend/src/features/claims/pages/ClaimsWorkspace.tsx:174` renders
`verdict_probability` as a bare percentage. Real browser results display
`UNSUPPORTED · 29%`, while the detail page correctly says
`heuristic support score 0.290` and explains that it is uncalibrated. The search
result should name the stored score and its semantics, or omit the percentage.
Do not present it as a truth probability or confidence in the verdict label.

Evidence is saved in the ignored `output/navigation-review/` folder:

- `browser-desktop-home.png`: duplicated reader shell in the desktop layout.
- `browser-sidebar-scrolled.png`: desktop destinations scroll out of view.
- `browser-mobile-menu.png`: clipped mobile navigation.
- `browser-localhost-3000.png`: final requested local preview.
- `browser-comparison.png`: completed synthetic comparator response.
- `browser-article-tabs.json`, `browser-article-completed.json`,
  `browser-specialist-tools.json`, `browser-other-tools.json`: route observations.

Not verified in this browser pass: full local ML/Neo4j execution, ordinary-user
and unapproved-admin sessions, publication writes, rollback, account creation,
case editing/export, every graph control, or Render deployment. R3 and R4 remain
independently failing automated/source findings, not new browser reproductions.
The analyzer demonstrations page opened, but its entire automatic challenge run
was not followed through to completion. Human usability sessions remain pending.

## Correction handoff for Gemini / Antigravity

Continue on the existing navigation branch; do not restart the redesign or
overwrite other work. Read this review and the original architecture plan.
Implement R1-R8 in reviewable commits, preserving backend/API contracts and all
advanced routes. Fix exact-ID resolution first, then complete single-shell
composition, URL-backed discovery state, runtime-specific notices and accessible
persistent navigation. Connect the article breadcrumb state and correct inaccurate
report claims. Do not merge, deploy, publish data, change accounts or migrate stores.

Reproduce the additional probes by copying
`output/navigation-review/CodexNavigationReview.probe.test.tsx` into
`frontend/tests/CodexNavigationReview.probe.test.tsx`. Its imports assume that
test location. Run it with Vitest, then convert the cases into maintainable
permanent regression tests in the appropriate suites. All seven must pass after
correction; do not remove their behavioral assertions to make the report green.

Rerun architecture checks, ESLint, production build and the complete existing
Vitest coverage profile. Use TEMP/TMP under an ignored workspace folder if the
host sandbox's default temporary-cache directory cannot rename files. Keep all
original thresholds. No backend suite is needed solely to fix these frontend
issues unless the scope changes.

Provide real browser evidence at 390px, 1024px and 1440px: one coherent shell,
keyboard-contained mobile navigation, persistent desktop sidebar, correct names
on local-only deep links, domain-filtered article search with exact return state,
and local article-claim selection/pagination restored after a detail visit.
Include ordinary and unapproved-admin states without executing privileged writes.

Return base/head SHAs, actual test results, accessible screenshot/artifact paths,
the API/runtime or fixture configuration used, and any remaining incomplete
acceptance items. Update the handback to distinguish implementation, automated
proof, fixture browser checks, real-data browser checks and unperformed human
usability sessions. Request Codex integration review again before release.
