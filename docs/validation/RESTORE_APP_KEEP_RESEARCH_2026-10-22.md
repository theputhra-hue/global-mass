# Restore the tested application and retain research — 22 October 2026

The requested reconciliation keeps the research and paper work from GitHub main
`42a34361a5a4784db856946a89750e183e7e727b` and restores production application
behavior from `5486e8ec329cf698c5bca897c5fbb31e2c262e20` (account controls release).
It does not rewrite shared history.

## Result

- Restore the earlier navigation, typography, article pages, specialist tools,
  graph integration, map builders and their regression tests.
- Retain account registration/approval, the complete account directory and
  server-enforced Allow/Pause/Ban controls exactly as in the tested release.
- Retain all 77 research/support files introduced or changed by the teammate's
  commits: manuscript, figures, bibliography, benchmark runners, reconstruction
  tools, annotation material, candidate exporter, research tests and research
  instructions. Git blob comparisons establish preservation; frozen byte rules
  in `.gitattributes` remain in place. Analyzer differences from the application
  baseline are line endings only, retained for the research receipts.
- Remove the added product-only local atlas preparation helper/tests and the
  superseded UI/local-map implementation receipts. The established application
  map builders remain available. No stored map, corpus, annotation or private
  export is deleted or regenerated.
- Preserve all three pre-existing local draft files byte-for-byte. Their backups
  and the source-preservation manifest are ignored under
  `output/restore-app-keep-research/`.
- Remove one inherited trailing space from the restored SystemHealth source;
  it has no behavioral effect.

## Verification

- Backend: 717 offline tests passed, 22 integration/model tests deselected;
  coverage 82.41%, above the 70% gate. Ruff passed; strict mypy passed on 232 files.
- Frontend: 359 tests passed; lint, production build, dependency architecture and
  three architecture tests passed.
- Research: 30 synthetic tests passed. The missing RapidFuzz 3.14.3 test dependency
  was installed in an ignored test-only directory, leaving app dependencies and
  frozen research sources unchanged. No historical benchmark was fitted, scored
  or repeated; these tests do not independently validate paper results.
- Infrastructure: 30 tests, backend boundaries, local/cloud/publication API
  contracts, static deployment checks and PowerShell parsing passed.
- Browser: the restored localhost UI signs in to the existing API, shows all six
  accounts with protected staff and Allow/Pause/Ban controls, restores our
  navigation destinations and loads the 7,421-article / 5,157-claim collection.
  Browser testing performs data reads and normal login/session bookkeeping only.
  It does not change account decisions, upload a release or publish data.

## Release state

This receipt establishes local reconciliation and verification, not a GitHub push
or Render deployment. The current repository instructions require explicit user
permission before a push. After permission: push a feature PR, check CI for its
exact head, merge, then verify both Render services and the active publication.
