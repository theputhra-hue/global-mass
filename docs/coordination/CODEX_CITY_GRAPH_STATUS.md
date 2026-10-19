# Spacious city graph status

Owner: Codex. 20 October 2026, Asia/Calcutta.

- User authorized implementing the city plan and explicitly asked for spacious UI.
- Branch: `codex/spacious-city-network`; PR #10:
  https://github.com/theputhra-hue/global-mass/pull/10.
- Final feature head: `5b4fca0`; all checks passed and PR #10 was merged normally.
- Merge: `43b63ea98b51a22f8239e5db9222290d14361c98`.
- Core producer/source commit: `b8580c9`; subsequent commits change UI only.
- Final export (ignored):
  `publication-outbox/gmee-city-network-source-pinned-20261020.json`.
- Run `315d6109-57bf-4cb1-9395-261825f633da`;
  SHA `40447bbc111fe0a8df3d924b0c2d67f158f4710fba207c253f349a9fd7f29766`.
- 7,421 articles / 5,157 claims / 300 existing relationships / 98 topics retained.
- New exploratory roads: 10,442; 23 topic highways; 76 machine themes (including
  singleton topics); one superway. 5,113 articles have semantic neighbors.
- 7,372 cached embeddings reused; 49 unsupported inputs stay in a separate inset.
- Final producer rerun took 6.47 s and reproduced identical streets and hierarchy.
- Original corpus fingerprint before/after remains
  `ae454dcb36b24c932238a35296f80992`.
- Local cloud rehearsal API 8004, frontend 3002; final dataset activated locally.
- Browser checked source drill-down/back with exact 2000% camera restoration,
  256-article topic filter, route support (superway five pairs), fullscreen canvas
  within the viewport, minimap/zoom and responsive exploration controls.
- Fullscreen evidence: `output/article-map-20261020/city-local-fullscreen.png`.
- Final frontend CI: 304 tests / 42 files plus three architecture checks.
- Final backend CI: 681 tests (83.21% coverage), three real pretrained model
  checks, 14 real PostgreSQL/pgvector integration tests; required suites zero skips.
- Minimal cloud image `gmee-cloud-city:local` built and import isolation passed.
- API deployment `dep-dbba11m7bikc73afru30`: live, gmee09 migration confirmed.
- Frontend deployment `dep-dbba1cs9v7es73ef0i5g`: live on exact tested merge.
- Public frontend asset: `index-CwKS6Nh7.js`, verified at root and index.html.
- Exact final candidate uploaded/reviewed/published through pavan's developer
  account, revision 4. No duplicate write or retry was necessary.

Complete read-only public API comparison passed: 15 article pages, six road pages,
exact assignments/coordinates/roads/hierarchy/degrees, and retained recorded links.
Live browser verified the 256-article filter (514 routes), five-pair superway
inspector, fullscreen with no horizontal overflow, and an empty console error/
warning capture. Evidence: `city-live-proof.json` and `city-live-fullscreen.png`
inside `output/article-map-20261020/`. Earlier releases remain for rollback.
Implementation, data publication and live verification are complete.

No Colab, paid service, fabricated bridges or human-accuracy claims. The cutoff
0.55 and mutual top-10 network are explicitly exploratory, not human-validated.
The full master plan also includes later research/vector-export/device evaluation
phases; do not claim those complete. Pre-existing unrelated notes remain untouched.
