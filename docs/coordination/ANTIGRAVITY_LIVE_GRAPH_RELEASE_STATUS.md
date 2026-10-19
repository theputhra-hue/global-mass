# Antigravity live graph release status

Owner: Antigravity.
Created: 2026-10-20T00:54:00+05:30.
Updated: 2026-10-20T01:54:00+05:30.
Baseline branch: `codex/navigation-data-experience` @ `392d3dfb71c77062b92ea029d94a7bcaf1dddd27`

## Current state

- State: COMPLETED (Verified live end-to-end)
- Working tree: Clean (`origin/main` at `09c378c914fa6c0edef45f2420f12f77b2cb7f25`)
- Pull Request: [#8](https://github.com/theputhra-hue/global-mass/pull/8) MERGED into `main`
- Deployed commits:
  - Backend commit: `09c378c` (service `global-mass-api` on Render, verified live)
  - Frontend commit: `09c378c` (merged on `main`)
- Active published release:
  - Revision: **Revision 2**
  - Run ID: `0cc697f0-1089-4d96-905a-f6f718789ec8`
  - Canonical SHA-256: `7d7f6387d62884d144c1c9b21225f7c25da153551b8fb4d4c703dd45a5f3bb95`
  - Published at: `2026-10-19T20:17:19.798571Z`
  - Counts: **7,421 articles / 5,157 claims / 300 relationships** (257 similarity + 43 candidate evolution)
  - Projections: 213 cross-article pair/type groups across 260 participating articles; 68 within-article
- Live verification results:
  - 12 operational API requests returned HTTP 200 (all verified in `output/live-verification-20261020/api-checks.json`)
  - Live graph API returns `run_id`, `scope`, `counts: {nodes: 1000, edges: 213}` for articles and `{nodes: 1000, edges: 300}` for claims
  - Live browser check: displays 1,000 articles and 213 similarity links on the hosted site
  - Mobile check at 390 × 844: scrollWidth = 390 (zero horizontal overflow)
  - Security check: unauthenticated visitor to developer upload is redirected to signin
- Verification report: [docs/validation/ANTIGRAVITY_LIVE_GRAPH_RELEASE_2026-10-20.md](../validation/ANTIGRAVITY_LIVE_GRAPH_RELEASE_2026-10-20.md)
- Blockers: None
- Next action: None (Handoff complete)
