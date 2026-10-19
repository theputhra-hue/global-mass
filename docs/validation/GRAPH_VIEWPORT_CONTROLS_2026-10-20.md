# Graph viewport and navigation fixes

User-reported issues: the city occupied too little canvas space, hub text overlapped,
ordinary scroll did not zoom, and the main desktop navigation could not collapse.

## Changes

- Global desktop sidebar collapses from 256 px to a 72 px icon rail. Expansion,
  accessible link names, account access and a direct Collection map link remain.
  A single non-sensitive local preference persists the collapsed state. Mobile
  navigation keeps its existing drawer.
- Graph exploration controls can open/close at every width and start closed,
  freeing another 244 px on desktop. ResizeObserver fits a fitted camera or
  preserves a manually chosen source-coordinate center and relative zoom.
- The view chooses one rigid rotation of the entire release to fit its viewport,
  with uniform scale and no old 2x scale cap. Stored coordinates, pairwise
  distances, article membership, roads, counts and publication data are unchanged.
  Camera links are saved in original source coordinates through the inverse
  rotation, so source navigation and responsive restoration remain meaningful.
- Wheel input over the canvas zooms at the pointer without requiring Ctrl/Command.
  Pixel/line/page deltas are normalized and bounded. Buttons share the same zoom
  operation; keyboard +/− zoom and 0 fits. Controls outside the canvas keep their
  normal scrolling behavior.
- Label placement measures and truncates actual text, tests four nearby positions,
  and reserves hub shapes, minimap, unsupported inset, inspectors and controls.
  Hub counts share collision checks; lower-priority text is omitted when crowded.
  Exact values remain in the inspectors. A focused label never bypasses collision
  checks.

## Verification

- 310 frontend tests in 43 files pass with the original coverage gates unchanged.
  Statements 76.88%, branches 72.54%, functions 76.00%, lines 87.15%.
- Regression tests exercise real wheel listener behavior in jsdom, button and
  keyboard camera changes, source-distance preservation, safe fitting, dense
  label placement and sidebar preference/accessible controls.
- Frontend lint, TypeScript production build and 100-file architecture check pass.
  The existing >500 kB bundle advisory remains visible.
- Local browser at 1440 × 900: collapse increases canvas width from 1110.67 to
  1294.67 px. Opening graph controls takes 244 px; closing returns that space.
  No horizontal overflow. Buttons and keyboard change 100% → 140% → 100%.
- At 390 × 844, no horizontal overflow; graph exploration opens as a drawer.
- Article → source detail → Back restores the exact immutable release/node/camera
  URL and 1095% zoom after render settles. Captured warning/error logs were empty.
- Wheel event handling is tested by dispatching a cancelable WheelEvent to the
  mounted canvas in the test suite. Browser verification covers visual layout,
  button/keyboard controls and navigation; the available browser control API has
  no wheel gesture injection, so no physical-device wheel test is claimed.

Local evidence in ignored `output/article-map-20261020/`:
`viewport-local-desktop.png`, `viewport-frontend-tests.log`.

The current published dataset remains revision 4, run
`315d6109-57bf-4cb1-9395-261825f633da`; no data upload or republishing is needed.
CI and production deployment evidence follows.

## Release checks

PR #11 feature head `caf1524` passed both frontend CI runs (310 tests/43 files,
plus three architecture guard tests) and all static, PowerShell and HTTP smoke
deployment contracts before normal merge. Backend files and publication data
were not changed. CI coverage was 76.91% statements, 72.49% branches, 75.91%
functions and 87.15% lines.

Merged commit: `bbe220b8b0776f891b36b9ca240e4dab79050baa`.
Render manual frontend deployment was requested for that exact tested commit.

Frontend deployment `dep-dbbae267bikc73fqisag` succeeded in 25.5 seconds.
Both `/` and `/index.html` serve `/assets/index-Dozm09bU.js` with the existing
revalidation headers. The public API still returns revision 4 and canonical SHA
`40447bbc111fe0a8df3d924b0c2d67f158f4710fba207c253f349a9fd7f29766`:
7,421 articles, 5,157 claims and 300 original recorded relationships. This release
did not re-upload or republish any data.

Live browser sign-off loaded all 7,421 articles and 10,442 streets from the public
API. At 1440 × 900, the sidebar collapsed to 72 px and the canvas measured
1294.67 px; graph controls opened and closed normally. Zoom buttons produced
100% → 140% → 100%, and the screenshot confirms separated labels/counts.
No captured warning/error console entries or horizontal overflow. The final
1707 × 1067 fullscreen view also had no horizontal overflow. Temporary responsive
viewport overrides were reset, and the live map was left open for the user.

Final screenshots: `output/article-map-20261020/viewport-live-desktop.png` and
`output/article-map-20261020/viewport-live-fullscreen.png`.
Live route: https://global-mass.onrender.com/#/dashboard/atlas
