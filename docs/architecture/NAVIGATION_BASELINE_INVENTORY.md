# GMEE navigation baseline and route inventory

Date: 2026-10-17. Baseline commit: `df6940c323335e641e1a3526c65df77f3eced308` on `codex/project-foundation`.
Working branch: `codex/navigation-data-experience`.
Design contract: `docs/NAVIGATION_AND_DATA_EXPERIENCE_PLAN.md`.

This document records the Work Package N0 inventory of routes, components, runtime behavior, and permissions before implementation of the shared workspace navigation and data experience.

---

## 1. Route inventory

### Primary workspace destinations

| Label | Canonical Hash | Main Question Answered | Group / Mode |
| --- | --- | --- | --- |
| Home | `#/dashboard` | What is here, and what should I do first? | Orientation |
| Explore data: Articles | `#/dashboard/browse` | Which collected articles match title/author keywords? | Explore data (default) |
| Explore data: Extracted claims | `#/dashboard/claims` | What statements were previously extracted? | Explore data (new canonical route) |
| Explore data: Recorded connections | `#/dashboard/fullgraph` | What relationships connect articles and claims? | Explore data |
| Compare wording | `#/dashboard/compare` | What changed between two supplied texts? | Wording analysis |
| My investigations | `#/dashboard/casebook` | Where is my private saved work? | Personal research |
| Advanced tools | `#/dashboard/tools` | Which specialist tool serves my task? | Tool directory |
| Developer workspace | `#/dashboard/developer` | How do we prepare, review and publish a release? | Approved accounts only |

### Article detail workspace

All nine article detail tabs are durable and grouped into four review sections:
`#/dashboard/articles/:id/:tab?claim=:claimId&back=:backUrl&offset=:claimOffset`

| Review Section | Tabs | Purpose |
| --- | --- | --- |
| Read the source | `overview`, `article` | Source metadata, known date, original link, and stored text |
| Inspect analysis | `claims`, `evidence`, `changes` | Extracted statements, recorded assessments, wording comparisons |
| Follow context | `related`, `timeline`, `graph` | Cross-article links, publication chronology, focused network |
| Understand provenance | `methods` | Extraction status, completeness, and limits |

### Compatibility and legacy destinations

| Hash | Resolution | Local Behavior | Cloud (Published) Behavior |
| --- | --- | --- | --- |
| `#/` | Public landing | Purpose, reading steps, explore action | Same; metadata corrected |
| `#/project` | Public Project Lab | Authored comparison demos | Same |
| `#/signin` | Sign in | Authentication with safe `?next=...` return | Same |
| `#/dashboard?q=...` | Legacy search | Normalize to `#/dashboard/browse?q=...` | Same without page reload |
| `#/dashboard/check` | Compatibility claim check | Local explicit claim checking | Published saved-claim search |
| `#/dashboard/corpus` | Legacy corpus | Local corpus controls | Canonical alias to `browse` |
| `#/dashboard/vector` | Legacy vector | Local semantic retrieval | Literal article search with honest scope |
| `#/dashboard/factcheck` | Legacy factcheck | Explicit local claim check | Saved-claim search |
| `#/dashboard/timeline` | Legacy timeline | Local 3D timeline visualization | Named availability notice + article link |
| `#/dashboard/masala` | Legacy Masala lab | Experimental analysis lab | Named availability notice |
| `#/dashboard/eval` | Legacy Eval lab | Local annotation with backend auth | Named availability notice |
| `#/dashboard/overview` | Legacy overview | Local service vitals and metrics | Named availability notice |
| `#/dashboard/graph` | Legacy Neo4j graph | Local database inspection | Named availability notice |
| `#/dashboard/cache` | Legacy Redis cache | Local queue and Redis status | Named availability notice |
| `#/dashboard/upload` | Developer upload | Local export staging | Staging / review / publication workflow |

---

## 2. Capability and runtime matrix

| Capability / Concern | Published Cloud Workspace | Local Analysis Workspace |
| --- | --- | --- |
| Article Discovery | Literal title/author search (`/api/v1/corpus/articles`) | Literal title/author search (`/api/v1/corpus/articles`) |
| Semantic Retrieval | Not available (pgvector is local-only) | Available via local pgvector embeddings |
| Claim Discovery | Saved-claim search (`/api/v1/claims/search`) | Article-level claim reading (`/api/v1/articles/{id}/claims`) |
| Explicit Claim Check | Not available (cloud serves completed results) | Available via local AI checking (`/api/v1/factcheck`) |
| Relationship Graph | Bounded projection (`/api/v1/graph`) | Local Neo4j projection / relational graph |
| AI Inference / Pipeline | Not executed (no local models) | Explicit authorized pipeline runs (`/api/v1/developer/run`) |
| Developer Actions | Upload publication JSON, review, publish | Gather, preprocess, NLP extraction, evolution, export |
| Annotation / Eval | Not supported | Local annotation with research/admin checks |

---

## 3. Permission model

1. **Public / Unauthenticated**:
   - Access to Landing (`#/`), Public Project Lab (`#/project`), Sign In (`#/signin`).
   - Deep links to any `#/dashboard/*` route redirect safely to `#/signin?next=<encoded-target>`.
2. **Authenticated Reader**:
   - Access to Home, Explore data (Articles, Claims, Connections), Compare wording, My investigations, Advanced tools.
   - Access to Article workspace (all 9 tabs).
   - Saved investigations in Casebook are private to the signed-in user and cleared on logout.
   - Developer workspace is NOT visible in navigation and access to `#/dashboard/developer` or `#/dashboard/upload` is rejected based on server check.
3. **Approved Developer**:
   - Verified via server authorization (`publicationsApi.access()`).
   - Developer workspace entry appears in desktop sidebar and mobile menu.
   - Server enforces `user.is_active && (user.role === 'admin' || user.is_allowlisted)`.
   - Never exposed during loading flash.

---

## 4. Unsupported capabilities (explicitly recorded)

1. **Live Web Fact-Checking**: GMEE operates exclusively on collected corpus articles and pre-extracted statements. It does not browse the live web or fact-check arbitrary breaking news.
2. **Cloud Semantic Search**: Global semantic vector search runs on local pgvector; published cloud mode offers literal title and author matching only.
3. **Local Global Claim Search**: Local backend currently lacks a global claim text search endpoint (only per-article claim reads exist). Local claims UI uses article-level selection and browsing.
4. **Automated Truth Scoring**: Extracted claims, similarity scores, and model assessments are heuristic research signals; they are never displayed as absolute truth or proof of intentional copying.
5. **Backend Full Release Download Endpoint**: A complete-release download endpoint is an existing backlog item and not invented in this frontend assignment.
