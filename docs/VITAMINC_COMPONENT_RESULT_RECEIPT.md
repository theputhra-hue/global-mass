# VitaminC component result receipt

**Receipt date:** 19 October 2026  
**Status:** Verified local result for a narrow public-benchmark component task;
not a claim that the GMEE natural-news paper is complete or accepted.

## What was evaluated

The frozen task is binary factual-revision flagging on the authors' VitaminC
release of real Wikipedia sentence revisions. The primary comparison is a
matched lexical logistic model versus the same model augmented with deterministic
GMEE text-change features. Both models use the same raw sentence pair and the
same clean test rows. The target is not GMEE's three-way relatedness label and
does not evaluate typed human spans, context, evidence stance, provenance,
truth, copying, or causal propagation.

The primary test set is the predeclared clean subset: rows matching full train
or dev on normalized page title, revision ID, or exact unordered raw sentence
pair were excluded before model scoring. The archived release contains 31,048
test rows; 220 were quarantined and 30,828 were eligible for the primary
analysis. The primary class support is 19,535 `not factual` and 11,293
`factual` rows.

## Locked result

| Quantity | Lexical | GMEE augmented |
|---|---:|---:|
| Primary clean AUROC | 0.7224997621 | 0.8116241534 |
| Average precision | 0.5798049664 | 0.6528551620 |
| Macro-F1 at clean-dev threshold | 0.6517906942 | 0.7309697944 |
| Brier score | 0.2106054211 | 0.1717387086 |
| Log loss | 0.6128092332 | 0.5050595952 |

The primary paired contrast is **0.0891243913 AUROC** (augmented minus
lexical). Its two-sided 95% percentile interval is
**[0.0760953865, 0.1019605615]**, from 2,000/2,000 valid paired draws over
4,196 normalized page groups. The predeclared practical margin was +0.02;
the interval is above that margin under the locked decision rule.

A sensitivity bootstrap over 4,192 input-defined connected components produced
**[0.0756004715, 0.1024241337]** for the same contrast. The clean test has
3,243 nontrivial components, 29,879 rows in nontrivial components, and a
largest component of 598 rows. This dependence is a material limitation, not
a reason to substitute the more favorable interval.

The full official test metrics are retained in the local report as a secondary
overlap-disclosed analysis. The strongest released ALBERT checkpoint was not
included in this lock; adding it later requires a separate frozen plan.

## Reproducibility receipt

All paths below are local and ignored. They contain derived identifiers,
labels, or predictions and must not be copied into a public release without a
rights/privacy review.

- Archive SHA-256:
  `7e13400c6c2f1aeca8a084eedbdbb3dff797d3660c93b9229fdeb85ebd82006e`
- Train JSONL SHA-256:
  `9ed654d11db34be1918af0abe83df348f462daefbdf1ee6a521ae7682ab3277b`
- Dev JSONL SHA-256:
  `fd1e6a3c15d53b7529e5c04533619c1ffa6091435aa6864842fe2f0e47363733`
- Test JSONL SHA-256:
  `0e1094b357d72716febc75ebccf24581b558d0a3e6ae69c23d23f892aeed3a3a`
- Locked plan SHA-256:
  `d2d3af48a494926babd9be84af4aed88d80c24cd9f72baff1b5ab263083104c3`
- Local lock SHA-256:
  `b7f1e136e8b1238d3fe41908e45f6b9115d924bbd128aa258d0189d945446e0b`
- Per-row predictions SHA-256:
  `4199998ab531c50ce1a5606f72ee852e547cfc194a5f4fa1d1a87f88c58b090f`
- Results JSON SHA-256:
  `15e18b6290e6bccc71a83f3fdde4f9f93a6732964ed7a6498ec5a20260b718fd`

The exact source hashes, model state, dev predictions, runtime versions,
input-only group diagnostics, and the one-time test-access marker are in the
local lock directory. The code HEAD recorded there is `aa0056c3e81a012b942c4a1fc9cb278feaa5c3f8`; the research source files were dirty
working-tree files and are independently hashed by the lock.

The test command was:

```text
.local-deployment/research-venv-linux/bin/python evaluation/scripts/run_vitaminc_locked.py score --data-dir .local-deployment/research-data/vitaminc/extracted/vitaminc_flagging --locked-dir .local-deployment/research-runs/vitaminc-lock-v1-20261019 --output-dir .local-deployment/research-runs/vitaminc-score-v1-20261019
```

Runtime: Python 3.11.2, NumPy 2.2.6, SciPy 1.15.3, scikit-learn 1.7.2,
RapidFuzz 3.14.3 on WSL2 Linux. The frozen test marker records UTC
`2026-10-19T04:48:12.839611+00:00`; a second score attempt is refused.

## Interpretation boundary and next gate

This receipt supports a reproducible, narrow component finding: on the
released and model-preselected Wikipedia candidate pool, the fixed augmented
feature implementation ranked human-provided factual-revision labels better
than the fixed lexical baseline under the locked protocol. It does **not**
validate the broader GMEE quantity/temporal/provenance hypothesis on unseen
news events. The public release's annotation provenance and split leakage
caveats remain part of the finding.

The earliest remaining blocker is independent human gold for the actual GMEE
natural-news task: two distinct authenticated reviewers per eligible pair,
separate relatedness/type/span/context labels, event and syndication curation,
rights decisions, and leakage-resistant splits. Until that work exists, keep
this receipt separate from any claim of full-system scientific validation.
