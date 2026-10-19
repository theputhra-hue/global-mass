# Make GMEE understandable

Date: 2026-10-16. This is a usability track beside the production, publication
and article-detail plans. Preserve all existing data, tools, account restrictions
and deep links. Keep the red/ink/bone palette and existing typography.

## Outcome

A first-time visitor can explain what GMEE does and find their first article
without understanding embeddings, Neo4j, Redis, pipeline jobs or claim graphs.

Primary journey: **Understand the collection → search → open an article → inspect
its claims and sources → investigate further when useful.**

GMEE currently hosts a published archive. It does not run fresh AI analysis for
visitors. Search matches titles/authors; saved claim search matches statements.
These must be the default explanations on the cloud site. Do not describe the
archive as live monitoring or semantic web fact checking.

## Problems to correct

- Landing-page explanations lead with implementation details and local-only
  capabilities. New visitors cannot identify their first action.
- Homepage totals, action cards and article search compete for attention.
- “Find evidence” means different things locally and in the published site.
- The cloud advanced workspace shows twelve equally prominent tabs, several
  leading to tools that only run on the analysis PC.
- An article page offers nine tabs before explaining what is available for that
  article. Missing source text can look like a failure even though the archive
  intentionally publishes metadata and derived claims only.
- The legacy archive has no stored relationships. Empty graph and related-item
  views need an explanation and a useful next action.
- Infrastructure health and research limitations are important details, but
  should not dominate the ordinary reading journey.

## Information architecture

| Place | Main purpose | Primary action |
| --- | --- | --- |
| Landing | Explain the collection, three reading steps and limits | Sign in to explore |
| Explore | One prominent article search and readable results | Open article details |
| Saved claims | Search already extracted statements and inspect saved assessments | Open the owning article |
| Compare wording | Compare two supplied texts; explain changes rather than truth | Compare two versions |
| Tools & guides | Explained directory of specialist tools and their availability | Choose a tool by purpose |
| Article details | Keep source, claims and available context together | Read claims or original source |
| Developer workspace | Collection, local AI, export, review, upload and publish | Next operator step |

Use existing routes. “Start here” and “Articles” can remain distinct destinations
while sharing the same search-first layout. The tools directory replaces the
cloud's repeated tab wall. Specialist pages link back to the directory and article
search. Local operational tools remain discoverable with an explicit “Local PC”
label. This does not grant additional account permissions.

## Delivery checklist

| ID | Work | Acceptance | Status |
| --- | --- | --- | --- |
| U01 | Clear landing story | First screen states what visitors can find, what a claim means and where to start; remove cloud-inaccurate feature promises | IMPLEMENTED LOCALLY |
| U02 | Search-first reader | Search precedes secondary actions; compact real counts; clear results, source/date, details CTA and return state | IMPLEMENTED LOCALLY |
| U03 | Explained tools directory | Group tools by task; describe input/output and local/cloud availability; retain every route | IMPLEMENTED LOCALLY |
| U04 | Article orientation | Explain available metadata, saved claims and missing source text; give next-step links while retaining all nine tabs | IMPLEMENTED LOCALLY |
| U05 | Operator task flow | Developers see run/review/export locally and upload/review/publish in cloud, with current stage and full-release download for review | OPEN |
| U06 | Graph and unavailable states | Zero-link explanation, local-tool notices and cloud article-timeline navigation implemented; richer graph interaction testing remains | PARTIAL |
| U07 | Freshness and performance | Compact publication date and optional explanation implemented; cloud reader reuses release counts. Backend full-payload status optimization remains | PARTIAL |
| U08 | Usability verification | 196 frontend tests; real published-data search/detail/back and 390px reader/tools overflow checks passed. Uncoached teammate usability sessions remain | PARTIAL |
| U09 | Release | Local tests/lint/build passed; prepare reviewable PR. Deployment and live redesign verification remain | IN PROGRESS |

## Copy and interaction rules

- An article is a source document. A claim is an extracted statement; extraction
  does not verify it. A saved assessment is a previous model result, not a fact.
- Similarity and changes are comparison signals, not proof of copying or truth.
- Explain a tool in one sentence before showing controls. Use a short example
  where it helps; never use fictitious examples as stored articles or results.
- Use one primary action per section. Secondary actions are links or quieter
  buttons. Keep verbose explanations in optional details, not repeated panels.
- Do not show zero for unknown values. Do not imply fresh collection from a
  publication date or current API response timestamp.
- Preserve source links, query/pagination URLs, selected claims, nine article
  tabs, export, research controls, graph options and role enforcement.
- No automatic analysis, publication, subscription, new accounts or database
  changes as part of reading or navigating.

## Verification scenarios

1. Signed-out visitor understands the site and reaches sign-in without private
   API requests. Sign-in preserves an intended article destination.
2. Reader searches a title/author, opens the correct article, sees source/date,
   inspects claims, then returns to the same query and page.
3. Reader can explain the difference between source, extracted statement and
   saved assessment. No new inference is implied by opening a page.
4. Reader identifies a comparison tool by its purpose without knowing its old
   technical name. All existing specialist URLs still work.
5. Zero relationships produces a clear explanation and link to article search
   or wording comparison, rather than an unexplained empty visualization.
6. Cloud pages identify local-PC tools before the user expects them to run.
7. Approved developers retain publishing controls; ordinary readers do not gain
   developer controls. Backend checks remain authoritative.
8. At 390px, the page does not overflow; controls have labels, focus is visible,
   and detail tabs remain keyboard accessible.

Engineering checks verify behavior. Before calling the design intuitive, ask
both teammates to perform scenarios 1–5 without coaching and record where they
hesitate. User understanding cannot be established by unit tests alone.

## First implementation batch

Implemented on `codex/reader-clarity`: clear landing copy, search-first reader,
shared four-item navigation, an explained tools directory, article orientation,
compact freshness notice and cloud graph-to-article timeline navigation. Existing
article tabs, specialist routes and developer access checks are retained. No
source database, publication data or account permissions were changed.

See [verification](validation/READER_CLARITY_2026-10-16.md). PR #5 was merged at
`1754bf9`; this is now the baseline for the structural foundation migration.
U05 and the remaining U06–U09 work stay open; this is not a claim of complete
product or scientific validation.
