# Prompt for Antigravity — guided daily analysis frontend

You are implementing the frontend track of GMEE's daily analysis workflow in
parallel with Codex, who owns backend work and integration. Build the assigned
work; do not merely propose another plan. Preserve existing functionality and
report actual verification honestly.

## Read first

Workspace: `D:\expirements\GMEE`.
Expected baseline: `392d3dfb71c77062b92ea029d94a7bcaf1dddd27`, branch
`codex/navigation-data-experience`.

Read these before editing:

1. `docs/architecture/DAILY_ANALYSIS_PARALLEL_PLAN.md`.
2. `docs/contracts/DAILY_ANALYSIS_API_V1.md` — frozen revision 1.
3. `docs/coordination/CODEX_DAILY_ANALYSIS_STATUS.md`.
4. `docs/coordination/ANTIGRAVITY_DAILY_ANALYSIS_STATUS.md`.
5. Current developer console, publication export/upload components, API clients,
   runtime provider, session access patterns and relevant tests.

Inspect Git status read-only. Record your actual HEAD and checkout in your status
file. Codex may already be editing backend files: do not revert, stage, modify or
format those changes. A newer HEAD is not permission to reset to the baseline.
If baseline ancestry or API behavior differs materially, record a blocker before
dependent work; continue independent owned work.

## What the product must accomplish

The developer should be able to follow:

Check workspace → choose existing sources → gather → prepare → extract → inspect
relationships → review → export → upload → review release → explicitly publish.

The full local backend runs analysis. The lightweight Render backend serves
published data and accepts approved publication files. A localhost frontend may
be using a cloud backend, so never infer mode from the address bar. Use the
existing capability/runtime provider and server-confirmed developer access.

Only approved active administrators can operate developer controls. Never grant
access by comparing an entered email to an array in the browser. Preserve
backend permission checks, existing sign-in and in-memory session behavior.

## Your exclusive edit scope

- `frontend/src/features/developer/**`.
- `frontend/src/features/publishing/**`.
- `frontend/src/shared/api/developer.ts`.
- `frontend/tests/DeveloperConsole.test.tsx`.
- `frontend/tests/DeveloperUpload.test.tsx`.
- New `frontend/tests/DailyAnalysisWorkflow.test.tsx`.
- New `frontend/tests/LocalPublicationExport.test.tsx`.
- `docs/coordination/ANTIGRAVITY_DAILY_ANALYSIS_STATUS.md`.

Everything else is read-only. Do not edit routing, navigation, the global shell,
shared styling, other API clients, runtime/session internals, dependencies,
lockfiles, backend, scripts, infrastructure, .env or other documents. Reuse
existing shared components and theme tokens. If you need another file, write an
OWNERSHIP_REQUEST with exact path and reason and continue unaffected work.

Do not perform Git mutations in the shared checkout: no checkout, switch, pull,
reset, clean, stash, add, commit, merge or push. Codex will commit reviewed work.
Do not create competing feature branches in this same working directory.

## A1: mode-aware developer entry

Make the connected runtime and next action obvious. For confirmed local mode,
show the guided analysis workspace. For published mode, show publication-oriented
guidance, the existing upload route and an explanation that analysis runs on the
PC. Do not call `/developer/overview`, preflight, export hints or processing
triggers in cloud mode. Offline, loading and unknown states need their own Retry
and setup guidance. Do not falsely present these as ready.

Preserve existing `#/dashboard/developer` and `#/dashboard/upload` destinations.
Keep a single global shell and main landmark. No broad reader redesign.

## A2: guided local workflow

Arrange existing functionality into understandable ordered steps. Favor clear
titles, short descriptions, visible input/output and a useful next action over
another dense dashboard. Preserve existing-source enable/pause, operational
counts, recent jobs, stage confirmations and stage receipts.

Consume the planned `GET /developer/preflight` response exactly as specified in
the frozen contract. Implement the shared API types/client in your owned file.
Codex implements the endpoint in parallel; use explicit API fixtures until it is
available. Missing/failed checks must be shown as unavailable, never passed.
Model metadata does not prove a successful AI inference run.

Explain that preprocessing may start extraction, extraction may start relationship
analysis, and extraction cycles have a bounded article count. Do not start stages
automatically. Do not introduce “Run all,” cancellation, resume or background
queue behavior the backend does not support. A request timeout means uncertain
outcome: encourage refreshing job history before another deliberate request.
Success, failure, skipped work and pending work must remain distinguishable.

Use API-derived state after refresh; browser step state is only navigation or
local operator acknowledgement, never proof of job completion. Do not store
credentials, tokens, private analysis text or release files in browser storage.

## A3: review/export/publication guidance

Keep review links to articles and relationships, and explain what the developer
should inspect. Counts measure operations, not scientific accuracy. Do not claim
the system determines how much of a topic is fake.

Improve the existing local export component. Label the time inputs as claim
extraction start/end; explain they select completed claims and eligible owning
articles, not publication dates or all collected pages. Keep the actual source
commit, configuration fingerprint and model revision inputs visible. Current
hints are not historical provenance; the operator must verify them.

Each JSON file is a complete replacement release. Explain cumulative selection
when old coverage should remain visible. Keep the 10 MiB maximum explicit. Never
suggest dividing a full collection into multiple replacement uploads. Preserve
the existing export payload, file download behavior and review confirmation.

On the cloud upload screen, present clear stages: choose file, validate/upload,
review, approve/publish, verify. Upload stays staged until publication. Preserve
SHA/expected-revision behavior, previous-release history and deliberate approval.
Explain stale-review/409, oversized file, invalid file, access denied and unknown
network outcomes without automatically repeating writes or publishing.

Do not upload or publish real data during development. Do not change live
accounts, sources, database contents, secrets or Render settings.

## A4: verification and handback

Add meaningful tests for local/cloud/offline modes, absence of local API calls in
cloud mode, preflight failure/unknown, unauthorized access, stage confirmation,
timeouts, cycle limits/chaining copy, export date labels and replacement warnings,
and the required review-before-publish flow. Keep current tests and coverage
thresholds. Avoid snapshot-only assertions or tests that only mirror markup.

Run focused tests first, then the frontend suite, lint, build and architecture
checks serially. Do not add packages to solve routine UI work. Use the existing
theme, fonts, responsive styles and accessible semantics. If browser tools are
available, inspect keyboard behavior and a 390 px viewport using fixture/test
data or read-only real views. Record any browser or local-runtime limitation.

Use `output/daily-analysis/antigravity/` for ignored logs/screenshots; do not
change or stop shared services while Codex uses them. Record service requests in
your status file before any proposed configuration change.

Update your own status at meaningful milestones and for CONTRACT_REQUEST or
OWNERSHIP_REQUEST messages. Do not edit Codex's status or the frozen contract.
No automatic inter-app communication is assumed; shared files are the handoff.

Finish by recording exact files, behavior changes, commands/results, fixture vs
real-server checks, remaining defects and assumptions in your status file. Mark
READY_FOR_REVIEW and `Frontend ownership released for Codex integration: YES`
only after you stop editing. Tell the user: “Frontend handback ready; ask Codex
to read docs/coordination/ANTIGRAVITY_DAILY_ANALYSIS_STATUS.md and integrate.”

The result must be reviewable production-quality code within this scope. Do not
claim paper readiness, full backend functionality or live deployment from passing
frontend fixture tests.
