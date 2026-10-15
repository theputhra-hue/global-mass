# Reader clarity: first implementation batch

Date: 2026-10-16 (Asia/Kolkata). Branch: `codex/reader-clarity`, based on merged
main `0eaecc7`. This document records a branch preview, not a live release.

## Changed behavior

- Landing explains article search, source context and extracted statements in
  three steps. Infrastructure descriptions move into optional details.
- Shared reader navigation exposes Explore articles, Saved claims, Compare
  wording and Tools & guides. Existing specialist routes remain available.
- Article search is the main homepage control. Counts are compact and sourced
  from the active release in cloud mode. Source/date and internal article details
  remain prominent; external source links are separate.
- The tools directory explains purposes and local/cloud availability. Local-PC
  tools remain discoverable without appearing to run on the published site.
- Article orientation explains saved statements and the absence of full source
  text from the published archive. All nine article tabs are retained.
- Cloud graph-to-timeline navigation opens the selected article's timeline;
  local callback navigation is preserved. A release with zero stored links is
  explained without inventing connections.
- The publication notice shows a compact date with additional context on demand.

## Observed checks

- Frontend regression run: 196 tests across 33 files passed. Includes anonymous
  landing, safe sign-in returns, reader search, all article tabs, graph article
  identity, developer controls and new cloud capability-boundary tests.
- ESLint and TypeScript/Vite production build passed. Vite retains the existing
  advisory about a JavaScript chunk above 500 kB; code splitting remains future
  performance work.
- Browser preview used the real managed published release: 7,421 articles,
  5,157 claims, zero stored relationships. The local lightweight cloud runtime
  read the managed database; no new analysis or publication was triggered.
- Browser search for `modi` returned matching source articles. Opening details
  displayed all nine tabs and explicit text-availability guidance. Back to
  results restored `q=modi&offset=0`. Refresh/sign-in restored the intended search.
- At 390px, reader and tools-directory document widths stayed within the viewport.
  Mobile navigation, search controls and tool descriptions were visually checked.
- The source database, active release, data files and account permissions were
  not modified. The only backend process used for preview is the existing cloud
  application; no backend source changes are part of this batch.

Ignored screenshot evidence is in `output/reader-clarity/`:
`landing-desktop.png`, `reader-desktop.png`, `article-desktop.png`,
`tools-desktop.png`, `reader-mobile.png`, `tools-mobile.png`.

## Remaining acceptance

The operator workflow/full-release download, backend publication-status payload
optimization, broader graph interactions and uncoached teammate usability sessions
remain in the [plan](../READER_CLARITY_PLAN.md). Verify the deployed primary journey
after merging. Tests and a successful build cannot establish that new visitors
understand the research correctly.
