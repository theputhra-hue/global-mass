# Complete article topic map status

Owner: Codex. 20 October 2026, Asia/Calcutta.

- Local implementation and real-data processing: COMPLETE.
- Current source branch: `codex/complete-article-topic-map`.
- PR: https://github.com/theputhra-hue/global-mass/pull/9.
- Final feature head: `c7a3cdef0d3431d7a63e08873cc5c4928af17e08`.
- PR #9 MERGED as `1fe5ada763758d1944cffc284ee33afe0deb3e5e`.
- All CI gates PASS: 668 backend unit, 3 real model, 14 real PostgreSQL integration,
  284 frontend tests with unchanged coverage gates; lint/types/architecture,
  cloud isolation and deployment contracts pass.
- Real processing: 7,421 articles, 98 topic groups, 2,334 unclassified.
- Input coverage: 2,294 stored text, 5,078 title only, 49 unsupported language.
- Preserve all 5,157 claims and 300 relationships; no source-row updates.
- Latest reviewed candidate: run `099b879d-ecb0-44e0-bf77-bc0689afab55`, fingerprint
  `b8c9b5f6424a4113ec5dfecbcf4f16e09120e035f03a69b5cb41917c4d0c6015`.
- Candidate file: `publication-outbox/gmee-article-map-source-pinned-20261020.json`.
- Algorithm provenance source revision: `92b83c51a4e493880f03c99c2511948d1edc804b`.
- Rerun reused all 7,372 vectors and reproduced identical topics/coordinates.
- Local rehearsal API: 8004; frontend: http://127.0.0.1:3002/#/dashboard/atlas.
- Delivery: COMPLETE. Both Render services run merge `1fe5ada`; gmee08 migration
  succeeded. Backend deploy `dep-dbb8pi1srm7s739hrasg`, frontend manual deploy
  `dep-dbb8pt67bikc73fe1tug`. Root URL propagation confirmed after a stale cache.
- Existing developer UI uploaded/reviewed/published the exact candidate as public
  revision 3 at `2026-10-19T21:40:38.558264Z`; prior releases retained for rollback.
- Read-only public verification: 15 pinned pages, 7,421 unique IDs, every assignment
  and coordinate matches export. Live search/filter/overlay/drill-down checked.
- Public map: https://global-mass.onrender.com/#/dashboard/atlas.
- Evidence/report: `docs/validation/ARTICLE_TOPIC_MAP_2026-10-20.md` and ignored
  `output/article-map-20261020/live-proof.json`, `live-atlas.png`.
- Next research work: better source text, manual topic/relationship evaluation,
  and new claim analysis. These were not manufactured by this map processing run.

No Colab workflow or paid inference was used. Antigravity's completed scope and
pre-existing Codex deployment notes remain untouched.
