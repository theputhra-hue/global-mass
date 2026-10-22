# Core evidence and RAM-price work — saved checkpoint

Saved on **22 October 2026 (Asia/Calcutta)** at the user's request to stop and resume tomorrow.
This is a **local work-in-progress checkpoint**, not a completed release. Do not
resume development until the user returns. No automation or reminder was requested.

## Objective and scope

GMEE's purpose is to compare reporting, explain what changed, and expose source
evidence and uncertainty. The user prioritized core integrity over additional
presentation changes, and selected **tech / RAM prices** as the first topic.
No date range was specified: the first audit covers all dates in the existing
archive, with explicit optional UTC date filters. Do not interpret a broad
topic or lexical match as a verified event or independent human label.

Branch: `codex/core-evidence-integrity`.
Baseline: `ddfb3efbf0c81c567bc7ccd6782bc2b1d564656b` on `origin/main`.
The previous restoration PR #17 is merged and live. This checkpoint has NOT
been pushed or deployed. AGENTS.md requires fresh explicit permission to push.

## Implemented locally

1. `backend/app/services/analysis_availability.py`: additive disclosures for
   publication, text availability, extraction status, recorded claims and
   assessments; warns when local extraction says completed without usable text.
   Stored labels/counts do not imply scientific validation.
2. Published API: `publication_status=published` is separate from
   `nlp_status=not_recorded` and `processing_status=not_recorded`. Dashboard/stat
   NLP counts no longer call publication an extraction state. Article detail
   includes release-level operator-declared provenance. Claims explicitly state
   that detailed evidence was not published. Existing publication bytes and
   fingerprints are unchanged; formats 1–3 still omit source bodies/evidence.
3. Local article API: additive analysis/evidence availability metadata.
4. Frontend: article availability panel, clear extraction labels, shared stored
   assessment presentation and explanations in claim search. Historical
   `P(supported)=...` is displayed as a legacy heuristic score without rewriting
   stored history. Only explicitly stored passages with safe HTTP(S) links can
   appear as citations; neighboring claims/signal dictionaries are not promoted
   to source evidence. Missing evidence and missing method identity are explicit.
5. RAM-price candidate audit: pure read-only service and
   `python -m scripts.audit_ram_prices`, validating an existing publication,
   optionally filtering UTC dates and writing a new metadata-only receipt under
   ignored `output/` or `publication-outbox/`. No corpus write, label, event
   assignment, source-text upload, model inference or network collection occurs.
6. RAM observation schema and pure comparison guard:
   `backend/app/schemas/ram_prices.py`. Same-offer comparisons require reviewed,
   attributable observations, distinct source capture/revision IDs, ordered
   aware dates, and matching RAM SKU/capacity/module count/type/speed/condition,
   market/seller/currency/tax/shipping/offer conditions. Decimal arithmetic;
   unknown conditions and device-price inputs are rejected. This is currently a
   schema/helper with synthetic tests, NOT a persisted observation workflow,
   authentic review system, market-wide finding or validated research method.

New frontend helper files in `features/*/lib/` need explicit Git inclusion:
the repo's broad ignored `lib/` pattern otherwise hides them. The checkpoint
must include `features/articles/lib/analysis.ts` and
`features/claims/lib/assessment.ts`.

## Real-data evidence collected

Input: `publication-outbox/gmee-city-network-source-pinned-20261020.json`.
Validated archive: 7,421 articles and 5,157 claims.
Run: `315d6109-57bf-4cb1-9395-261825f633da`.
Canonical SHA-256: `40447bbc111fe0a8df3d924b0c2d67f158f4710fba207c253f349a9fd7f29766`.

Command from `backend/`:

```powershell
.venv\Scripts\python.exe -m scripts.audit_ram_prices --snapshot ../publication-outbox/gmee-city-network-source-pinned-20261020.json --output ../output/core-evidence/ram-prices-audit-v1.json
```

Result: **8 unreviewed candidates, 2 domains, 1 candidate without claims,
0 missing publication dates**. Selection requires memory and price/supply
keywords in the same title or extracted statement. Some candidates concern
whole-device prices or memory shortages: they are not automatically RAM-price
observations. All relevance reviews remain pending and event IDs remain null.
Archive omits full source text, detailed evidence and extraction completion.
Receipt contains source-file and canonical hashes; do not overwrite it.

Docker's Linux engine was unavailable when checked. Do not claim a new audit of
the local PostgreSQL database or infer that source text is absent there. The
snapshot audit only establishes what was published.

## Verification actually completed

- **65 backend tests passed**: analysis availability, RAM guards, published
  results, article insights and publication contracts. Disposable SQLite/ASGI
  fixtures; no production database changes.
- **40 frontend tests passed**: core evidence, article investigation and
  navigation corrections. One initial incomplete legacy-fixture crash was fixed
  by preserving unknown-field states. Subsequent targeted run passed.
- Frontend lint passed before the last provenance-panel addition.
- Frontend TypeScript/Vite production build passed after that addition. Existing
  large-bundle warning remains; it is not a build failure.
- Strict mypy passed on the five initially touched backend source modules before
  the RAM schema was added.
- Ruff fixed import ordering and `re.IGNORECASE` aliases in the earlier files.
  Final Ruff/mypy covering the latest files still need to run.
- No new browser verification completed for this change. Existing local preview
  was found on `http://127.0.0.1:3004`; browser tab 3. It proxies the live API, so
  it can verify frontend fallback behavior but not the new backend responses.
- Browser tab 5 is the live site, unchanged by this checkpoint. Render tab 1 is
  the previous successful deployment. Existing browser bindings may go stale;
  follow browser documentation and inventory before resuming.

The first sandboxed test runs encountered Windows temporary-file restrictions
or stalled. The stalled backend session was interrupted; the approved
unsandboxed targeted runs above completed. Do not treat the initial failures as
passing runs or leave duplicate test processes running.

## Remaining work, in order

1. Review the complete diff and rerun final Ruff, strict mypy, frontend lint,
   both full suites and architecture/interface/cloud-isolation checks applicable
   to this change. Keep offline, real-model and real-Postgres evidence distinct.
2. Check UI component uses: `ClaimCard` gained a `published` prop; its callers
   should pass `archived` so old API preview responses say evidence was omitted
   from the archive rather than merely unattached. New API metadata already
   supplies the correct status. This is an unfinished integration detail.
3. Review RAM schema completeness (e.g. timing/ECC/form factor may need explicit
   fields if SKU cannot uniquely bind them). A review-status string and reviewer
   ID in a schema are not authenticated human review or independent gold.
4. Browser-check article overview/evidence/methods, zero-claim and populated
   records, local missing-text warning, mobile layout and safe citation links.
   Use a disposable local backend if testing new API responses; never publish
   fixtures into the live corpus. Save a screenshot when presenting the result.
5. Review the eight RAM-price candidates for relevance, retaining exclusions and
   reasons. Acquire usable, rights-reviewed source passages and comparable RAM
   observations before calculating substantive price-change findings. Do not
   equate a laptop or phone's price with the price of its RAM.
6. Design versioned, bounded publication evidence/provenance transport before
   claiming the cloud can display new detailed evidence. Preserve fingerprints
   and compatibility of existing releases. Current work only discloses the gap.
7. Continue the larger scientific gates: independent contextual annotations,
   verified event grouping, event-disjoint splits, matched baselines and
   untouched confirmation. No valid broad GMEE news result has been created.
8. Once reviewed and verified, show localhost to the user. Ask for explicit push
   permission only when the result is concrete and ready; no automatic merge or
   Render deployment is authorized for these new changes.

## Preserve unrelated existing work

Do not reset or stage the pre-existing local drafts:

- `frontend/src/features/articles/components/HomeOrientation.tsx`
- `frontend/tests/App.test.tsx`

Do not absorb the unrelated untracked notes:

- `docs/coordination/CODEX_LIVE_GRAPH_DEPLOYMENT_STATUS.md`
- `docs/validation/CODEX_LIVE_GRAPH_DEPLOYMENT_2026-10-20.md`
- `docs/validation/CODEX_LIVE_GRAPH_RECHECK_2026-10-20.md`

Preserve all frozen research sources, manuscript/results, local databases,
private account files and original outbox archives. No credentials belong in
this checkpoint. No external publication or live account decision was changed.

## Resume prompt

> Read docs/checkpoints/CORE_EVIDENCE_RAM_PRICES_2026-10-22.md and resume the core
> evidence work on codex/core-evidence-integrity. Our first topic is RAM prices.
> Preserve existing changes and frozen research. Finish verification and browser
> checks, then show me the localhost result. Do not push or deploy yet.

## Resumed continuation — 22 October 2026

The user resumed this checkpoint. See the new
[verification receipt](../validation/CORE_EVIDENCE_VERIFICATION_2026-10-22.md)
for completed integration fixes and checks: 750 offline backend tests, 367
frontend tests, coverage gates, static/interface/cloud-isolation checks and
desktop/mobile browser verification against an isolated in-memory copy.
Local preview is at `http://127.0.0.1:3004` with a visible verification banner;
the real site's data/accounts are unchanged. Evidence transport, source/rights
review, authenticated RAM observation review and scientific validation remain
open. No push or deployment occurred. This continuation supersedes the earlier
pending verification items; the original checkpoint above is retained as history.
