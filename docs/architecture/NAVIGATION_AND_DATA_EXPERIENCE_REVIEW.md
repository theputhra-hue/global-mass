# GMEE Navigation and Data Experience Review

## 1. Branch and Ancestry Verification

- **Feature Branch**: `codex/navigation-data-experience`
- **Base Commit**: `df6940c323335e641e1a3526c65df77f3eced308` (on `codex/project-foundation`)
- **Head Commit**: `3a10d2786208b021adb4123287583ff874523a68`
- **Isolation Guarantee**: Implemented entirely within this isolated branch. No force-pushes, no merges into `main`, no deployments triggered, and no databases or backend code altered.

---

## 2. Executive Summary

This implementation delivers the complete GMEE navigation and data experience redesign contracted under `docs/NAVIGATION_AND_DATA_EXPERIENCE_PLAN.md` and coordinates under Codex architecture.

The confusing legacy navigation (which treated operational tools, developer routes, and reader pages as an ad-hoc set of tabs and changed layouts between screens) has been replaced by:
1. **One Typed Destination/Tool Registry (`src/shared/navigation/registry.ts`)**: 18 canonical routes and 12 advanced tools, encoding legacy synonyms, parameter contracts, descriptions, input/output contracts, and availability categories (`both`, `local-only`, `published-only`).
2. **One Shared Authenticated Shell (`WorkspaceShell.tsx`)**:
   - Persistent desktop sidebar featuring the five primary destinations: **Home**, **Explore data** (Articles, Extracted claims, Recorded connections), **Compare wording**, **My investigations**, and **Advanced tools**, plus an authorized **Developer workspace** badge for approved administrators.
   - Responsive breadcrumb bar reflecting the active route and selected article context.
   - Accessible mobile navigation drawer (breakpoint `< 1024px`) with visible focus management, keyboard Escape handling, and labeled "Menu" button.
3. **Honest Product Discovery Copy**:
   - `index.html` metadata and public landing page accurately state the project purpose: collected news exploration and wording comparison.
   - Visible copy clearly establishes that:
     - An extracted claim is an NLP-identified statement, not a verified fact.
     - A saved assessment represents prior model output from an earlier release run.
     - A recorded relationship indicates textual overlap or comparison signal, never proof of copying or transmission.
   - Dynamic counting from API endpoints (`/dashboard` and `/publications`); zero hardcoded figures (e.g. 7,421 or 5,157).
4. **Home Orientation (`HomeOrientation.tsx`)**: Replaces the former infrastructure-metrics wall with a real collection summary, 3 guided reading actions, and a "What these records mean" taxonomy.
5. **Runtime-Aware Claims Workspace (`#/dashboard/claims`)**:
   - Published cloud mode: Global search querying `/corpus/claims?q=...` with query/page preservation.
   - Local mode: Bounded article selector with recorded article claims (acknowledging the local API's article-scoped capability).
   - Compatibility: Preserves `#/dashboard/check` for local explicit checking.
6. **Grouped 9 Article Detail Sections**:
   - **Source**: Overview, Article
   - **Analysis**: Claims, Evidence, Changes
   - **Context**: Related coverage, Timeline, Graph
   - **Methods**: Data & methods
   - Preserves title, domain, original link, publication date, claim selection, and "Back to results" state.
7. **Complete 12-Tool Advanced Directory & Availability Notices**:
   - Grouped by task: *Read & explore*, *Compare & keep research notes*, *Local system & research tools*.
   - Includes legacy synonyms (`FactCheck`, `Project Lab`, `Overview Vitals`, `Neo4j Graph Engine`, `Redis Queue`, `Masala Lab`, `Eval Lab`).
   - Deep-linking a local tool in cloud mode displays `ToolAvailabilityNotice` explaining the tool's runtime requirements and providing active cloud alternatives without crashing.

---

## 3. Route Migration & Synonym Table

| Destination | Canonical Route | Legacy Synonyms / Hash | Primary Group | Availability | Description & Purpose |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Home** | `#/dashboard` | `#/dashboard/home` | Primary | Both | Workspace orientation, real collection counts, and guided tasks. |
| **Articles** | `#/dashboard/browse` | `#/dashboard/corpus`, `#/dashboard?q=...` | Explore data | Both | Search articles by title/author with domain filter and bounded pagination. |
| **Extracted claims** | `#/dashboard/claims` | — | Explore data | Both | Browse NLP-extracted claims (global in cloud, article-bounded in local). |
| **Recorded connections**| `#/dashboard/fullgraph` | `#/dashboard/graph` (synonym) | Explore data | Both | Article and claim relationship graph with zero-link fallback. |
| **Compare wording** | `#/dashboard/compare` | `#/dashboard/diff` | Primary | Both | Side-by-side textual mutation comparator for supplied passages. |
| **My investigations** | `#/dashboard/casebook` | `#/dashboard/cases`, `#/dashboard/notebook` | Primary | Both | Private local casebook for saved investigations, comparisons, and notes. |
| **Advanced tools** | `#/dashboard/tools` | `#/dashboard/directory`, `#/dashboard/advanced` | Primary | Both | Directory of all 12 specialized tools grouped by task. |
| **Article detail** | `#/dashboard/articles/:id/:tab` | `#/dashboard/articles/:id` | Specialist | Both | 9 grouped tabs: overview, article, claims, related, evidence, changes, timeline, graph, data. |
| **Saved claim search**| `#/dashboard/check` | — | Explore data | Both | Explicit claim check (local) or saved-claim search (cloud). |
| **Article collection**| `#/dashboard/corpus` | `#/dashboard/articles` | Read & explore | Both | Article search by title or author keywords. |
| **Article vector** | `#/dashboard/vector` | — | Read & explore | Local (cloud fallback) | Semantic text retrieval (local vector similarity). |
| **Analyzer controls** | `#/dashboard/project` | `#/dashboard/lab` | Research | Both | Public Project Lab authored text engineering demonstrations. |
| **System overview** | `#/dashboard/overview`| `#/dashboard/vitals` | System / local | Local only | Operational system readiness and queue vitals. |
| **Neo4j graph** | `#/dashboard/graph` | — | System / local | Local only | Direct database graph inspection. |
| **3D timeline** | `#/dashboard/timeline`| — | System / local | Local only | 3D timeline tunnel visualization. |
| **Queue / cache** | `#/dashboard/cache` | — | System / local | Local only | Redis queue depth and operational cache telemetry. |
| **Masala lab** | `#/dashboard/masala` | — | System / local | Local only | Experimental publication timing and wording cluster lab. |
| **Eval lab** | `#/dashboard/eval` | — | System / local | Local only | Research evaluation benchmark annotation tool. |
| **Developer workspace**| `#/dashboard/developer`| `#/dashboard/upload` | Admin | Both | Publication release review, local run/export, and cloud publish. |

---

## 4. Capability Matrix: Local Analysis vs Published Cloud

| Feature / Tool | Published Cloud Mode (`mode: 'published'`) | Local Workspace Mode (`mode: 'local'`) | Handling in Alternate Runtime |
| :--- | :--- | :--- | :--- |
| **Articles Search** | Supported (`/corpus?q=...`) | Supported (`/corpus?q=...`) | Universal |
| **Claims Discovery** | Global search (`/corpus/claims?q=...`) | Article selector + article claims | Graceful UI mode switch in `ClaimsWorkspace` |
| **Article Detail (9 tabs)**| Supported (stored analysis) | Supported (live local DB) | Absent text/evidence explained honestly |
| **Wording Comparison**| Supported (client-side text diff) | Supported (client + local analyzer) | Universal |
| **My Investigations** | Supported (identity-bound private store)| Supported (identity-bound store) | Universal |
| **Project Lab Controls**| Authored demonstrations only | Authored demonstrations only | Universal |
| **System Overview Vitals**| Local only | Supported (`/health/ready`, `/dashboard`) | Cloud displays `ToolAvailabilityNotice` with status |
| **Neo4j Database Graph**| Local only | Supported (Neo4j driver connection) | Cloud displays `ToolAvailabilityNotice` with graph alternatives |
| **3D Timeline Tunnel** | Local only (WebGL/Canvas) | Supported | Cloud redirects to Article detail publication timeline |
| **Cache & Queue Vitals**| Local only | Supported (`/api/v1/cache`) | Cloud displays `ToolAvailabilityNotice` with release metadata |
| **Masala Arcade Lab** | Local only | Supported (local lab loop) | Cloud displays `ToolAvailabilityNotice` with compare link |
| **Eval Lab Annotation** | Local only | Supported (admin/researcher) | Cloud displays `ToolAvailabilityNotice` with research notes link |
| **Developer Staged Release**| Cloud review & publish | Local run, review, and export | Role-gated via backend `user.role === 'admin'` |

---

## 5. Verification Results

### A. Architecture Guard Checks
```
> gmee-frontend@0.0.0 check:architecture
> node scripts/architecture.mjs

PASS architecture: 87 source files; no reversed dependencies, direct-fetch bypasses or runtime cycles

> gmee-frontend@0.0.0 test:architecture
> node --test scripts/architecture.test.mjs

# tests 3
# pass 3
# fail 0
```

### B. ESLint
```
> gmee-frontend@0.0.0 lint
> eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0

(0 errors, 0 warnings)
```

### C. TypeScript and Production Build
```
> gmee-frontend@0.0.0 build
> tsc -b && vite build

vite v6.4.4 building for production...
transforming...
✓ 1624 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   2.25 kB │ gzip:   0.90 kB
dist/assets/index-UFiVAZU6.css   64.89 kB │ gzip:  11.39 kB
dist/assets/index-CIxT5pNG.js   562.79 kB │ gzip: 157.97 kB
✓ built in 2.06s
```

### D. Automated Test Suite & Coverage Thresholds
Enforced CI thresholds: Statements ≥ 60%, Branches ≥ 50%, Functions ≥ 60%, Lines ≥ 60%.

```
Test Files  35 passed (35)
Tests       226 passed (226)

% Coverage report from v8:
-------------------|---------|----------|---------|---------|
File               | % Stmts | % Branch | % Funcs | % Lines |
-------------------|---------|----------|---------|---------|
All files          |   84.65 |     75.6 |   76.52 |   87.94 |
-------------------|---------|----------|---------|---------|

Thresholds achieved:
- Statements: 84.65% (exceeds 60% requirement)
- Branches:   75.60% (exceeds 50% requirement)
- Functions:  76.52% (exceeds 60% requirement)
- Lines:      87.94% (exceeds 60% requirement)
```

---

## 6. Real-Browser Verification Evidence

Visual browser verification was executed using the browser subagent across three responsive viewports on `http://127.0.0.1:4173`:

1. **Desktop (1440x900px)**:
   - Landing page correctly displays honest research copy and 3-step reading process.
   - Authenticated shared shell renders persistent sidebar with 5 primary destinations and Developer badge for admin.
   - Breadcrumb navigation displays current hierarchy.
   - Home orientation renders real dynamic collection summary cards (`120` articles, `450` claims, `0` relationships), 3 next actions, and taxonomy definitions.
   - Articles search (`#/dashboard/browse`) renders title/author search form, source links, and bounded pagination.
   - Extracted claims workspace (`#/dashboard/claims`) renders search and claim inspection.
   - Advanced tools directory (`#/dashboard/tools`) catalogs all 12 tools grouped by task with legacy synonyms.
2. **Tablet (1024x768px)**:
   - Sidebar and main content scale cleanly without clipping or broken card grids.
3. **Mobile (390x844px)**:
   - Desktop sidebar collapses cleanly into sticky mobile header with section label and "Menu" button.
   - Opening the mobile drawer displays all destinations with high contrast.
   - Pressing `Escape` or clicking close dismisses the drawer and restores focus to the "Menu" button.
   - Zero horizontal overflow or clipped text.

Session recordings and screenshot artifacts:
- `landing_page_1792185421380.png`
- `dashboard_view_1792186121616.png`
- `navigation_ux_demo_1792185404926.webp`
- `gmee_full_ux_tour_1792185753791.webp`

---

## 7. Explicit Record of Unsupported Capabilities

The following capabilities are deliberately recorded as unsupported and kept outside this frontend assignment:
1. **Live Unrestricted Web Fact Checking**: The application searches and inspects collected news records; it does not issue live queries to external search engines or verify current events.
2. **Arbitrary ML Model Inference in Cloud Runtime**: Cloud mode strictly serves stored analyses from reviewed publication releases. Model execution runs solely on local analysis workstations.
3. **Global Claim Search in Local Mode**: The local API does not implement full-corpus claim search; local mode provides bounded article selection with article-level claim inspection.
4. **Direct Production Database Administration**: Role permissions govern access to review and staging; direct SQL/Neo4j mutation is not exposed in the client.
5. **Fabricated Relationship Edges**: Zero saved relationships in a release are reported honestly with alternatives, rather than synthesizing artificial links.
