# Retired claim-pair annotation guide

This file previously described a four-class, ordered claim-pair task and a
CSV labeling workflow. It is **retired for new annotation**. Its labels,
class quotas, examples, and SQL/CSV collection procedure are not the current
research protocol and must not be used to create human benchmark labels.

Use the authenticated Eval Lab instead:

1. Read the live versioned rubric from `GET /eval/rubric`
   (`claim-pairs-v2`) and [the evaluation protocol](../../../docs/EVALUATION.md).
2. Review blinded pairs from `GET /eval/next` independently. Pair A/B order
   does not establish chronology, copying, or truth.
3. Submit `SAME_STORY`, `EVOLVED`, or `DISTINCT` as the relatedness label via
   `POST /eval/label`. Annotate mutation types, exact changed spans, and
   contextual relation as separate targets when reviewed. An empty span list
   means reviewed with no changed span; an omitted field means not reviewed.
4. Preserve notes and dissent. At least two distinct authenticated humans
   must unanimously agree for relatedness gold; type, span, and context
   consensus are assessed separately. Follow the sampling and frozen-split
   protocol in [Research](../../../docs/RESEARCH.md).

The adjacent `annotation_schema.json` is a retirement notice, not an active
schema. `pairs_template.csv` and `evaluation/scripts/eval_mutation_detection.py`
are historical compatibility artifacts, not the collection or evaluation
path for publication-grade human annotations.
