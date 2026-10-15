# Strategy and implementation for an excellent B.Tech submission

15 October 2026. Target: a project that is easy to demonstrate, technically
substantial, reproducible and honest about its evidence. A perfect university
grade is an external assessment; it cannot be certified by the implementation.

## Completion strategy

| Objective | Implemented work | Acceptance evidence |
|---|---|---|
| A coherent demonstration | Project Lab guides corpus → relationships → evidence → saved investigation → human review | Browser walkthrough and route tests |
| Explainable analysis | Full original-text highlighting of typed changes, including Unicode code-point offsets | Unicode/overlap and unsafe-text rendering regressions |
| Useful analyst workflow | Private casebook with server-computed immutable snapshots, review notes, search, pagination and reversible archive | Auth, owner isolation, snapshot hashes and stale-write tests |
| Shareable results | Markdown/JSON case exports and downloadable engineering-control report with method/data fingerprints | Export-content checks; public report contract |
| Measurable engineering behavior | Twelve disclosed numeric/context/equivalence controls and a transparent lexical baseline | Actual engine outputs: 12/12 controls; lexical baseline 9/12 |
| A maintained toolchain | Node 24, patched Vite/Vitest, Tailwind 4/PostCSS migration removing the unpatched braces chain | Production build and npm audits |
| Reliability | Regression suite, strict types, migrated casebook schema, private-response cache policy | Automated gates; real PostgreSQL rollout remains a Docker recovery gate |
| Reproducible evaluation | Existing frozen human-data pipeline, grouped relatedness comparisons and separate calibrated/selective/span/context reports | Tested calculations and export provenance; natural-news study remains independent work |
| Dependable local inspection | Full Docker launcher plus an explicit read-only preview that runs the real text controls | Preview HTTP/path-isolation tests and browser inspection |
| A defendable submission | Architecture, limitations, reviewed related work and a short viva walkthrough | Documents and retained validation evidence |

The engineering controls are authored examples, not research gold or a
natural-news accuracy estimate. Their expected outcomes and the lexical
baseline are visible in `backend/app/services/project_lab.py` and exportable
from the UI. No existing corpus labels are changed by the demonstration.

## New user-visible features

**Project Lab** (`#/dashboard/project`) introduces the project as a guided
workspace. Select a control to see original texts, typed changes, equivalent
units, interpretation limits and raw span metadata. Export the complete report
or open the selected pair in Investigation Studio.

**Casebook** (`#/dashboard/casebook`) is available to ordinary signed-in users.
Enter a pair and case title, analyze it, then capture a private file. Saving
computes the snapshot again on the server; arbitrary client analysis is never
trusted. Notes/status can change, while captured inputs, method, spans and their
SHA-256 fingerprint remain immutable. Concurrent stale edits return 409, and
another account receives 404 rather than learning whether the case exists.
Archive reversibly or export the saved case as Markdown/JSON. Review status is
an analyst workflow marker, not a truth judgment or human-gold label.

**Clear change highlighting** preserves Python's Unicode offsets, merges
overlapping highlights and renders user text as escaped React text. The dark
workspace also has readable secondary buttons and chips. Service diagnostics
collapse on the new workspaces so the task stays visible above the fold.

## Inspect locally

The current read-only preview is at:

**http://localhost:4173/#/project**

The public preview route exposes the fixed controls. Following integration with
the latest upstream reader/sign-in UI, `#/dashboard/project` and the other
reader/advanced workspaces require sign-in. Offline preview actions cannot
create an account or open database-backed tools. See
[the integration record](INTEGRATION_REVIEW.md).

`Start-Preview.bat` restarts this preview after the session ends; run `npm ci`
and `npm run build` inside `frontend` after any source change. The preview
requires Python 3.11+ and has no third-party Python dependencies. It serves only
built assets and the real, fixed engineering controls on loopback. It does not
simulate accounts, stores, corpus content or model-backed evidence. These APIs
return 503 while Docker is unavailable.

After the user recovers Docker/WSL, run **Start-GMEE.bat** from the repository
root. This builds the latest sources and applies `gmee05`, which adds
`investigations` without changing existing articles/claims/labels. The complete
app is then **http://localhost:3000/#/dashboard/project** after readiness passes.
Register/login to use Casebook. Existing accounts and their roles are preserved.

The user chose to handle Docker recovery after development. Native Windows
tests and the explicit preview permit useful validation meanwhile; neither is
a claim that the unavailable full stack has been redeployed.

## Five-minute demonstration

1. Open Project Lab and explain the data path using its five navigation cards.
2. Compare “1 km” and “1000 m”: the lexical baseline flags a wording difference,
   while the quantity-aware analyzer recognizes equivalence. Contrast with the
   changed-count and lost-uncertainty examples. Inspect the returned spans.
3. When the full stack is ready, inspect a real corpus article, graph neighbor
   and cited passage. Explain why support inside a corpus is not factual truth.
4. Sign in, investigate a pair, save a titled case, edit review notes and export
   it. Show that the immutable snapshot fingerprint does not change with notes.
5. Open Eval Lab and explain blinded annotation, unresolved cases, provenance,
   event-disjoint splitting and the remaining empirical publication study.

## What still determines the final academic result

The student must understand and defend the code, demonstrate the recovered full
stack, document actual hardware/runtime measurements and complete any required
supervisor/user study. A publication claim additionally needs independent human
data and matched held-out experiments. These tasks must use real observations;
synthetic labels, large corpus counts or a prettier dashboard cannot replace
them. See [Research](RESEARCH.md), [Evaluation](EVALUATION.md) and the
[original review](PROJECT_REVIEW.md).
