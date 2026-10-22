# Core evidence continuation — 22 October 2026

Continues local checkpoint `0b5a192` on `codex/core-evidence-integrity`.
This is engineering verification and candidate-data preparation. It does not
establish new scientific accuracy, human gold, market trends or misinformation.

## Changes completed after the checkpoint

- Pass archive context into every claim preview, including selected claims
  outside the current page. Older API responses now disclose omitted evidence
  correctly; no historical record is rewritten.
- Require known and matching RAM form factor, ECC and primary timings, in
  addition to the previously checked SKU/kit/speed/market/offer conditions.
  Schema review fields are not authenticated judgments or independent labels.
- Fix the remaining advanced FactCheck wording that equated absent stored
  neighbors with a single source. Apply the common legacy-score clarification
  and explain `UNSUPPORTED` without declaring falsehood.
- Evidence section instructions now describe inspecting available evidence;
  the published reader is not offered a promise of new cloud AI checks.
- Correct the RAM test helper's type annotation and import formatting. No
  frozen analyzer, benchmark runner, prediction file or manuscript changed.

## Verification

- Full backend offline suite: **750 passed, 22 deselected**, coverage **82.62%**
  against the 70% gate. Real pretrained-model and PostgreSQL tests were not run
  as part of this local suite. Synthetic/SQLite results are not live-DB evidence.
- Final frontend suite: **367 passed in 48 files**, with all coverage gates
  passed: **87% lines, 77.42% statements, 76.52% functions, 74.41% branches**.
  The build, lint and architecture check were rerun after the final source edits
  and passed. Tests were run directly through Vitest's Node entrypoint because
  the first npm invocation did not forward the coverage flags on this shell.
- Ruff passed across `app tests scripts`; strict mypy passed on **238 files**.
- Frontend lint, TypeScript/Vite build and dependency architecture passed;
  architecture includes **119 source files** and its three regression tests.
  The existing large-bundle warning remains; it does not fail the build.
- All local, cloud and publication interface checks passed. Minimal cloud
  dependency runtime check passed without importing ML libraries.
- Backend architecture and **30 infrastructure tests** passed. Deployment static
  checks passed. Initial infrastructure tests in the Windows sandbox failed
  because temporary-file cleanup was denied; the approved retry passed. No
  production store, migration or backup restore was exercised by these tests.

## Browser verification

A disposable in-memory SQLite backend on `127.0.0.1:8004` imports the original
archive and serves the actual modified cloud API. The frontend at
`http://127.0.0.1:3004` proxies only this backend. A synthetic local viewer signs
in through the normal authentication flow; FakeRedis is confined to this
ignored verification harness. No real user's password, access state or data was
changed. The page carries a visible local-verification banner.

Verified in a real browser:

- Published article search and collection counts load from the copied archive.
- A memory-shortage article with one stored claim displays extraction completion
  as unrecorded, source text as omitted and assessments as unvalidated.
- Its claim preview and evidence page disclose that source evidence was not
  published. Historical probability wording appears as a legacy heuristic.
- Data & methods shows bounded, operator-declared release provenance separately
  from an individual assessment's unknown method identity.
- A Samsung memory-shortage article with zero claims explicitly reports zero
  recorded statements and does not infer that the source contains no claims.
- At a **390 × 844** mobile viewport, section selection preserves the selected
  claim and release. The measured document width was 382 for a 390 viewport;
  no horizontal overflow was observed. Temporary viewport override was reset.
- Browser console error collection was empty for the checked paths.

Screenshots are saved privately under `output/core-evidence/`:
`desktop-availability.png`, `mobile-availability.png`, and
`zero-claim-article.png`. Local missing-text handling and unsafe-citation cases
were covered by component/API tests; no claim is made that a real missing-text
local database row or unsafe external site was browser-tested.

## RAM-price scope: evidence still required

The existing receipt `output/core-evidence/ram-prices-audit-v1.json` remains
unchanged. It identifies eight lexical candidates across two domains, one with
no claims. Titles/claims and the archive are unverified source material, not
proof that the linked article exists or that its statements are correct.

The following is **AI-assisted metadata triage**, not human relevance gold,
final exclusion, independent annotation or source verification. All candidates
retain their pending review state and null event assignment.

| Candidate title context | What needs review |
|---|---|
| MacBook Air and memory shortage | Supply/device context; no separate RAM offer established. |
| Raspberry Pi cyberdeck tutorial | Project/device cost versus a RAM component price. |
| Lenovo Legion Go S deal | Whole-device sale; do not convert it into a RAM price. |
| Amazon hardware price increase | Device prices and attributed supply explanation; no causal conclusion. |
| Mac Mini starting price | Complete computer price and configuration, not a standalone RAM offer. |
| Pixel specifications/price leak | Phone pricing and rumored specifications; verification and scope needed. |
| Samsung shortage outlook | Forecast/supply context; no extracted statements in this archive. |
| Xbox price increases | Console prices, currencies and market conditions; not a standalone RAM offer. |

Before meaningful comparisons, acquire source-access/rights-reviewed passages,
exact RAM part numbers, kit capacity/count, type/speed/timings/form/ECC,
condition, market/seller, currency, price basis, tax/shipping/offer conditions,
observation time and immutable capture/revision identities. Keep article
publication time separate from offer observation time. Review source relevance
and attribution, retain exclusions and use independent human annotations for
any claimed benchmark. No substantive RAM price-change result is produced here.

## Next implementation boundary

Publication formats 1–3 deliberately omit source bodies and detailed evidence.
This work discloses that gap; it does not add evidence transport or automatically
regenerate the archive. A future version should use bounded, explicit passage
records, safe URLs and source/capture hashes; separate source passages from
matched claims; include real per-stage status and scoped method provenance;
preserve earlier fingerprints; and require an explicit rights/review decision
before copying excerpts into a public release. Missing values must stay unknown.

Keep human relevance/event review, independently annotated gold, frozen
event-disjoint splits and untouched confirmation as open scientific gates.
The RAM schema/helper is not a persisted data-entry/review workflow.

No push or deployment has been performed. The user's pre-existing local drafts
and unrelated notes are preserved. This localhost preview is an isolated copy,
not a new live publication.
