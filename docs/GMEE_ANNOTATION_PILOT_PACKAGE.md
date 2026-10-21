# GMEE independent annotation pilot package

**Status:** Prepared for human review; no new human judgments are present in this
file. This package is the remaining dependency for the natural-news GMEE task.
It is separate from the completed VitaminC component evaluation.

## What the reviewers would establish

The local GMEE paper question requires a task-specific benchmark of natural
claim pairs. At least two distinct authenticated people must independently
review each eligible pair, without seeing model scores or each other's votes.
The required targets are separate:

1. relatedness: `SAME_STORY`, `EVOLVED`, or `DISTINCT`;
2. zero or more exact changed spans on either claim, with one of the versioned
   mutation types;
3. contextual relation: `PARAPHRASE`, `UPDATE_OR_CORRECTION`,
   `INCOMPATIBLE_ASSERTION`, `INSUFFICIENT_CONTEXT`, or `UNRELATED`; and
4. reviewer notes explaining ambiguity, dates, quantities, attribution,
   quotation, negation, or correction when relevant.

A relatedness vote does not establish truth, copying, source agreement, or
causal propagation. Pair order does not establish chronology. Empty spans mean
that spans were explicitly reviewed and none were found; omitted spans mean
that target was not reviewed.

## Frozen rubric and reviewer blinding

The deployed source defines rubric version **`claim-pairs-v2`** in
`backend/app/services/eval/annotation.py`, served by `GET /eval/rubric`.
Offsets are Unicode code points, start-inclusive/end-exclusive, and the server
rejects text selections that do not exactly match the stored claim text.
`GET /eval/next` serves blinded pair text/outlet context without scores,
predicted types, model stance, or other reviewers' decisions. The server
records the authenticated user identity and preserves revisions. Do not use a
shared account or exchange pair decisions before submission.

The consensus rule is conservative: at least two distinct authenticated human
identities with unanimous current labels are required. Disagreement remains
unresolved until a separately documented adjudication step; adjudication must
not erase the original votes or make a single reviewer appear independent.
Automatic, legacy, fixture, assistant, and case-review labels cannot be used
to create the second human vote.

## Candidate frame and proposed pilot

The local candidate inventory is `candidate-frame-20261019-v3`, with 1,271
rows and JSONL SHA-256
`da7ba9f5a7f0a970de0420b7dd8f7b50743067f6536c27c1fb01993c682f3476`.
It contains hashes, provenance hints, and source links but no public text
release or labels. Source rights are currently `unreviewed`; a reviewer must
not receive a public copy of article text until each source/rightsholder
decision is recorded. The frame's six similarity buckets are only sampling
strata, not labels or event truth.

For a first rubric pilot, use a deterministic **72-pair proposed sample**:
12 pairs from each of `b00`, `b40`, `b60`, `b75`, `b85`, and `b95`, with
source/time and same-article/canonical-duplicate checks performed before
serving. Include plausible same-event cross-source pairs and unrelated
controls. Do not select on current model predictions, stored verdicts, or
anticipated agreement. The 72-pair count is a rubric/effort pilot target,
not a powered final benchmark and not a prevalence estimate.

Before serving the sample, an author/admin must:

- review source terms and permitted local retention for every selected source;
- curate event identity independently of the model's cluster assignment;
- deduplicate reversed pairs, syndicated/canonical text, and identical claims;
- record exclusions and unresolved event boundaries without deleting the
  original candidate frame; and
- create a versioned internal pilot manifest with pair IDs, text hashes,
  event/duplicate decisions, rights status, rubric version, and split status.

No final train/dev/test assignment should be fitted or tuned from this pilot.
The pilot is for rubric clarity, reviewer independence, event-boundary review,
and measured effort.

## Reviewer procedure

1. Give both reviewers the same short training sheet and practice examples;
   practice decisions are not gold. Explain that false claims can still be
   related claims and that a larger number can be a legitimate update.
2. Assign each reviewer the same pilot pair set through separate authenticated
   accounts. They submit independently and record start/end time or elapsed
   minutes without seeing the other vote.
3. Preserve every original vote, revision, note, and identity provenance.
   Do not export raw article text or personal account identifiers to a public
   artifact.
4. After both votes are complete, compute relatedness/context agreement,
   per-type agreement, exact-span agreement, disagreement counts, missing vs
   explicit-empty targets, and time per pair. Keep unresolved cases visible.
5. Hold a documented adjudication only for rubric repair and approved final
   labeling. Record who adjudicated, what evidence was allowed, and how the
   original dissent remains represented.

The pilot stopping rule is fixed before review: stop after the 72 proposed
pairs have two independent votes or after a documented rights/safety failure
prevents serving a pair; do not stop because an effect or agreement is
favorable. Set final sample size only after measured reviewer time, support in
each relatedness/type/context class, event diversity, and unresolved-case
rate are available.

## Gold and release gates

A pair can enter an eventual GMEE research export only if its event/split
assignment and connected-component checks pass, at least two authenticated
human votes exist, and the required target has an agreed status under the
versioned rubric. Mutation, span, and context gold have stricter support than
relatedness-only gold; do not fill missing targets with analyzer output.

The release review must also record reviewer consent/compensation policy,
retention and deletion handling, source rights, text redistribution limits,
model/config/code hashes, the immutable manifest, and a source-held-out or
event-disjoint split. Until those gates pass, local labels are exploratory and
no relatedness/type/span/context accuracy claim is allowed.

## Concrete human dependency

To execute this package, the project owner must provide access to **two
independent human reviewers** who can authenticate separately in the local Eval
Lab, plus a rights decision for the selected source frame and an approved
consent/retention plan. The assistant cannot create independent human
judgments, infer event identity from similarity, or substitute AI labels.
