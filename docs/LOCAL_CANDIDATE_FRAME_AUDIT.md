# Local claim-pair candidate frame audit

**Status: exploratory inventory, 19 October 2026.** This is a preparation artifact for a paper pilot. It contains no human gold, curated event identity, train/dev/test split, or finding about system accuracy. The files remain local and Git-ignored; do not publish the URLs, identifiers, or derived records before the source-rights review.

## Verified snapshot

The current export is `publication-outbox/candidate-frame-20261019-v3.jsonl` and its adjacent `.manifest.json`, produced from the configured local backend database `gmee_recovered_20261014_125749_42877642`. The exporter is `backend/scripts/export_candidate_manifest.py` at Git baseline `aa0056c3e81a012b942c4a1fc9cb278feaa5c3f8` plus the working-tree changes. The v2 export is retained separately; v3 records have the same payload hash, while v3 records the stronger transaction and missing-value checks.

| Evidence | Verified value |
|---|---|
| Snapshot time | `2026-10-19T04:01:20.475966+00:00` |
| PostgreSQL snapshot ID | `1527:1527:` |
| Isolation / access | `repeatable read` / `read only` |
| Source corpus | 10,879 articles; 10,254 claims |
| Source pair rows / exported rows | 1,271 / 1,271 |
| JSONL SHA-256 | `da7ba9f5a7f0a970de0420b7dd8f7b50743067f6536c27c1fb01993c682f3476` |
| Exporter SHA-256 | `4b5cbbc569eed5c66f873ddeda58c1e68c34e01d94940530c08b2f159015aa3c` |
| Pair ID SHA-256 | `39f4ad358c705ce83ebfd4d9beaa25806292fdd39e4bf07b3b0815fb176bf483` |
| Sampling provenance | 1,271 empty objects; zero nulls |

The exporter uses the existing `snapshot_session`, which establishes a PostgreSQL repeatable-read, read-only transaction. It records and checks those live transaction settings and refuses an incomplete join if the exported row count differs from the source `eval_pairs` count. The manifest contains the database identity and snapshot timestamp, counts, file and exporter hashes, bucket support, and explicit limitations. Records contain IDs, publication dates, source/domain/URLs, article and claim hashes, stored similarity metadata, and duplicate hints. They omit article and claim text, all votes, and all event/split assignments. Claim text is read transiently for hashing. Exact and normalized claim hashes are distinct fields. A missing article content hash cannot count as an equal-hash duplicate hint; a null sampling provenance remains null rather than becoming `{}`.

Reproduce from the repository root with the configured backend container; this prints no credentials and writes only local artifacts:

```powershell
docker cp backend/scripts/export_candidate_manifest.py gmee-local-backend-1:/app/scripts/export_candidate_manifest.py
docker exec gmee-local-backend-1 sh -lc 'python scripts/export_candidate_manifest.py --output publication-outbox/candidate-frame-20261019-v4.jsonl --snapshot-id candidate-frame-20261019-v4'
docker cp gmee-local-backend-1:/app/publication-outbox/candidate-frame-20261019-v4.jsonl publication-outbox/candidate-frame-20261019-v4.jsonl
docker cp gmee-local-backend-1:/app/publication-outbox/candidate-frame-20261019-v4.jsonl.manifest.json publication-outbox/candidate-frame-20261019-v4.jsonl.manifest.json
Get-FileHash publication-outbox/candidate-frame-20261019-v4.jsonl -Algorithm SHA256
```

Use a fresh ID because the exporter refuses overwrites. `.gitignore` covers `/publication-outbox/`. The focused test is `py -3.14 -m unittest tests.test_export_candidate_manifest -v` from `backend`; it passed. The v3 manifest's data and exporter hashes matched the copied host files, and 1,271 JSONL lines matched both the manifest and source pair count.

On 21 October 2026, release preparation parenthesized an intentionally joined
limitation string to satisfy pinned Ruff ISC004. Python AST comparison confirmed
that the exporter behavior is unchanged. The current exporter SHA-256 is
`d7adfecbe088a107803f8d0895ecd70bab06c224eddf3d330f953e7676ec8a76`;
the historical v3 exporter hash above still identifies the source used for that
snapshot. Its original bytes are preserved locally under the ignored
`.local-deployment/release-preflight/backend/scripts/` directory. No candidate
snapshot was regenerated or changed during this repair.

## Candidate-frame limits

The 1,271 pairs were selected into cosine buckets, with old cross-outlet preference and a hash-limited claim pool. Every stored sampling provenance is `{}`, so the historical selection probabilities and exact embedding revision cannot be reconstructed from the rows. The bank is **not** a probability sample of natural within-event claim changes. Bucket totals are `b00=400`, `b40=399`, `b60=206`, `b75=121`, `b85=121`, and `b95=24`. Cross-source counts in those buckets are respectively `400`, `399`, `154`, `25`, `6`, and `2`; the high-similarity strata are overwhelmingly same-source. A score bucket cannot substitute for an event or a human label.

Descriptive duplicate and timing hints from v3: 54 same-article pairs, 54 equal nonempty article hashes, 57 same canonical-article hints, eight normalized-identical claim texts, and 285 same-source pairs. There are 665 cross-source pairs within seven days, but temporal proximity does not establish shared events. Another 127 pairs are more than 30 days apart. In 204 pairs at least one article language field is missing; **none** has an explicit non-English code. Thirteen sources appear in the frame. These are frame diagnostics only, not task prevalence or model performance estimates.

Live read-only checks also found all 1,271 pairs at `event_group=unassigned` and `split=unassigned`. The database has nine human votes on nine pairs from one authenticated reviewer and 3,826 legacy votes. It has no two-person consensus for this task. None of those labels is exported here. The latest machine cluster may help triage a pilot, but it must not define event truth or a held-out split.

The `sources` table has no license or redistribution-rights field. Feed availability and article URLs do not grant a text-release right. Every exported pair is marked `rights_status=unreviewed`; each source and any proposed public artifact needs a separate rights decision. Until then, keep the snapshot local and use only permitted IDs, links, hashes, or derived features for an external package.

## Next data action

Review source rights and manually curate event identities on a selected pilot frame before requesting independent annotations. Select across source/time and similarity strata, including plausible same-event cross-source pairs and unrelated controls. Record each inclusion rule, exclusion, duplicate decision, and pilot count in a new versioned manifest. Keep event curation independent of the machine cluster and preserve all old unlabeled candidates. The pilot can assess rubric clarity and support, but publication gold still requires at least two independent human judgments per pair under the agreed rubric.
