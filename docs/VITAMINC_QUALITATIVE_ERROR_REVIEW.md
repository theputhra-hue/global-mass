# Qualitative review of a fixed error sample

**19 October 2026. AI-assisted exploratory analysis, not new human gold.**
The original analysis plan allowed seeded qualitative error inspection. After
test scoring, `evaluation/scripts/select_vitaminc_errors.py` selected 12 distinct
normalized pages for each augmented-model false-positive and false-negative
stratum, ranking pages by SHA-256 with seed 20261019 and selecting one ranked
error per page. Pages may recur across the two strata. This selection targets
errors and cannot estimate error-category prevalence in the dataset.

The 24 original pairs, case IDs, labels and predictions are retained locally in
`.local-deployment/research-runs/vitaminc-qualitative-errors-v1/cases.jsonl`, with
sample SHA-256 `2b69198ab647b9d834fba0398a5a4d35a6b802b1fc7687c0c7e589ccc18e5ca3`.
The manifest records the script, source data and primary prediction hashes.
The rows below preserve the sample order without redistributing sentence text.
All judgments below are assistant interpretations of the supplied sentences;
no historical article or external factual adjudication was performed.

## False positives relative to released labels

| Sample row | Observation |
|---|---|
| FP01 | Citation date/page abbreviation and removed bibliographic title trigger textual differences while the reported ranking remains. |
| FP02 | An unexplained personal-name prefix appears before an otherwise unchanged sentence; extraction noise or vandalism is possible, unverified. |
| FP03 | The date and reported view count change despite a released nonfactual label; sentence-only label interpretation is uncertain. |
| FP04 | One assertion is replaced by an unrelated evaluative assertion despite a nonfactual label; underlying revision context is unavailable. |
| FP05 | A contract duration changes from a number word to a digit, alongside removal of an upper-bound cue. This is not a clean unit-equivalence example. |
| FP06 | A group descriptor changes to a different expression; the detector lacks referential and sociolinguistic context. |
| FP07 | Category markup and merged page-title text trigger features, illustrating non-prose input contamination. |
| FP08 | Removing a subjective prominence/hedging phrase leaves the actor-role statement; lexical change does not establish changed factual content. |
| FP09 | Local-language examination names become English names, with capitalization repair; surface entity changes may preserve reference. |
| FP10 | Named people are replaced inside an exclusion statement despite a nonfactual label; source context or annotation review would be needed. |
| FP11 | A word becomes a capitalized misspelling, which can trigger capitalization-based entity heuristics. |
| FP12 | A date in bibliographic text changes notation; date normalization is outside the quantity parser's supported conversions. |

## False negatives relative to released labels

| Sample row | Observation |
|---|---|
| FN01 | A count changes from one number word to another; the explicit digit/unit parser does not normalize number words. |
| FN02 | A nationality adjective changes, while the pair remains lexically similar. |
| FN03 | A named collaborator is deleted from a list embedded in a long sentence. |
| FN04 | A team affiliation changes; the score lies just below the fixed 0.38 threshold. |
| FN05 | A professional role is added to an existing occupation description. |
| FN06 | An interview-context word is added alongside hyphenation repair; the released factual label highlights contextual subtlety. |
| FN07 | A sentence about national case/recovery counts becomes a later city-specific recovery statement; substantial wording change does not ensure a high model score. |
| FN08 | An ordinal expression changes to exclusivity, altering scope with little text change. |
| FN09 | Part of a person's name is deleted within noisy template text. |
| FN10 | A named fictional setting changes within a long list of roles. |
| FN11 | An album count changes between number words, another unsupported numerical surface form. |
| FN12 | A causal/consequence clause is deleted; the retained sentence is still highly similar. |

## What this supports

The sample motivates three limitations: unsupported number-word/date handling;
small relational changes diluted by largely unchanged text; and reference/style
or extraction changes that look substantive to lexical rules. Some released
labels are difficult to reconcile with the isolated sentence pair. These are
questions for contextual human review, not proof that labels are wrong.

No labels, exclusions, thresholds, features or models were modified after this
inspection. Do not convert these observations into type-accuracy measurements,
population category counts, or independently adjudicated annotation findings.
