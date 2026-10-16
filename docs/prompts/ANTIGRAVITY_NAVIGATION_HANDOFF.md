# Antigravity implementation prompt: GMEE navigation and data experience

You are implementing the next GMEE product experience under Codex's architecture
and integration coordination. Deliver working code, tests and review evidence,
not just a mockup. The current interface confuses visitors about the project's
purpose, hides advanced tools and changes navigation between reader, article,
local-system and developer pages. Correct that whole journey while retaining
every existing capability and the established theme.

Record unsupported capabilities explicitly, and keep their implementation outside this frontend assignment.

## Establish the baseline

Read `docs/NAVIGATION_AND_DATA_EXPERIENCE_PLAN.md`, `docs/PROJECT_STRUCTURE.md`,
`CONTRIBUTING.md` and `TASK_SHEET.md` first. The supplied plan is the design
contract. These handoff documents may need copying into your isolated checkout.
Baseline commit is `df6940c323335e641e1a3526c65df77f3eced308` on
`codex/project-foundation`; PR #6 may still be unmerged. Verify ancestry rather
than assuming main contains the reorganized files. Inspect existing changes;
preserve them. Work in a separate checkout/worktree on
`codex/navigation-data-experience`. Do not switch another environment's shared
checkout, overwrite its work, force-push, merge or deploy.

## Communicate the product clearly

GMEE helps people explore collected news articles, inspect extracted statements
and compare reporting with sources and analysis context. An extracted claim is
not a verified fact. A saved assessment is previous model output, and a stored
relationship does not prove copying or transmission. The hosted application
serves completed publications while analysis runs locally. Correct misleading
visible copy and HTML/social metadata. Never promise live web fact checking or
unavailable semantic search. Read counts and dates from APIs; never hardcode
the previously observed 7,421 articles or 5,157 claims.

## Build one coherent workspace

Compose a shared authenticated shell with desktop sidebar, compact mobile menu,
account control, breadcrumbs, clear current section and readable content width.
Use five primary destinations: Home, Explore data, Compare wording, My
investigations and Advanced tools. Approved developers receive a visible
Developer workspace entry after server authorization. Account menus must not
be the only discovery path. Keep Advanced tools immediately identifiable on
desktop and in the labelled mobile menu. Remove duplicate global headers from
specialist pages while preserving their functional refresh and analysis controls.

Create one typed navigation/tool registry containing identifiers, labels, legacy
synonyms, destinations, groups, purpose, input/output and availability category.
Keep feature-page imports in app composition, outside shared descriptors.
Respect app-to-features-to-shared dependency direction and the architecture guard.
Derive active state from routes. Retain the existing hash navigation/session
helpers; do not introduce another routing or state-management framework.

## Make discovery and detail understandable

Landing explains purpose and three reading steps with one main exploration
action. Home orients users using a compact real collection summary and clear
next actions, rather than infrastructure metrics. Explore data contains Articles,
Extracted claims and Recorded connections. Articles uses supported title/author
search, domain filtering and bounded pagination. Preserve query, source and
offset in the URL. Show headline, source, known date and separate internal-detail
and original-source actions. Avoid unsupported filters, invented excerpts or
per-result detail requests just to populate cards.

Add `#/dashboard/claims` deliberately. Published mode reuses saved-claim search;
local mode uses a bounded article selector and recorded article claims, because
the local API lacks equivalent global claim search. Label that scope accurately.
Preserve `/dashboard/check` as local explicit checking versus published saved
claim discovery. Claim results open the owning article with selected claim and
safe return state. Recorded connections retains bounded maps and exact lists;
zero saved links gets an explanation and useful alternatives, never fabricated edges.

An article remains the durable entity; do not invent persistent topics. Preserve
all nine detail tabs, grouped as Source, Analysis, Context and Methods. Maintain
title, source, original link, known date, selected claim and Back to results.
Explain absent published text or evidence instead of generating replacements.
Use meaningful loading, empty, unknown, omitted and error states. Opening pages
must never trigger model inference, collection, comparison submission or publication.

## Preserve advanced work and permissions

Inventory all twelve existing advanced destinations: overview, factcheck,
fullgraph, timeline, masala, graph, vector, cache, corpus, eval, project and
casebook. Keep every URL and feature reachable. Group their directory by task
and explain each tool's input, output and availability. Local-only deep links
must name the requested tool and offer useful alternatives within the same
shell. Preserve public Project Lab examples, private investigations, graph
controls, annotation and specialized telemetry. Examples remain separate from
real corpus and scientific results.

Runtime availability and account permission are separate. Use existing API
authorization, not hardcoded trusted emails. Preserve authenticated annotation
and admin-only review/export policies. Approved developer workflows remain
local run/review/export and cloud upload/review/publish. Explain complete-release
replacement and staged privacy. Preserve existing fingerprint/revision checks;
do not actually upload, publish, alter accounts or create a new backend endpoint.

## Execute and verify carefully

Implement in reviewable steps: inventory, registry/shell, discovery, article
experience, advanced/developer integration, verification. Coordinate ownership
of shared routing, navigation and theme files; another environment must not edit
them concurrently. Retain Hermes ink/red/bone tokens, Instrument Serif headings,
Courier Prime controls and existing body-font roles. Avoid new fonts, glossy
dashboard kits and unrelated visual rewrites. Use consistent spacing, descriptive
labels, visible keyboard focus and accessible mobile menu behavior.

Preserve legacy deep links and safe sign-in return. Normalize old
`#/dashboard?q=...` searches to the equivalent browse destination without a
document reload or lost parameters. Keep private caches identity-bound, reuse
publication/capability providers and fetch only the active feature's bounded
data. Lazy-load heavy advanced renderers when practical. Do not change databases,
migrations, model algorithms, secrets, deployment settings, release payloads or
the historical folder `1/`.

Run frontend architecture checks and their tests, ESLint, production build and
Vitest with existing CI coverage thresholds: lines/functions/statements 60%,
branches 50%. Preserve meaningful assertions and add tests for legacy routing,
query/back state, capability differences, access denial and account switching.
Test real-browser journeys at 1440, 1024 and 390 pixels: sign-in/deep-link return,
article and claim discovery, nine detail sections, advanced-tool discovery,
zero-link/error states and developer restrictions. Do not fabricate usability
sessions, benchmarks or passing results.

Return branch/base/head SHAs, changed files, route migration table, capability
matrix, actual test output, desktop/mobile screenshots and remaining issues.
Keep the implementation ready for Codex review. Do not claim production or
paper readiness, merge the branch, deploy it or modify live data.
