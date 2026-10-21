# GMEE Research Protocol

**Results status: UNPERFORMED.** This is a protocol and contribution outline,
not a paper reporting completed experiments. Working endpoints, deterministic
fixtures, passing unit tests and pipeline throughput are engineering evidence;
they do not establish scientific novelty, improved accuracy or factual truth.
Historical `backend/eval_publication_report.md` is retained as **exploratory**,
not independent human-held-out validation. See [Evaluation](EVALUATION.md),
[Dataset](DATASET.md) and [Audit](AUDIT.md).

## Candidate contribution and scope

The research question is whether **typed, inspectable textual mutation evidence**
combined with **calibrated claim relatedness** improves analysis of reporting
changes over similarity-only retrieval, under independently annotated, frozen
cross-event evaluation. Potential contributions are:

1. A reproducible typed-change task (numeric drift, entity substitution,
   hedging/polarity/framing/wording changes and a no-change control), with changed
   spans and temporal provenance rather than an unlabeled cosine edge.
2. A claim-matching model evaluated and calibrated on authenticated human labels,
   including abstention/coverage instead of treating cosine as probability.
3. An auditable corpus-local evidence view: citations and passage-level stance,
   source/syndication grouping, explicit missing-coverage and model warnings.
4. An artifact protocol tying labels, event identity, frozen splits, method/model
   revisions, licensing and error analyses to a content-addressed snapshot.

These are **candidate contributions**; novelty requires a literature comparison
and experiments. Typed changes may reflect legitimate updates, corrections or
paraphrases, not misinformation. `EVOLVED_FROM` is inferred candidate lineage,
not observed copying, influence or a causal diffusion mechanism. Local evidence
agreement is not external fact verification. Calibrated **relatedness** is not a
probability that a claim is true, and no live verdict score is promoted to a
calibrated posterior merely because a calibration harness exists.

## Tasks must remain separate

| Task | Human target | What must not be substituted |
|------|--------------|-----------------------------|
| Relatedness | `SAME_STORY` / `EVOLVED` / `DISTINCT`, with a binary relatedness view reported separately | A cosine bucket or automatic label |
| Typed mutation | Independent multi-label change types + span evidence, orientation recorded | Binary relatedness success, high cosine or a word diff alone |
| Evidence stance | Supports / contradicts / neutral / unavailable for a cited passage | Outlet reputation, stylistic hedges or missing retrieval as contradiction |
| Selective claim matching | Correctness conditional on coverage / abstention | Calibration of factual truth or absence of evidence as falsehood |
| Propagation | External observation/attribution data, if ever collected | Publication order, graph adjacency or a simulation |

Do not conflate SAME_STORY and EVOLVED to claim mutation-detection accuracy.
Report binary retrieval and three-way labeling separately. Independent reporting
must not be inferred solely from different domains; syndication/canonical
content needs grouping and documented residual dependence.

## Predeclared hypotheses (not findings)

| ID | Hypothesis | Planned test / failure interpretation |
|----|------------|--------------------------------------|
| H1 | Typed checks add useful mutation discrimination beyond cosine | Held-out per-type/macro F1 and span error analysis against text/similarity baselines; null result is reportable |
| H2 | Learned calibration improves relatedness reliability | Dev-selected method evaluated once on untouched test using Brier, log loss and disclosed-bin ECE/reliability plots; no claim of truth calibration |
| H3 | Dedup/event constraints reduce false links and evidence inflation | Compare canonical/event-aware and unconstrained variants under identical data/splits; report errors on syndicated and temporally incompatible pairs |
| H4 | Abstention exposes rather than hides missing corpus coverage | Risk–coverage / precision–coverage curves and unavailable-model cases; no promised target coverage |
| H5 | Effects generalize beyond familiar events/outlets | Event-disjoint and chronological held-out evaluation, plus an optional predeclared source-held-out stress test |

Choose primary endpoints, uncertainty procedure, operating thresholds, stopping
rule and smallest practically relevant effect **before** examining test labels.
Sample-size planning depends on event dependence, class/type support and desired
precision/power, not a magic minimum label count. Hypotheses may fail; report all
registered comparisons and limitations rather than selectively advertising wins.

## Baselines and ablations

Use the same immutable records, train/dev/test identity and compute budget for
all methods; record tokenizer and model revisions. Planned baseline families:

- Majority/label-prior and simple random/constant-score controls.
- Token overlap and word/character TF-IDF cosine; fit vocabulary/IDF on train.
- BM25 retrieval with train-derived index/parameters where the retrieval task
  and candidate universe are explicitly defined.
- Frozen all-mpnet-base-v2 cosine with a dev-selected threshold (raw similarity,
  not probability); consider an independent off-the-shelf NLI/stance baseline.
- A simple supervised relatedness model using predeclared text/entity/time
  features, plus train-fitted probability calibration selected on dev.
- A transparent typed text-change analyzer versus similarity-only and untyped
  diff controls, scored only where independently annotated mutation gold exists.

Planned ablations remove one factor at a time: numeric/entity typing,
hedging/polarity/framing rules, timestamps/parent eligibility, canonical/source
independence grouping, stance, calibration and abstention. Compare a
similarity-only model to one using typed features without using test gold or
sampling buckets as predictive labels. Report each feature's provenance and
which implementations actually ran; a documented baseline is not a result.

Any pretrained model or API may have contamination from public news training
corpora. Record known training/data overlap limits, unknowns and provider model
versions. Optional provider evaluation requires an explicit cost/privacy budget.
No browser dependency or remote research service is required by this protocol.

## Human annotation and automatic diagnostics

- Authenticated `/eval/next` serves blinded claim text/outlets only; no score,
  bucket, verdict, predicted type or model stance. The server assigns the
  annotator ID; a client handle is not provenance.
- Two or more distinct authenticated humans must independently review eligible
  pairs under a written rubric. Current conservative consensus requires all
  current human labels to agree; disagreement remains unresolved until a
  documented independent adjudication protocol exists. Agreement is descriptive,
  not proof of independence or correct labels.
- Mutation annotations require their own agreed type/spans protocol; do not
  derive mutation gold from the system being evaluated. Record missing type
  annotations separately from an explicitly empty type list.
- Preserve revisions, notes and provenance; distinguish `human`, `automatic`,
  `legacy`, `test`. Historical handle-only votes remain legacy, not silently
  authenticated. Deleted-user or inconsistent identity records cannot be
  promoted to human gold.
- Automatic NLI/entity/lexical votes support weak-label exploration/error
  triage only. In particular, annotators using cosine buckets or score-tuned
  thresholds can be circular. Different feature families do not prove
  statistical independence or equivalence to human annotators.
- Fixtures and scripted sweeps never create human labels in a live corpus.
  Automatic scripts must not write `origin=human`; diagnostics never overwrite
  or merge into human consensus.

Recruitment/training, annotator background, compensation/consent, workload,
per-class shared-pair counts and adjudication must be documented before release.
Report raw agreement plus appropriate kappa/alpha and uncertainty; shared errors
can yield high agreement. Gold quality and event identity require human review.

## Event identity, frozen splits and leakage prevention

1. Curate a stable event ID from externally reviewed event identity, not the
   current model's cluster assignment. Same named entity across different dates
   is not automatically the same event. Record event-policy revisions.
2. Canonicalize unordered pair identity. Keep duplicated/reversed historical
   pairs and their votes for audit, but use one canonical experimental record.
3. Group connected components sharing claims, articles, canonical/syndicated
   text or event identity. Assign the whole component to exactly one split;
   compare chronological/source stress splits only under a predeclared protocol.
4. Freeze train/dev/test assignments **before** fitting/calibration/threshold
   selection. `unassigned` is not a publication split; uncertainty-based next-pair
   selection is train-only, never an adaptive dev/test label-selection shortcut.
5. Fit vocabulary, model coefficients and calibrators on train, select method,
   hyperparameters, threshold and abstention policy on dev; touch test only for
   final predeclared evaluation. Never report a test-optimized best-F1 as an
   unbiased operating result.
6. Admin export captures a consistent snapshot with IDs, text hashes, votes,
   origin, event/split assignments and dataset version. Preserve exact bytes and
   checksum; later corpus growth or relabeling creates a new dataset version.
   Pair freeze alone does not prove texts/model weights remained unchanged.

Tests can reject structural cross-split overlap; they cannot prove independently
curated event IDs are semantically correct. Human inspection of event boundaries,
canonical grouping and label independence remains a release gate.

## Reproducibility and licensing manifest

Record repository revision **and dirty patch**, schema revisions (`gmee01` typed
edges, `gmee02` origins/splits, `gmee03` durable ownership), experiment/config hash,
immutable record hashes, dataset version, split/event manifest, model/tokenizer
revision hashes and licenses, Python/OS/hardware/library versions, random seeds,
training/calibration/threshold settings, candidate-retrieval universe, time
cutoff, warnings, missing-model handling and raw per-pair predictions. Container
image tags alone and RNG seeds are not complete reproducibility evidence.

Data release needs a per-source provenance/license inventory: canonical URL,
collection and publication times, content hash, API/RSS terms, permitted use,
redistribution permissions, takedown/retention and personal-data controls.
Repository MIT licensing applies to code, **not automatically news articles,
Reddit posts, annotations or model weights**. If full text cannot be redistributed,
release permitted IDs/URLs, derived features and a licensed acquisition protocol;
state which exact snapshots third parties cannot legally reproduce.

Keep sensitive account IDs/personal data out of public artifacts or pseudonymize
under an approved policy while preserving internal auditability. Coordinate
annotator consent and deletion obligations with the freeze/retention protocol.
No legal permission or privacy clearance is claimed by this document.

## Analysis and reporting plan

- Relatedness: per-class precision/recall/F1, macro F1, confusion matrix, AUROC
  and PR-AUC where both classes and sufficient event support exist.
- Calibration: Brier/log loss, ECE with disclosed bins, reliability plots;
  calibrated probabilities only for the defined human relatedness target.
- Mutation: per-type support and precision/recall/F1, macro and subset accuracy,
  span-grounding errors, corrections vs misinformation examples, missing gold.
- Retrieval/evidence: candidate recall under a labeled candidate universe,
  citation traceability, stance errors and risk–coverage/abstention curves.
- Uncertainty: event/component-level resampling to respect dependent pairs;
  report intervals, class/type support and missing/undefined metrics. Paired
  comparisons/multiple testing need a predeclared correction/interpretation.
- Stratified sampling: disclose inclusion probabilities and report both the
  sampled task and appropriate population-weighted estimates if justified.
  High-cosine-only sampling cannot establish general corpus performance.
- Efficiency: measured cold/warm wall time, CPU/RSS, model download/load costs,
  query/job budgets and hardware under the exact dataset; no claimed benchmark
  numbers until run. Engineering smoke deadlines are not performance results.

Error analysis should cover negation, numeric/unit shifts, entity identity,
hedging, legitimate updates/retractions, copied content, ambiguous timestamps,
non-English/code-switching, satire/quotations, corpus gaps and source dependence.
Release negative results and representative non-cherry-picked errors alongside
successes. No unperformed experiment gets a placeholder metric.

## Results ledger

| Experiment / gate | Status | Evidence |
|-------------------|--------|----------|
| Independently adjudicated frozen human benchmark | **UNPERFORMED** | No new reviewed research snapshot claimed |
| Held-out calibrated relatedness comparison | **UNPERFORMED** | Protocol/harness is not a completed comparison |
| Typed mutation benchmark and ablations | **UNPERFORMED** | Fixture typing is engineering behavior only |
| Citation/stance and selective-risk evaluation | **UNPERFORMED** | Auth gate is not accuracy validation |
| Source/event/temporal generalization | **UNPERFORMED** | No generalization metrics claimed |
| Capacity/load and disaster-recovery measurements | **UNPERFORMED** | Static checks and mocked backup tests only |
| Historical automatic-label report | **EXPLORATORY** | Retained artifact; not human gold or proof of novelty |

## Primary literature comparison (checked 15 October 2026)

This is a focused comparison against original papers, not an exhaustive
systematic review or a claim that no overlapping system exists. The GMEE gaps
below are our assessment of the implementation; the papers establish the prior
tasks/methods. Their reported numbers are not comparable to GMEE without the
same dataset, label definition, retrieval universe and scorer.

| Prior work | What already exists | Consequence for the proposed contribution |
|---|---|---|
| [Magomere et al., *When Claims Evolve*, ACL Findings 2025](https://aclanthology.org/2025.findings-acl.1150/) | Edited-claim retrieval evaluation, embedding robustness, reranking and train/inference mitigation. | Closest overlap: “tracking changed claims using embeddings” is insufficient novelty. Compare edit categories and retrieval failures; evaluate human-grounded quantity equivalence and correction/context distinctions on natural event histories. A synthetic perturbation check is a separate stress test, not natural-history gold. |
| [Allein et al., *Implicit Temporal Reasoning for Evidence-Based Fact-Checking*, EACL Findings 2023](https://aclanthology.org/2023.findings-eacl.13/) | Shared timelines use publication dates and textual time expressions in evidence-based verification. | Timestamps/temporal edges alone are not a new method. Compare explicit event/time constraints with unconstrained matching and retain ambiguous chronology. GMEE's current pair evaluator does not establish temporal reasoning performance. |
| [Chen et al., *Complex Claim Verification with Evidence Retrieved in the Wild*, NAACL 2024](https://aclanthology.org/2024.naacl-long.196/) | Decomposition, web retrieval, evidence selection and verification restricted to pre-claim documents. | Prevent future-evidence leakage when making emerging-claim claims. GMEE's current revision-bound evidence is traceable but is not automatically a historical evidence snapshot predating the claim. |
| [Glockner et al., *AmbiFC*, TACL 2024](https://aclanthology.org/2024.tacl-1.1/) | Fine-grained passage annotations and ambiguity-related annotator disagreement. | Preserving dissent and insufficient context is methodologically useful but not novel by itself. Measure context errors and annotation disagreement; never turn unresolved labels into unanimous gold. |
| [Akhtar et al., *2nd AVeriTeC Shared Task*, FEVER 2025](https://aclanthology.org/2025.fever-1.15/) | Open-weight, reproducible evidence/verdict systems under a specified single-GPU runtime budget and knowledge store. | “Local models + retrieval + evidence” is not a research contribution alone. Measure quality/cost and use the official task scorer for a task claim; a local stance score is not an AVeriTeC score. |
| [Strong and Vlachos, *TSVer*, EMNLP 2025](https://aclanthology.org/2025.emnlp-main.1519/) | Numerical/temporal verification grounded in time-series evidence and justifications. | Distinguish GMEE's text-level quantity normalization from verification against external numerical evidence. Typed span agreement cannot establish factual numeric correctness. |
| [Dey et al., *Temporal Fact Conflicts in LLMs*, March 2026 preprint](https://arxiv.org/abs/2603.15892) | Reproduces temporal-conflict studies across DYNAMICQA/MULAN and investigates dataset/metric/model-size dependence. | A recent reproducibility warning, not a peer-reviewed superiority benchmark: report cross-event sensitivity and exact task definitions. Do not imply this LLM-memory task is identical to news-pair analysis. |
| [Upravitelev et al., *Take It All*, FEVER 2026](https://aclanthology.org/2026.fever-1.7/) | Multimodal evidence aggregation with runtime/performance ablations. | A current adjacent efficiency reference; GMEE is text-only. Adding image support is optional scope, not a prerequisite for publishing a focused textual contribution. |

### Additional task overlap checked 19 October 2026

| Prior work | Existing human target | Consequence for GMEE |
|---|---|---|
| [Ko et al., *ClaimDiff*, ACL Findings 2023](https://aclanthology.org/2023.findings-acl.289/) | Expert-rated strengthen/weaken relations and rationale phrases for cross-outlet news claim pairs. | Cross-outlet comparison itself is established. These directional relations are not GMEE's relatedness, typed change, or chronological lineage labels; evaluate only a deliberately implemented matching target. |
| [Spangher et al., *NewsEdits 2.0*](https://arxiv.org/abs/2411.18811) | Journalist-annotated factual, stylistic and narrative intentions in same-article news revisions. | Distinguishing legitimate updates from other edits is established. Its gold annotations would be a valuable external test if obtainable, but same-article revisions do not establish cross-outlet claim evolution. |
| [Schuster et al., *VitaminC*, NAACL 2021](https://aclanthology.org/2021.naacl-main.52/) | Human-reviewed real Wikipedia factual revisions and contrastive claim/evidence examples; a separate synthetic subset exists. | Its real revision-flagging task can test a factual-change component with the author's labels and splits. It cannot validate natural-news typed spans, context, event generalization or propagation. |

The [public benchmark audit](PUBLIC_BENCHMARK_AUDIT.md) records label fit, access and rights. These resources narrow the novelty claim and must not be silently relabeled to fit GMEE's task.

Calibration and selective prediction are established methodology:
[Guo et al. (2017)](https://proceedings.mlr.press/v70/guo17a.html) studies
probability calibration, and [Geifman and El-Yaniv (2019)](https://proceedings.mlr.press/v97/geifman19a.html)
jointly optimize prediction and rejection. GMEE implements a simpler post-hoc,
empirically dev-selected rejection policy. It does **not** implement SelectiveNet,
conformal risk control, or a distribution-free error guarantee.

**Defensible candidate paper:** a reproducible benchmark and modest method for
quantity/context-aware change triage on independently annotated natural news
claim pairs. The research question is whether inspectable spans and normalized
quantities reduce false mutation alarms from equivalent units, paraphrases and
legitimate updates, at useful coverage on unseen events. This remains a
hypothesis: the present rule-based context mapping cannot independently decide
incompatibility or unrelatedness, and external source cues remain unverified.
No new algorithmic or empirical superiority claim is supported yet.

## Implemented experiment protocol v2

`backend/scripts/run_research_experiment.py` accepts only an immutable exported
human-gold JSONL snapshot. It fits character TF-IDF, stored-cosine sigmoid
calibration and group-calibrated logistic feature ablations; the baseline
families listed earlier that are absent here remain planned, not implemented.

```powershell
backend/.venv/Scripts/python.exe backend/scripts/run_research_experiment.py `
  --dataset path/to/reviewed-v1.jsonl --output-dir path/to/new-run-v1 `
  --seed 1729 --bootstrap 1000 --selective-target-risk 0.1 --selective-min-dev 5
```

The two selective arguments must be predeclared. The minimum retained count is
a computational safeguard, not a sample-size prescription. No reviewed dataset
is created by this command, and a nonempty result directory is refused.

- **Log loss:** mean negative natural log probability of the true relatedness
  label, with probabilities clipped to `[1e-15, 1-1e-15]`. Brier/ECE/log loss are
  emitted only for methods explicitly calibrated on train; raw cosine is not
  reinterpreted as probability.
- **Selective relatedness:** freeze the relatedness threshold selected by dev
  F1. Confidence is `p` for a predicted positive and `1-p` for a predicted
  negative at that threshold, even when it differs from 0.5. Retain all examples
  at or above a confidence cutoff. Select the largest dev coverage satisfying
  the empirical error target and minimum dev support; freeze this policy for
  test. If no point qualifies, abstain on all test pairs. Zero retained risk is
  undefined (`null`), not zero. Confidence ties enter together. Test AURC uses
  a right-endpoint step integral at attainable coverages; the plot connects
  measured points for inspection and does not choose test thresholds.
- **Changed spans:** score only independently agreed test `gold_changed_spans`.
  Match exact `(side,start,end,type)` sets and the union of typed Unicode
  characters, micro-aggregated across pairs. Duplicate/overlapping typed spans
  cannot inflate support. Empty annotation is an explicit reviewed negative;
  missing gold/predictions are unavailable and have separate coverage counts.
  Partial span credit never proves causal explanation faithfulness.
- **Context:** report accuracy, confusion and per-class support; macro F1 averages
  labels with gold or prediction support. Conservative analyzer cues map to
  PARAPHRASE, UPDATE_OR_CORRECTION or INSUFFICIENT_CONTEXT. The inability to
  predict INCOMPATIBLE_ASSERTION/UNRELATED is visible as errors, not hidden by
  collapsing those gold labels. Pair order is not inferred chronology.
- **Artifacts:** JSON and CSV preserve per-pair probabilities, selective
  acceptance and separate type/span/context targets/predictions. Markdown
  reports support, unavailable cases and limitations. PR, dev-F1, reliability
  and risk-coverage SVGs plus fitted states/source hashes are included in a
  SHA-256 manifest. Synthetic unit fixtures verify calculations and leakage
  boundaries; they are never a completed human research experiment.

Current grouped intervals cover paired differences in relatedness F1, AUROC
and average precision only. Span/context metrics, calibration scores and
selective operating points currently have point estimates and explicit support,
not confidence bounds. Predeclare and add appropriate event-level uncertainty
for those endpoints before drawing inferential conclusions from them. Neither
the runner nor its report verifies annotator independence, acquisition rights,
semantic event correctness or whether an external user reused the test set.


## Implemented investigation and annotation support

Quantity normalization converts explicitly supported units/currencies while
preserving original character spans; text comparison reports correction/update
cues conservatively and labels supplied source references unverified. The human
rubric, exact span/context annotations and independent blinded disagreement
queue are implemented. Type/span/context consensus remains separate and retains
dissent. Frozen exports retain these annotations; implementing their UI does not
supply human gold or complete the results ledger above.

Hybrid corpus retrieval and revision-bound Wikipedia passages include exact
text provenance and local stance/abstention. Real pretrained engineering smoke
checks run separately from unit tests. See [Verification](VERIFICATION.md).
