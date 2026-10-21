# GMEE independent project and publication assessment

Review date: **21 October 2026 (Asia/Kolkata)**. This is a source, test, live read-only inventory, saved-result, and primary-literature review. It is a subjective academic assessment, not a university grade or prediction of acceptance.

## Verdict

**B.Tech major project: 8.3/10 (83/100).** GMEE demonstrates substantial software engineering and a useful investigation workflow. Its strongest work is the integrated pipeline, operational safeguards, inspectable evidence, and reproducibility preparation. Its weakest areas are independent validation of the actual news task, semantic reliability of the named mutation types, production data provenance, and operational complexity.

**The full GMEE system is not currently supported as a validated misinformation-evolution research paper.** The narrower VitaminC component study contains real, reproducible results and deserves serious advisor/independent review as a focused empirical or reproducibility paper. Its main contribution remains modest, its strongest complementarity result is exploratory, and the draft is not submission-ready. Adding screens or deploying the application will not resolve those scientific issues.

## Scope and evidence boundaries

The canonical source is `E:\global-main\global-mass-integration`, at Git HEAD `aa0056c3e81a012b942c4a1fc9cb278feaa5c3f8` plus an already dirty working tree containing the research work. The sibling `E:\global-main\global-main` is a non-Git copy. The canonical paper handoff explicitly identifies the integration checkout as authoritative. Both were preserved.

The audit used three parallel specialist reviews, with root verification and synthesis. Application source, labels, stored predictions and experiment locks were not changed. No new model fitting, benchmark test inference, live annotation, ingestion, migration, publication or external messaging was performed. Fresh checks used existing installed environments, including the sibling backend interpreter against the canonical source; this was not a clean dependency-installation exercise. The only authored outputs are this assessment and an additive ledger entry.

### Fresh checks

| Check | Observed result | Interpretation |
|---|---|---|
| Backend offline pytest | **644 passed, 17 deselected**, 12 SQLite datetime warnings | Integration and real-model tests excluded; passing fixtures do not establish semantic accuracy |
| Backend Ruff, pinned 0.16.2 | **Failed: one ISC004 finding** at `backend/scripts/export_candidate_manifest.py:167` | Parenthesize the intentionally concatenated string in the list |
| Backend mypy, pinned 2.3.0 | **Failed: 11 errors in one test file** at `backend/tests/test_export_candidate_manifest.py:24,64,66` | Give the heterogeneous fixture an appropriate type and narrow/assert string values before `.encode()` |
| Frontend lint | **Passed** | Current source passes lint |
| Frontend Vitest | **209 passed across 36 files** | Component/unit coverage, not full browser integration |
| Frontend production build | **Passed**, with 511.82 kB minified JS / 146.67 kB gzip bundle warning | Eager route imports increase initial payload |
| Frontend coverage with CI thresholds | **Passed:** 89.25% lines, 76.58% branches, 77.21% functions, 85.22% statements | Entire visual components are excluded, including some logic-bearing graph code |
| Infrastructure safety tests | **25 passed** | Initial missing-PyYAML host issue was resolved by using the existing backend environment |
| Research synthetic tests | **30 passed** in `evaluation/tests` | Tests leakage/statistical/artifact logic; not additional benchmark evidence |
| Local HTTP readiness/dashboard | **Passed** through `127.0.0.1:3000` | PostgreSQL, Neo4j and Redis reachable; readiness does not test every NLP model |
| Saved research predictions | All eight models' AUROC/AP/macro-F1/Brier/log-loss recomputed; maximum discrepancy **1.11e-16** | Verifies reported arithmetic from existing predictions, not new held-out evaluation |
| Review bundle v3 | SHA-256 and all **75 payload digests** verified | Package integrity, not scientific novelty or independent replication |

The pinned-version static failures are current working-tree defects, even though the runtime test suite passes. They should be repaired before claiming all configured backend gates pass. This audit did not rerun Docker integration/model suites, disaster recovery, load testing, browser E2E, or recent remote CI.

Reproduction commands, run from the canonical backend unless stated otherwise:

```powershell
$auditPython = 'E:\global-main\global-main\backend\.venv\Scripts\python.exe'
& $auditPython -m pytest -m 'not integration and not model' --strict-markers -q
& $auditPython -m ruff check app tests scripts
& $auditPython -m mypy app tests scripts
# Canonical repository root:
& $auditPython -m unittest discover -s infra/tests -v
& '.\.local-deployment\research-venv\Scripts\python.exe' -m pytest evaluation/tests -q
# Canonical frontend:
npm run lint
npm test
npm run build
```

### Current live inventory

Read-only inventory at approximately **12:22-12:29 IST, 21 October 2026**:

| Item | Observed value |
|---|---:|
| Articles / extracted claims | 10,879 / 10,254 |
| Claims with embeddings | 10,254 |
| Article NLP completed / pending / failed / skipped | 6,870 / 3,581 / 301 / 127 |
| Articles with neither raw nor cleaned body | 993 |
| NLP-completed articles with neither raw nor cleaned body | **642** |
| Evaluation pairs | 1,271 |
| Label rows: human / legacy | **27 / 3,826** |
| Distinct authenticated human reviewers | **1** |
| Pairs with two distinct reviewer identities | **0** |
| Event/split assignments | All 1,271 `unassigned` / `unassigned` |
| Stored inferred `EVOLVED_FROM` edges | 379, all with stored mutation evidence |
| Stored `SIMILAR_TO` edges | 39,795; 12,458 with mutation evidence |
| Neo4j Claim nodes | 10,218 versus PostgreSQL's 10,254 claims |
| Latest evolution run reported by dashboard | 15 October 2026 |

These are mutable operational counts, not a frozen scientific dataset. The increase from nine to 27 human votes since the earlier ledger does not solve reviewer independence. The graph count difference establishes projection lag, not corruption. The body-completeness counts deserve a quality-status fix: a completed job can have had no text to analyze.

## B.Tech scoring rationale

| Criterion | Score | Basis |
|---|---:|---|
| Problem relevance and definition | 14/15 | Timely, useful analyst problem; actual task needs narrower claims |
| Architecture and engineering | 22/25 | Async API, typed frontend, relational/vector/graph storage, durable processing, auth and migrations |
| Functional and analytical implementation | 16/20 | Integrated working components; mutation semantics and multilingual routing remain limited |
| Analyst workflow and explainability | 13/15 | Evidence, spans, timeline, cases and annotation; context capture and annotation context need repair |
| Verification and reproducibility | 12/15 | Extensive passing tests and strong research artifacts; current static failures and browser/CI gaps |
| Original, validated research contribution | 6/10 | Real narrow experiment, but stronger baselines win and full-system claims remain untested |
| **Total** | **83/100** | **8.3/10** |

This is stronger than a basic CRUD application or a single model notebook in engineering breadth. An excellent viva still depends on the authors explaining design choices, demonstrating a repeatable workflow, and distinguishing their original implementation from integrated libraries. A higher score should come from convincing evidence and resolved defects, not more technology names.

## Pros

1. **A coherent end-to-end workflow.** Collection, normalization/deduplication, claim extraction, embeddings, relationships, evidence inspection, annotation, and private case exports are connected. The project has a meaningful use beyond a classifier output.
2. **Substantial backend safeguards.** Durable ownership uses conditional updates, expiring leases and fencing. PostgreSQL is authoritative and Neo4j is repairable. Relationship uniqueness and earlier-time/different-article guards constrain candidate parents. See `backend/app/services/pipeline/ownership.py:84`, `pipeline/jobs.py:164`, and `evolution/mutation_detector.py:175`.
3. **Evidence retrieval has depth.** Vector and full-text retrieval, time cutoffs, duplicate grouping, original passages, offsets, hashes, source metadata, and explicit NLI abstention exceed a simple cosine demo. See `backend/app/services/verdict/evidence.py:215,557` and `verdict/engine.py:608`.
4. **Security is meaningful for an undergraduate project.** Password hashing, refresh rotation/reuse controls, role-gated operations, session-aware frontend responses, private datastore networks, and bounded requests show implementation discipline. They do not establish public-production security by themselves.
5. **A useful deterministic capability already works.** Explicit quantity normalization correctly treats `1 km` and `1000 m` as equivalent while preserving original spans. This is a sensible component to investigate empirically.
6. **Research honesty and reproducibility are strengths.** The current paper reports stronger models that beat its proposed descriptors, records overlap exclusions, distinguishes exploratory work, and preserves predictions, sources, environments and hashes. Independent saved-prediction arithmetic checks passed.
7. **The frontend has tested workflow details.** Account-scoped caches, immutable case fingerprints, revision-aware review notes, error states, dialogs and keyboard foundations provide useful product maturity.

## Cons and concrete fixes

| Priority | Finding and source evidence | Consequence | Recommended fix |
|---|---|---|---|
| P1 | **Same-URL article revisions are dropped.** `backend/app/services/collection_orchestrator.py:90-100` inserts with URL conflict `DO NOTHING` | A later correction at an existing article URL is never captured as a new version | Store immutable article revisions, observed time, body hash and update metadata; link claims to revision-specific source spans |
| P1 | **Investigation capture omits context.** `frontend/src/components/Casebook.tsx:38-47` keeps only the two texts, whereas `MutationComparator.tsx:49-54` supports times, notes and provenance URL | Saved server recomputation can differ from a richer contextual comparison | Preserve every comparison input and allow direct capture of the reviewed result with its input/result fingerprints |
| P1 | **Annotation lacks the proposed context.** `backend/app/api/v1/eval.py:57-74` and `frontend/src/api/eval.ts:19-20` expose text/domain only | Reviewers cannot reliably judge reporting updates, event identity or provenance from isolated claims | Add a versioned contextual annotation condition with approved source excerpts, timestamps and references, while hiding model scores and other votes; retain insufficient-context labels |
| P1 | **Non-English routing is inconsistent.** `preprocessing_orchestrator.py:159-160` accepts all languages assuming translation, but local `nlp/llm_client.py:266,300` returns original sentences; `entity_extractor.py:29` uses English spaCy | “Global” or multilingual behavior is unvalidated and can silently use incompatible language assumptions | Explicitly scope the current system to supported English inputs, or implement evaluated routing/translation with original-text alignment and versioned translation provenance |
| P1 | **Production model provenance is weaker than research provenance.** `models/claim.py:18-23` lacks extractor/prompt/source-span/embedding-space identities; `nlp/embedding_service.py:53` omits an explicit revision | Existing claims cannot be fully reconstructed by model identity; same-dimensional model swaps may mix incompatible vectors | Persist immutable input hashes, model/revision/config/prompt identifiers and source offsets; reject incompatible embedding spaces and require controlled re-embedding |
| P1 scientific | **Typed names imply more semantics than the rules establish.** `evolution/text_changes.py:380-386` uses capitalization for entities; `:527` derives framing from sequence similarity | Binary predictive gain does not prove accurate entity, polarity, framing or context explanations | Retain these as baselines; obtain independent per-type/span gold and report errors before promoting semantic claims |
| P1 scientific | **Corpus score is a hand-weighted heuristic.** `verdict/engine.py:271,298,456` pools style/entity/support factors | It is not a probability of truth; repeated false reporting can create corpus agreement | Define the actual target, evaluate evidence retrieval and NLI separately, validate calibration on held-out data, and present provenance/abstention before authority-like percentages |
| P1 data quality | **Missing-text jobs can be completed.** `preprocessing_orchestrator.py:156-181`, `nlp_orchestrator.py:137,174`; 642 completed articles currently have no raw or cleaned body | Operational completion can be mistaken for successful analysis | Add missing/insufficient-content outcomes, content-quality gates and explicit full-text versus summary coverage; keep these outside scientific denominators |
| P2 | **Candidate lineage is a heuristic bottleneck.** `mutation_detector.py:165,210,226,292` uses topic groups, bounded cosine neighbors, time window and one chosen parent | Cross-topic/noise/omitted neighbors can be missed; earliest similar text does not prove copying | Measure candidate Recall@K and edge precision separately; evaluate topic/time/K choices and alternatives; preserve inferred-edge terminology |
| P2 | **Current static checks fail** in the new candidate-manifest script/test | The working tree would fail the inspected backend static gates | Fix the one Ruff finding and fixture typing; rerun the pinned checks without changing frozen experimental source |
| P2 | **Research tests are absent from current CI** workflow commands/path filters | Research-only regressions can escape application CI | Run synthetic `evaluation/tests`, artifact-schema/hash checks and provenance checks in a lightweight research CI job |
| P2 | **Browser and performance evidence is incomplete.** `frontend/vite.config.ts:24-61` excludes graph/timeline components; routes load eagerly; deployment smoke is HTTP-only | Unit coverage does not establish real browser/API flows, rendering, accessibility, scale or latency | Add a disposable browser workflow, test graph decision logic separately, lazy-load heavy routes, and measure hardware-specific latency/RAM/throughput |

### Small deterministic probes

These are demonstrations of algorithm boundaries, not a representative benchmark or failed unit tests:

| Pair | Observed analyzer output | Lesson |
|---|---|---|
| `The bridge is 1 km long.` → `The bridge is 1000 m long.` | `EQUIVALENT_QUANTITY`; no meaningful change | Explicit unit equivalence is useful |
| `The bridge is two km long.` → `The bridge is three km long.` | `WORDING_DRIFT`, `TEXTUAL_CHANGE` | Number words are not recognized as numeric drift |
| `Officials confirmed 10 deaths on Monday.` → `Officials confirmed 12 deaths on Tuesday.` | Numeric/entity/wording tags, `CONTEXT_REQUIRED` | A legitimate evolving report requires event context; it is not automatically misinformation |
| `The test was positive.` → `The test was negative.` | `WORDING_DRIFT`, `TEXTUAL_CHANGE` | Semantic opposites are not covered by a negation-word lexicon |
| `The CEO resigned.` → `The chief executive stepped down.` | Entity/framing tags | A plausible paraphrase can acquire substantive-looking tags |

The analyzer discloses these lexical limits. Honest disclaimers are a strength; they do not replace semantic validation.

## Publication assessment

### What the existing results actually establish

The saved VitaminC experiment concerns **binary factual-revision flagging on Wikipedia sentence pairs**, with supplied before/after inputs. It does not measure news extraction, retrieval, cross-outlet lineage, misinformation truth, observed transmission, or multilingual performance.

All results below use the same **30,828 eligible test rows**, after quarantining 220 official rows. AUROC is a ranking metric, not accuracy or percent-correct.

| Model | Verified AUROC | Status |
|---|---:|---|
| Eight lexical features | 0.72250 | Original primary baseline |
| Lexical plus GMEE descriptors, 33 total features | 0.81162 | Original primary augmented model |
| Sparse edit TF-IDF | 0.82049 | Post-primary comparator |
| Released ALBERT checkpoint | **0.91893** | Post-primary reference; original authors' trained state, not matched local retraining |
| Analyzer-summary partition A | 0.75106 | Exploratory |
| Complementary partition B | 0.79705 | Exploratory |
| Sparse text plus lexical C | 0.83168 | Exploratory |
| Sparse text plus full descriptors D | **0.85694** | Exploratory |

The primary gain is **+0.08912 AUROC**, with saved paired page-bootstrap 95% interval **[0.07610, 0.10196]**. The more interesting research lead is D minus C: **+0.02527**, descriptive interval **[0.02132, 0.02924]**. It suggests complementary information beyond the tested sparse-plus-lexical recipe. That follow-up was designed after earlier test outcomes were known; it remains exploratory regardless of interval width. The original 33-feature method loses to simple sparse text, and the best combined variant remains below ALBERT.

The manuscript already acknowledges these issues (`paper/manuscript.md:12,68,89-126`). Its same-team reconstruction's 1,491 checks measure computational agreement, not correct classifications or independent scientific replication. This audit verified saved arithmetic and package integrity without refitting or rescoring the benchmark.

### Closest prior work and the novelty boundary

| Primary source | Already covered | Implication for GMEE |
|---|---|---|
| [VitaminC, NAACL 2021](https://aclanthology.org/2021.naacl-main.52/) | Factual revision flagging, subtle contrastive changes, rationales and learned baselines | The current component task is established; contribution must be a new empirical lesson or useful method tradeoff |
| [ClaimDiff, ACL Findings 2023](https://aclanthology.org/2023.findings-acl.289/) | Directional claim comparison and human rationales in news | Comparing nuanced claims and explaining spans are not novel by themselves; its labels are not GMEE gold |
| [NewsEdits 2.0](https://arxiv.org/abs/2411.18811) | Human edit-intention taxonomy separating factual, stylistic and narrative news revisions | Legitimate updates versus surface edits are an existing research problem; verify exact benchmark access and label fit before evaluation |
| [When Claims Evolve, ACL Findings 2025](https://aclanthology.org/2025.findings-acl.1150/) | Embedding retrieval robustness to edited misinformation | An embedding-based evolving-claim application alone is insufficient novelty; evaluate first-stage retrieval separately |
| [Making Revisions Understandable, ACL Findings 2026](https://aclanthology.org/2026.findings-acl.1747/) | Survey of revision datasets, intentions and methods | Position any typed-diff contribution within the established revision literature |
| [ClaimFlow, 2026 preprint, v2](https://arxiv.org/abs/2603.16073) | Human scientific-claim relations and evolution across papers | Claim graphs/evolution also exist outside news; distinguish domains and observed citation relations from inferred news edges |
| [Beyond Static Artifacts, ACL 2026](https://aclanthology.org/2026.acl-long.1548/) | Socially generative claim-evolution simulation | A simulation feature alone is not a new research contribution; synthetic propagation is separate from observed spread |

This is a targeted literature comparison, not an exhaustive systematic review. The assessment of novelty is an inference from these primary works and the inspected implementation.

### Two viable paper routes

**Route A: focused component/empirical reproducibility paper — closest to available evidence.** Retain the honest scope and all stronger comparators. Explain the scientific lesson beyond beating elementary lexical summaries. Obtain independent critical review, resolve author verification/declarations and artifact rights, and adapt to a real venue's current requirements. A suitable short empirical, replication-oriented or workshop route may fit, subject to contribution and review. External confirmation is the strongest next experiment if pursuing the complementarity claim; it is not a universal requirement for honestly reporting a narrowly framed replication/negative-result study.

**Route B: full natural-news claim-change paper — substantially more work.** Build the missing independent benchmark and evaluate the actual application task. Existing authenticated annotation, type/span fields and experiment infrastructure can be extended; they do not need to be reinvented. The corpus, automatic labels and case-review status are not substitutes for independent gold.

Neither route currently supports a state-of-the-art, truth-oracle, causal-propagation or universally multilingual claim. Acceptance cannot be inferred from project complexity or passing tests.

## Ordered plan to strengthen publication readiness

1. **Freeze one question and primary contrast.** A defensible candidate is: “Do quantity-, time- and provenance-aware change descriptors reduce false alarms on paraphrases and legitimate updates, at a predeclared recall/coverage, on unseen news events?” This is a hypothesis, not a result. Specify target population, candidate universe, practically relevant effect, uncertainty unit, stopping rule and exclusions before final labels are inspected.
2. **Fix traceability before collecting contextual gold.** Preserve article revisions and full comparison inputs; capture extractor/embedding/translation identities and source spans. Supply versioned evidence context to reviewers while keeping scores and other judgments hidden. Distinguish reporting time, observation time and claim event time.
3. **Obtain the right independent labels.** For full GMEE, pilot a rubric with at least two distinct human judgments per eligible pair, then record agreement, disagreements, adjudication and unresolved cases. Label relatedness, type, exact spans and context separately. Determine scale from event/class support and uncertainty/power needs; no arbitrary pair count guarantees quality. Existing 27 votes are a start, not consensus. For the narrow VitaminC report, new local annotators are not a prerequisite.
4. **Freeze leakage-resistant data.** Curate stable event IDs and syndicated/canonical-text groups independently of machine topics. Partition by event/history/duplicate groups, retain immutable manifests and rights records, and select thresholds only on development data. Do not reuse the exposed VitaminC test to claim new confirmation.
5. **Compare strong methods fairly.** On identical eligible inputs and candidate universes, include pure untyped diff, sparse edit text, fixed embeddings and an appropriate supervised/cross-encoder reference. Implement actual quantity/time/provenance ablations. The current analyzer-summary partition is not a pure untyped comparator. Preserve old results and record negative findings.
6. **Measure the promised benefit.** Use legitimate-update/paraphrase false-alarm rate at a fixed dev-selected recall or coverage as a possible primary endpoint. Add type macro-F1, exact/overlap span scores, contextual errors, calibration and selective risk where gold supports them. If evaluating the pipeline, separate extraction quality, retrieval Recall@K, NLI and edge precision. Use paired event/history-group uncertainty and report class/event support.
7. **Validate the proposed improvements.** Prioritize number words/date and unit interpretation, negation/quotation scope, entity aliases and roles, contextual correction handling, and evidence-linked abstention according to measured errors. Treat these as candidate fixes; implementing them alone is not evidence of research value. Restrict language claims or measure each supported language separately.
8. **Demonstrate practical value if claiming it.** Measure same-hardware cold/warm latency, peak RAM, throughput and quality against cheaper sparse and stronger encoder baselines. For an analyst-tool paper, run an ethically prepared user task study measuring decision quality, time and false confidence. A lower AUROC can still be useful if a meaningful efficiency or workflow advantage is measured.
9. **Finish reproducibility and submission review.** Repair current lint/type failures; include synthetic research tests in CI; review and version the dirty research sources; obtain an independent human critique/reproduction where feasible; finalize attribution/rights, author accountability and disclosures; then select and verify venue-specific rules. Keep external publication/submission separate from local preparation.

For a B.Tech demonstration, also add a repeatable fixture-backed browser path through sign-in, search, article inspection, comparison, saved investigation and export; show healthy, missing-evidence and service-failure behavior. This improves demonstrability but does not establish research novelty.

**Recommended allocation of the next work:** prioritize independent evaluation and traceability, then address measured semantic errors. Additional animations, dashboards, cloud hosting, generic chatbots, or new model names have low expected value for the paper unless a specific research hypothesis requires them.
