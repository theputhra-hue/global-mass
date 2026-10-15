# GMEE major-project and publication review

Review date: 15 October 2026. Scope: source inspection, defect repair, offline
tests, real pretrained inference, disposable PostgreSQL validation and local
application checks. This report evaluates the inspected implementation; it is
not a university assessment or a prediction of paper acceptance.

## Assessment

This **8.5/10 baseline assessment predates the guided Project Lab, private
Casebook, native full type check and completed Tailwind 4 migration**. The
[upgrade strategy and implemented acceptance criteria](MAJOR_PROJECT_UPGRADE.md)
and [current verification](VERIFICATION.md) supersede the corresponding tooling
and workflow limitations below. The independent-data/publication limitations
remain. A university's final grade cannot be guaranteed by software changes.

**B.Tech major project: 8.5/10.** GMEE has substantial engineering depth and a
coherent demonstration: collect articles, extract claims, retrieve related
coverage, inspect typed changes, explore candidate relationships and obtain
human review. The main deductions concern unvalidated scientific accuracy,
research novelty, operational complexity and incomplete empirical evaluation.

| Criterion | Score | Basis |
|---|---:|---|
| Problem definition and practical relevance | 14/15 | Useful analyst workflow; truth and propagation claims must stay bounded |
| Architecture and implementation depth | 23/25 | Async API, migrations, vector retrieval, graph projection, durable work and role controls |
| NLP and analytical implementation | 15/20 | Working pretrained components and inspectable rules; task accuracy/generalization remain unmeasured |
| User workflow and explainability | 13/15 | Corpus, timeline, evidence, typed spans and annotation; complex UI needs usability evidence |
| Testing and reproducibility | 13/15 | Extensive automated checks and frozen experiment tools; engineering tests do not measure real-world accuracy |
| Original research contribution | 7/10 | Focused quantity/context-aware change-triage hypothesis; empirical novelty remains to be demonstrated |
| **Total** | **85/100** | Subjective rubric for a B.Tech major project |

**Publication verdict: promising research platform, not ready for an empirical
paper submission on the evidence currently available.** A working application,
large corpus, attractive graph or passing tests does not establish a new
scientific contribution. Historical automatic-label results cannot substitute
for independent human gold.

## Strengths

1. **A complete data path.** Ingestion, preprocessing, extraction, embeddings,
   similarity, typed mutation, graph projection, evidence and review form a
   demonstrable system rather than disconnected notebooks.
2. **Suitable storage choices.** PostgreSQL remains authoritative, pgvector
   supports similarity retrieval and Neo4j exposes relationships. Migrations
   define indexes and constraints, while graph reconciliation addresses mirror
   recovery.
3. **Inspectable analytical output.** Original-text spans, normalized quantities,
   timestamps, source identities and passage provenance let an analyst inspect
   the basis of an output. Missing evidence and model abstention are represented.
4. **Accessible local inference.** MPNet, FLAN-T5 and DeBERTa enable core work
   without paid provider keys. Actual pretrained inference is tested separately
   from mocked unit behavior.
5. **Research integrity mechanisms.** Blinded authenticated annotation, dissent,
   versioned rubrics, split/leakage checks, immutable exports, source hashes and
   grouped uncertainty provide a useful starting point for a reproducible study.
6. **Operational discipline.** Role-gated pipeline controls, expiring work leases,
   refresh-token rotation, rate limits, private datastore networks and isolated
   smoke fixtures are strong material for a major-project viva.

## Defects addressed in this review

| Finding | Consequence | Implemented response |
|---|---|---|
| Mutation-chain cache ignored request parameters | One request could receive another limit/minimum-version result | Parameter-specific bounded cache and validated query bounds |
| Session and refresh races | An older response could replace or clear a newer account session | Session-aware request, refresh and account-operation guards |
| Account changes retained protected UI work | Late results or an old annotation retry could cross an account boundary | Account-scoped queries and annotation state; stale results are rejected |
| Nested dialogs shared keyboard and scroll ownership | Escape/focus restoration could affect the wrong dialog | Top-dialog keyboard handling and coordinated focus/scroll ownership |
| Pagination and polling edge cases | Last-page controls and paused operations behaved incorrectly | Correct page boundaries and pause-aware polling |
| Story topology repeated article nodes and omitted hub links | A rendered graph could misrepresent article identity and links | Identity/edge deduplication and shared-neighbor/hub regressions |
| Graph tool linked to a hardcoded local Neo4j port | The link failed outside a host-local developer setup | Navigation to the application's corpus graph |
| Landing text overstated truth and causal propagation | UI implied evidence the method cannot establish | Corpus-comparison wording consistent with analytical limits |
| Login throttling and token contract weaknesses | Concurrent attempts and malformed tokens escaped intended checks | Atomic throttling, required JWT claims and authentication regressions |
| Alert ingestion counts used publication time | Newly collected old articles were counted incorrectly | Bounded collection-time queries |
| Alert evaluation/acknowledgement used competing writes | Concurrent requests could conflict or replace the first acknowledgement | Atomic upsert/acknowledgement and a real PostgreSQL concurrency regression |
| Research reports omitted abstention/span/context evaluation | Exported gold was not reflected in the claimed analysis | Separate selective, exact-span, typed-character and context reporting |
| Build-tool advisories and network-wide dev binding | Development mode exposed avoidable attack surface | Patched compatible tooling and loopback dev-server default |
| Recovery files and raw exports lacked root exclusions | Private backups or corpus data could enter a future repository/image context | Ignore rules and backend build-context exclusion |

See the automated verification record in [Verification](VERIFICATION.md) and
the current [validation artifacts](validation/2026-10-15/).

## Scientific and architectural limitations that remain

- **Similarity does not establish truth or transmission.** Candidate graph links
  are inferred relationships. The system does not observe who copied whom.
  Corroboration inside a corpus may reflect copied false reporting.
- **Rules have semantic limits.** Quantity, entity, polarity, hedging and wording
  changes can also reflect legitimate updates. The conservative context baseline
  cannot establish incompatible assertions or unrelated events from text cues
  alone; the new evaluator exposes those errors.
- **No new independently validated accuracy result is claimed.** Existing
  engineering fixtures and automatic labels cannot establish natural-news
  performance, calibration, fairness or publication-worthy improvement.
- **English-oriented defaults limit the “global” interpretation.** Multilingual
  performance needs appropriate data, models and re-embedding. Matching vector
  dimensions do not make different model spaces compatible.
- **Three stores plus multiple models increase deployment cost.** A single API
  worker simplifies model memory but limits scaling. Capacity, concurrency,
  cold-start costs and analyst usefulness need measured studies.
- **Coverage is bounded by collected data.** RSS/provider availability, licenses,
  source selection, syndication and incomplete candidate retrieval affect the
  task. Missing corpus evidence is not evidence that a claim is false.
- **Engineering checks have scope.** Unit tests, inference smoke and a disposable
  restore do not certify public production security, comprehensive accessibility,
  disaster recovery of the real corpus or flawless operation under every input.
- **Build dependency finding resolved in the upgrade.** The Tailwind 4/PostCSS
  migration removes the affected `braces` chain. Both full-tree and production
  npm audits now report zero findings; see
  [the security review](../frontend/SECURITY_REVIEW.md). Advisory checks do not
  certify the absence of application vulnerabilities.
- **Final live verification is blocked by Docker Desktop/WSL startup.** Rebuilt
  images exist, but production smoke and app replacement remain pending. The
  [current verification record](VERIFICATION.md) distinguishes completed checks
  from these outstanding environment gates.
- **The supplied directory has no Git repository.** Research manifests hash
  sources, but a public reproducibility release still needs a versioned source
  snapshot, permitted data and a tagged environment.

## Positioning against published work

Claim editing and embedding robustness are already evaluated in
[When Claims Evolve (ACL Findings 2025)](https://aclanthology.org/2025.findings-acl.1150/).
Numerical and temporal verification also have dedicated evidence-grounded tasks,
including [TSVer (EMNLP 2025)](https://aclanthology.org/2025.emnlp-main.1519/).
Consequently, integrating embeddings, NLI and a graph dashboard does not by
itself demonstrate novelty. This is an inference from their task overlap with
GMEE, not an assertion that their methods or datasets are identical.

The defensible candidate is **quantity- and context-aware triage of naturally
changing news claims**: do explicit quantity normalization and inspectable
context cues reduce false mutation alarms on equivalent units, paraphrases and
legitimate updates, while retaining useful coverage on unseen events?

The [literature matrix and protocol](RESEARCH.md) distinguish close comparisons,
adjacent tasks, implemented baselines and planned methods. A broader literature
review remains necessary before claiming a new method or resource.

## Research-enabling features implemented

- Calibrated log loss with explicit finite clipping, separate from raw cosine.
- Development-selected abstention with frozen test application, confidence-tie
  handling, risk/coverage points, AURC and an explicit abstain-all outcome.
- Exact typed span and typed character-union metrics using original Unicode
  offsets, separate annotation coverage and inspectable per-pair errors.
- Independent context-relation support, confusion, accuracy and macro F1.
- Per-pair JSON/CSV, Markdown reports, risk/coverage plots, fitted states and
  hashed manifests, alongside existing leakage checks and grouped comparisons.
- Tests for missing gold, empty annotations, overlap, ties, invalid probabilities,
  no gold-driven predictions and untouched test selection boundaries.

These additions supply measurement tools. They do not create independent labels,
guarantee selective error bounds or demonstrate empirical superiority.

## Work required for a credible submission

1. **Freeze one research question and contribution.** Prefer the focused
   claim-change study above. Specify success/failure criteria and register the
   analysis decisions before examining held-out results.
2. **Collect a permitted natural-news benchmark.** Use genuinely independent
   annotators, context, source times, exact changed spans, update/correction
   cases, hard negatives and unresolved examples. Pilot the rubric, measure
   agreement and adjudicate disagreements without discarding dissent.
3. **Freeze event/component-disjoint train/dev/test partitions.** Keep source,
   duplicate and temporal leakage visible. Preserve text/data/model revisions,
   rights, sampling inclusion probabilities and annotation history. Choose sample
   sizes from pilot uncertainty or power analysis rather than a magic pair count.
4. **Run matched baselines and ablations.** Compare lexical and embedding
   retrieval, calibrated pair models, a suitable NLI/cross-encoder baseline and
   the relevant prior claim-editing approach. Remove quantity/context/provenance
   components separately. Models absent from the current harness need actual
   implementation and comparable tuning budgets before claims about them.
5. **Report held-out evidence.** Include support, per-class/type/span/context
   results, grouped confidence intervals, paired comparisons, calibration,
   selective risk and coverage, runtime/memory and systematic failure analysis.
   Evaluate retrieval/stance separately if making fact-verification claims.
6. **Release a reconstructable artifact.** Supply permitted data or acquisition
   instructions, versioned source, frozen manifests, exact commands, predictions,
   fitted states and honest negative findings. Select a venue after those results
   reveal whether the contribution is a method, benchmark, applied study or demo.

The independent annotation and empirical study require real judgments and
observations. They cannot honestly be completed by adding software features or
generating synthetic “gold” during an implementation session.
