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
CI and production deployment evidence follows after release.
