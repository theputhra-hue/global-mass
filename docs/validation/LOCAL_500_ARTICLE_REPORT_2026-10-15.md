# Local developer-console and 500-article validation

Date: 15 October 2026 (Asia/Kolkata). Repository baseline: `8d8ff3c`, with local
developer-console/publication changes. This was an operational experiment with
real local models and PostgreSQL, not a scientific accuracy evaluation.

## Outcome and scope

The tested developer workflow works locally: authentication, restricted controls,
status polling during processing, source pause/resume, article review, relationship
processing, snapshot upload and duplicate prevention. All 500 selected articles
completed preprocessing and NLP without a recorded article failure.

There are material limitations: short feed-derived text, incomplete sentence
coverage, unresolved pronouns, heuristic confidence, limited memory headroom,
synchronous execution and an unfinished public-release activation workflow.
These results do not establish paper-publication readiness or factual accuracy.

“500 papers” was interpreted as 500 news articles in this project's existing
corpus. No academic PDFs were processed. The 500 were not newly fetched during
this experiment. A separate live RSS audit is reported below.

## Isolation and dataset

- Original database baseline: 7,421 articles, 5,157 claims, 0 relationships,
  3 users. The same counts were observed after testing. This is a count check,
  not a byte-for-byte database comparison.
- Experiment database: `gmee_bench500_20261015_144907`, independently migrated
  through `gmee04`. The original database was read to copy inputs; its corpus was
  not replaced. Publication staging was applied only to experiment databases.
- Redis database 13 isolated benchmark state from the usual database 0.
- Neo4j projection writes and the scheduler were disabled for the experiment.
- Selection: English, previously processed, raw `content` at least 400 characters;
  1,389 eligible out of 7,421. Deterministic ordering:
  `ORDER BY md5(id::text || 'gmee-bench500-v1') LIMIT 500`.
- Copied article states were reset to raw/pending and existing claims excluded.
- Cleaned input length: minimum 63, median 555, maximum 11,624 characters.
  Raw HTML length does not guarantee substantial cleaned article text.
- Two approved developer accounts were copied for authentication. Two synthetic
  accounts were created only in the experiment database for denial tests.
- Selection manifest SHA-256:
  `df6c2fbdff4e2dea1e626e919359dc59f8200f215177fdab6d7d22acad515f6d`.

| Source domain | Selected articles |
|---|---:|
| The Guardian | 258 |
| Times of India | 77 |
| The Verge | 70 |
| NPR | 70 |
| The Hindu | 19 |
| Al Jazeera | 4 |
| TechCrunch | 1 |
| Sky News | 1 |

The Guardian accounts for 51.6% of this selected set. Eligibility and existing
collection introduce selection bias. This is not a balanced research dataset.

## Hardware and inference configuration

| Item | Observed configuration |
|---|---|
| CPU | Intel Core 7 240H, 10 physical cores, 16 logical processors |
| Available physical RAM capacity | 16,084.7 MiB (15.7 GiB; nominal 16 GB machine) |
| GPU hardware | NVIDIA GeForce RTX 5060 Laptop GPU, 8,151 MiB VRAM |
| PyTorch | 2.13.0+cpu; CUDA unavailable to this installation |
| Inference device | CPU; 4 Torch threads, 2 interop threads |
| NLP cycle cap | 10 articles |
| Models | Cached FLAN-T5-base, all-mpnet-base-v2, spaCy en_core_web_sm |
| External paid inference | None used in this experiment |

Model revisions:

- FLAN-T5-base: `7bcac572ce56db69c1ea7c8af255c5d7c9672fc2`.
- all-mpnet-base-v2: `e8c3b32edf5434bc2275fc9bab85f82640a19130`.
- A cached NLI DeBERTa model was available, but was not evaluated across these
  500 articles. This run does not benchmark end-to-end verdict or NLI accuracy.

Inference used offline caches. Weight downloads and environment preparation are
excluded from throughput. GPU observations of approximately 1.9 GiB used and
2–3% utilization include unrelated system activity; they are not GPU inference
measurements. The installed CPU build cannot use the available GPU.

Middleware request throttling was disabled only on the isolated throughput
server. The independent authentication attempt limiter remained enabled. Normal
rate limiting was restored for the final local review server. Automatic evolution
after each NLP cycle was suppressed; evolution was measured separately once.

## Measured processing results

| Measurement | Result |
|---|---:|
| Articles preprocessed | 500 / 500 |
| Articles with completed NLP status | 500 / 500 |
| Recorded article failures / ownership losses | 0 / 0 |
| Claims extracted and embedded | 1,536 |
| Entity spans | 4,553 |
| Preprocessing + NLP + final integrity collection | 348.47 seconds (5m 48.47s) |
| Approximate throughput for this selected set | 1.435 articles/second |
| Initial preprocessing call, including chained first 10 NLP articles | 12.74 seconds |
| Subsequent NLP cycles | 49 cycles of 10 articles |
| Subsequent cycle duration, min / median / max | 4.55 / 6.18 / 14.87 seconds |

The first 10 NLP articles were chained by preprocessing, so there is no separate
top-level NLP job row for that first cycle. Job rows and HTTP timings represent
different boundaries. The 348.47 seconds excludes setup, live RSS fetching,
separate evolution, package construction and browser upload. It must not be
presented as a complete fresh-web-to-public-website duration.

After extraction, its server was stopped to release model memory. Evolution was
then triggered using the real browser's Processing confirmation control on the
same experiment data:

- Job: `9468bea4-4261-405b-81d4-b17c351906fd`.
- UTC start/end: `15:01:31.504469` / `15:01:52.949420`.
- Duration: 21.445 seconds; 1,536 claims; 77 clusters; 71 relationships.
- Types: 67 `SIMILAR_TO` and 4 `EVOLVED_FROM`.
- 55 similarity links connect claims within the same article. All 4 evolution
  links cross article boundaries. No invalid evolution parent-time ordering was
  found. Link validity/causality was not assessed by human annotators.
- `neo4j_sync_success=false`: expected because graph writes were deliberately
  disabled. PostgreSQL computation succeeded; Neo4j synchronization did not.

Similarity is not evidence of misinformation, copying or transmission. These
counts should not be reported as 71 verified propagation events.

## RAM, CPU and responsiveness

Windows native memory counters sampled the actual Python server child process,
not the small virtual-environment launcher. 343 samples were collected roughly
once per second during extraction.

| Metric | Observed peak / minimum |
|---|---:|
| Backend sampled resident working set | 2,125.52 MiB (2.076 GiB) peak |
| Backend OS working-set high-water mark | 2,171.87 MiB (2.121 GiB) |
| Backend private committed memory | 3,470.84 MiB (3.389 GiB) peak |
| Whole-system available physical RAM | 952.90 MiB (0.931 GiB) minimum |
| Whole-system memory load | Approximately 94% maximum |
| Evolution sampled resident working set | 873.74 MiB peak |
| Evolution private committed memory | 1,827.53 MiB peak |

Private commit is not physical resident RAM. System available memory includes
the effects of Docker, browsers and other applications. Subtracting it from total
RAM does not yield this application's usage. The run completed, but under 1 GiB
free memory leaves little headroom on this machine with the current other apps.

Late-run CPU samples (67 samples, not the entire run) gave a median 28.36% and
maximum 32.36% of total logical-processor capacity. There is no measured GPU
speedup or controlled CPU-versus-GPU comparison.

Concurrent local probes made 85 requests to each endpoint; all returned HTTP 200:

| Endpoint | Median | p95 | Maximum |
|---|---:|---:|---:|
| Health | 2.08 ms | 4.65 ms | 295.81 ms |
| Developer overview | 18.43 ms | 24.32 ms | 38.38 ms |

These are small localhost polling probes, not a multi-user load test or a public
latency guarantee. See the [resource and latency figure](../../output/deep-check-20261015/benchmark-overview.png).

## UI and access verification

| Check | Result and evidence boundary |
|---|---|
| Developer sign-in | Real form sign-in succeeded for approved account; both approved accounts were checked locally |
| Five console sections | Overview, Sources, Processing, Review and Publishing opened with actual database state |
| Progress while NLP runs | Completed/pending counts changed; job state visible; conflicting actions disabled |
| Source control | Al Jazeera paused, checked false, resumed, checked true in isolated DB |
| Processing confirmation | Real evolution executed after confirmation; cancellation covered by UI regression |
| Review totals | 500 processed, 500 NLP completed, 1,536 claims and later 71 relationships displayed |
| Mobile | 390 × 844 viewport; document width 382, no body horizontal overflow; viewport restored |
| Upload | Real 825,778-byte v1 snapshot accepted, 500 articles / 1,536 claims / 71 relationships |
| Replay | Same snapshot showed already uploaded; database contains one staged upload |
| Anonymous access | Developer overview and publication history returned 401 |
| Unapproved access | Ordinary user and unapproved admin denied console, history, upload and all four trigger endpoints with 403 |
| Concurrent run | A competing NLP start returned 409 |
| Invalid payload | 422 with sanitized errors; supplied sensitive marker was not echoed |
| Query constraints | Article text query returned 200; over-limit pagination returned 422 |

The real API denial/error matrix has 20/20 passing cases. It complements unit and
component tests; it is not a penetration test. Authorization depends on an active
stored administrator account plus the configured exact email allowlist. Merely
registering an allowed-looking email does not grant access.

The snapshot is staged only. It does not activate or replace a public dataset.
Its provenance contains model revisions, source baseline and a configuration/code
hash manifest because the working tree differs from the baseline commit. Full
article bodies, embeddings and account credentials are not in the snapshot.

Screenshots: [during processing](../../output/deep-check-20261015/screenshots/console-under-load.png),
[mobile](../../output/deep-check-20261015/screenshots/console-mobile.png),
[final review](../../output/deep-check-20261015/screenshots/final-review.png),
[upload replay receipt](../../output/deep-check-20261015/screenshots/upload-500-verified.png).

## AI/data integrity and research limitations

- All 1,536 claim vectors had 768 dimensions; norms ranged from
  0.9999998595 to 1.0000001363. No orphan claims or duplicate same-article claim
  texts were found in the extraction integrity checks.
- All 4,553 entity spans had valid offsets and matched their referenced text.
  This checks storage consistency, not whether the entity label is correct.
- Every extracted claim was a literal substring of the cleaned article text.
  That follows from the extractive implementation and does not establish truth.
- Three completed articles produced zero claims. One had no sentence meeting
  the candidate-length rule. A completed status therefore does not mean useful
  extraction occurred for every article.
- The implementation considers only the first eight qualifying sentences
  (30 < length < 400 characters). There were 2,352 qualifying sentences, of
  which at most 1,762 entered that first-eight window: 590 (25.1%) were excluded
  by the cap. Forty-four articles exceeded eight qualifying sentences. Other
  sentences are already excluded by the length rule.
- 137 claims (8.9%) begin with a pronoun/demonstrative pattern such as “They”
  or “This”. These need contextual review; the pattern is a risk indicator,
  not proof that all 137 are invalid.
- Confidence ranged 0.50–0.85 and is heuristic, not a calibrated probability.
- The local FLAN prompt's self-entailment-style filtering is not a validated
  factual-claim detector. Naive sentence splitting and concatenated summaries
  can create awkward or contextual fragments.
- Existing source corpus: 599 records had no raw text, 5,430 had raw length
  below 400, and 16 lacked publication time. These SQL categories overlap;
  missing/empty text must not be summed as mutually exclusive groups.
- Collection generally uses feed content/summary, not verified full article
  bodies. This sample's median cleaned length was only 555 characters.
- No precision, recall, F1, factual verdict accuracy, inter-annotator agreement,
  calibration score, ablation, held-out split or repeated-run confidence interval
  was measured. No accuracy percentage should be invented from completion rate.

## Live collection audit

Thirteen active configured RSS endpoints were fetched read-only with bounded
concurrency and timeouts. All 13 returned HTTP 200 and parsed without the recorded
malformed-feed flag; 422 feed entries were counted. This checks current network
and feed availability. Those entries were not inserted or included in the
500-article benchmark. It does not establish completeness, article-body quality,
copyright permission, all collector integrations or future feed availability.

Code inspection also found that RSS HTTP fetch failures can return an empty list.
That should become an explicit degraded/failed source result so zero new articles
cannot conceal an unavailable feed. Live source failures were not induced here.

## Changes and regression validation

During this verification the console was refined to display returned stage
outcomes (processed articles, claims, failures, clusters and relationships), warn
when graph synchronization is incomplete, expose the configured NLP cycle cap,
and explain stage chaining. The measured extraction algorithm was not changed.

Added component coverage for failed source switches, competing-job responses,
confirmation cancellation, busy-action locking and partial graph-sync results.

| Validation | Result |
|---|---|
| Backend regression suite | 510 passed; 8 PostgreSQL integration tests deselected |
| Real PostgreSQL integration suite, separate disposable probe DB | 8 passed; zero skips |
| Backend targeted tests after final overview-field change | 6 passed |
| Backend Ruff / mypy | Passed; mypy checked 162 source files |
| Frontend full suite after final refinement | 125 passed across 23 files |
| Frontend production build and lint | Passed |

Existing non-failing frontend warnings include a timeline module imported both
statically/dynamically and a telemetry test fixture warning. These were not
silently interpreted as failures or as evidence of public deployment health.

## Harness corrections and final local state

Early probe runs are retained separately and excluded from the authoritative
500-article result. One processed 50 articles before repeated harness logins hit
the five-attempt authentication limit; another startup hit its unexpired limit.
An early memory probe observed the venv launcher, which is not the ML process.
The final run reused a login and measured the actual child PID. Only exact
benchmark login-counter keys in Redis 13 were reset during harness preparation.

After all 500 completed, a Windows temporary-file rename was briefly blocked by
a concurrent reader. The complete temporary result was preserved and saved with
a retry. Final `results.json` has `completed=true`; there was no article rerun
to conceal a failed result. These scripts are one-off experiment harnesses with
run-specific process/database settings, not a supported production CLI.

The final review server uses the benchmark DB on API port 8002 and frontend 5050.
A cold restart initially returned semantic-search 503 because this custom harness
had not loaded the embedding model. Its launcher was updated to explicitly load
the cached embedding model before accepting requests, following the existing
local-serving pattern. Final verification is in `final-startup-checks.json`.
This does not add model loading to the lightweight cloud startup path.

Neo4j remains isolated; graph projection and strict all-datastore readiness should
not be described as passed in this environment. Main/public data was not activated
from the snapshot. No changes were pushed or deployed in this testing request.

## Prioritized follow-up

1. Improve article completeness and record full-text versus summary provenance;
   reject/quarantine unusable text and report zero-claim articles explicitly.
2. Replace the eight-sentence window with bounded document chunking; improve
   sentence segmentation, factual-claim selection and contextual/coreference
   handling. Evaluate these changes against labels before using them in a paper.
3. Have both authors label a balanced held-out set with a written rubric. Measure
   agreement and precision/recall; add baselines, ablations and confidence intervals.
4. Keep local models loaded safely across cycles; benchmark a separate compatible
   CUDA environment on this GPU. Do not replace the working CPU environment
   without checking dependencies and comparing measured outputs and memory.
5. Move long operations to a durable worker with progress, cancellation and
   recovery; synchronous HTTP calls currently have a finite UI timeout.
6. Complete supported snapshot export, explicit public activation, rollback and
   post-activation checks. Staging success alone is not daily publication.
7. Validate Neo4j projection against a separate graph database and test full
   public-hosted operation, concurrent users, crash recovery and repeated runs.

## Evidence index

Evidence root: `output/deep-check-20261015/` (local experiment artifacts).

- `dataset.json`: selected IDs, input digests and selection manifest.
- `analysis-config.json`: configuration and backend source hashes at run time.
- `results.json`, `memory.jsonl`, `cpu-gpu.jsonl`: extraction and resource evidence.
- `integrity-and-quality.json`: corpus audit and extraction integrity.
- `evolution-result.json`, `evolution-memory.jsonl`, `final-checks.json`: separate
  relationship run, memory, relation-type counts and control checks.
- `api-checks.json`, `live-source-audit.json`: API denial matrix and read-only RSS audit.
- `publication-500.json`, `publication-manifest.json`: actual staged snapshot and provenance.
- `backend-tests.*`, `integration-tests.*`, `frontend-*.log`: regression evidence.
- `benchmark-overview.png` / `.pdf`, `screenshots/`: visual evidence.
- `evidence-sha256.json`: hashes of selected evidence files (excludes itself,
  large scratch dependencies and account credentials).

The local evidence directory is not a public data release. Do not commit private
credentials, raw private data or scratch plotting dependencies. Database clones
and artifacts are retained for inspection; cleanup can follow after review.
