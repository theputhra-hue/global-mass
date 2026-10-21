# Internal scientific review — 19 October 2026

## Scope and assessment

This is an AI-assisted independent review of the current manuscript, bibliography,
review-gap record, primary and supplementary receipts, relevant source code, and
primary literature. It is not human peer review. No fitting, inference, or
bootstrap was rerun. The original frozen files were not changed.

The four-model result table agrees with the saved evidence: clean AUROC is
0.7225 for lexical logistic, 0.8116 for the 33-feature model, 0.8205 for sparse
edit TF-IDF, and 0.9189 for the released ALBERT checkpoint. The primary confidence
interval and sample support match the primary receipt. The prose clearly
separates the original contrast from the later baselines, acknowledges
model-preselected candidates, and avoids claiming new human annotation or
full news-system validation. I found no numerical error in that table.

**Assessment:** the evidence supports a narrow component result. The present
scientific weakness is what readers learn beyond an improvement over eight
lexical summaries. The richer sparse comparator and task-trained checkpoint
already outperform the proposed representation. Record keeping makes the
experiment inspectable, but does not by itself establish a novel research
finding. The planned mechanism analysis could explain whether the descriptors
add information beyond generic differences and sparse text; its test results
must remain exploratory because this test has already been exposed.

## Concrete revisions

| Priority | Location | Finding | Minimal correction |
|---|---|---|---|
| Required for interpretation | Manuscript §3, reversed-pair discussion; corresponding review records | The audit establishes that mixed labels occur across reversed inputs, not why they occur. Treating reversal as a valid explanation of the labels is stronger than the evidence. | Report the observed counts and state that their cause was not adjudicated. Do not call them human disagreement, and do not claim reversal explains them. Suggested wording is below. |
| Required for artifact consistency | `docs/VITAMINC_POSTTEST_REVIEW.md`, anchor audit paragraph | The displayed test hash contains an extra `c` in `febcc75`; it is not the 64-character hash of the actual test file. | Correct only this nonfrozen narrative transcription to `0e1094b357d72716febc75ebccf24581b558d0a3e6ae69c23d23f892aeed3a3a`. The data audit, primary receipt, and actual file agree on that digest. Preserve the frozen plans and artifacts. |
| Required when integrating new results | Manuscript §§4–6 and conclusion | The mechanism experiment is being designed after the four-model results. A successful ablation cannot retroactively turn the original combined-feature contrast into confirmation of a specific semantic mechanism. | Give its design chronology, fixed feature subsets, model-selection rules, all outcomes, and exploratory status. Describe predictive contribution of feature groups rather than human-validated explanations. |
| Wording precision | Manuscript §4.2 and Table 1 caption | The +0.02 margin is genuinely fixed in the local plan, but the reviewed plan does not provide an operational cost or user-utility argument for that number. | Call it the “predeclared study margin.” State that exceeding it satisfies this study's decision rule; avoid extending that fact to deployment utility. Do not invent a retrospective rationale. |
| Readability before submission | Manuscript §4.5 | Multiple full SHA-256 paragraphs interrupt the method and consume substantial paper space. | Retain the access-history disclosure in the main text; put the complete hash manifest and reproduction commands in the supplement. This is an editorial change, not a change to the evidence. |

Suggested replacement for the mixed-label interpretation:

> Among the 30,828 clean rows, 438 unordered-pair groups (953 rows) contain both
> labels, always across reversed input orders. No identical ordered pair has
> conflicting labels. We did not adjudicate why reversed records differ; the
> audit establishes neither annotation error nor a valid directional-label
> explanation. Unordered pairs remain a conservative exclusion and dependence
> key.

The source task is defined using revisions and a change in the support or
refutation status of possible claims. That definition does not explain the
observed reversed-record labels without inspecting their annotation context.
[VitaminC, §4.1](https://aclanthology.org/2021.naacl-main.52.pdf).

## Comparison and inference checks

- The two primary models use the same training and clean development/test
  populations. Selecting regularization separately on development is compatible
  with this comparison. The result belongs to the full 33-feature recipe;
  generic similarity and span counts accompany the named mutation descriptors.
- The sparse result is a same-row comparison with a different representation.
  It is correctly distinguished from the original paper's neural bag-of-words
  baseline. Its better AUROC does not imply superiority on every secondary
  metric: the augmented model has slightly lower log loss.
- The ALBERT score is a released-checkpoint evaluation with a fixed threshold,
  rather than an identical local retraining experiment. The manuscript already
  discloses this, truncation, later runtime, and different threshold policy.
  There is no controlled efficiency comparison and no such claim is warranted.
- Page and connected-component resampling address specified observed
  dependence. They do not remove repeated rows from the row-weighted estimand,
  establish event independence, or remove selection bias. The manuscript's
  support and component counts make this limitation visible.
- The local hash freeze and one-time marker provide an audit trail; they do not
  prove external preregistration or immutable timing. The aggregate-label
  exposure disclosure should remain prominent. The abstract's earlier wording
  about selecting on “quarantined” development rows was corrected to selection
  on the retained rows during this review.
- Existing public human-reviewed labels support this component task. Fresh
  two-person GMEE annotation is necessary for the broader local news claims,
  not an automatic requirement to report this narrower external benchmark.

## Citation verification

All six references resolve to primary sources. Author order, title, year,
venue or preprint status, page range where applicable, and DOI agree with the
official records checked on 19 October 2026. The claims below are appropriately
bounded in the manuscript.

| Citation | Checked use |
|---|---|
| [Schuster, Fisch, and Barzilay (2021)](https://aclanthology.org/2021.naacl-main.52/) | Direct factual-revision task; model selection of candidate edits before human review; historical Table 3 scores are context rather than identical-row estimates. |
| [Yang et al. (2017)](https://aclanthology.org/D17-1213/) | Prior 13-category edit-intention work with engineered revision-difference features. This prevents claiming novelty for typed edit features in general. |
| [Lan, Zhang, and Dragut (2026)](https://aclanthology.org/2026.findings-acl.1747/) | Current survey of edit intentions, taxonomies, datasets, methods, and applications. |
| [Ko et al. (2023)](https://aclanthology.org/2023.findings-acl.289/) | Human claim-pair strengthening/weakening relations and rationales; a distinct target from VitaminC flagging. |
| [Magomere et al. (2025)](https://aclanthology.org/2025.findings-acl.1150/) | Robustness of fact-check retrieval to misinformation edits; a neighboring retrieval problem. |
| [Spangher et al. (2024)](https://arxiv.org/abs/2411.18811) | News-revision intentions with factual, stylistic, and narrative updates; the manuscript does not claim to evaluate those annotations. |

This verifies the six cited references, not completeness of the entire
literature. The 2017 revision-diff features and the directly matched 2021
flagging study are sufficient to rule out a broad “first typed revision
detector” claim.

## Minimum remaining research and human decisions

1. Integrate the fixed exploratory mechanism experiment and explain what its
   results add to the original combined-feature comparison. Preserve unfavorable
   outcomes and all prespecified comparisons. A fresh held-out source is needed
   if the paper seeks a new confirmatory generalization from those explorations.
2. Choose the paper's actual contribution: an explanatory empirical component
   study, a reproducibility report with a substantive audit finding, or a wider
   system study after new gold collection. Merely calling this “publishable”
   will not resolve the contribution question.
3. Human researchers supply authorship, affiliations, contributions,
   conflicts/funding declarations, final venue selection, and accountability for
   the evidence. The AI error notes are not adjudicated error categories; human
   contextual review is needed only if the paper wishes to make that stronger
   error-analysis claim.

No external submission, data release, or GitHub push is part of this review.

## Resolution and follow-up evidence

The root continuation corrected the reversed-input interpretation and narrative
hash typo, changed utility language to a predeclared study margin, and moved
long artifact digests to Appendix A. It completed and reported all four fixed
exploratory feature models: A 0.7511, B 0.7971, C 0.8317, D 0.8569 AUROC. The
D-minus-C descriptive page interval is [0.0213, 0.0292]; original33-minus-A is
[0.0519, 0.0690]. Separate arithmetic checks of all clean/full metrics agreed
within 2.23e-16, without redoing inference or bootstrap. The manuscript includes
its outcome-informed chronology and no individual-rule or causal claim.

This strengthens the explanatory component account: there is observed
complementarity under the tested sparse recipe. It does not resolve external
validity, independent reproduction, human accountability or venue acceptance.
This resolution was applied by the root assistant, not a fresh human peer review.

## Version 3 reconciliation - 20 October 2026

A further AI review checked the completed reconstruction receipt: 1,491 checks
passed, all 78 maximum errors were zero, and seven prediction files matched
byte-for-byte. It found no raw benchmark text or real row identifiers in the
receipt. The resumed read-only comparison matched except its timestamp.

Applied corrections distinguish original single-access evaluation from the
later reconstruction, update obsolete open-reconstruction statements, identify
the Debian container runtime, and disclose Codex assistance. Sai Prabhas
confirmed equal project contribution by himself and Pavanputra. Unconfirmed
individual contributions and responsibility attestations were removed; final
human review, declarations and publication route remain pending. The title now
specifies an overlap audit, reflecting the exact exclusions actually tested.
The final 10-page PDF was rendered and inspected in full.

These are AI-assisted audit and editorial checks. They do not constitute human
peer review, independent researcher reproduction or acceptance by a venue.
