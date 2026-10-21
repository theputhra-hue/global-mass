# VitaminC real factual-revision flagging: release audit

Checked **19 October 2026** against the [authors' repository](https://github.com/TalSchuster/VitaminC), the [NAACL 2021 paper](https://aclanthology.org/2021.naacl-main.52.pdf), and the downloaded flagging archive. This is a data and split audit, **not** a GMEE experiment. This audit did not inspect test labels or model outcomes; test text was accessed only for schema, blankness, and exact split-overlap checks, with no examples displayed or semantically analyzed.

## Task and annotation provenance

The appropriate external target is binary **factual revision flagging** of a before/after Wikipedia sentence pair: whether an edit changes what some claim could support or refute. It does not label GMEE's three-way relatedness, numeric/temporal change type, correction context, or exact human-selected changed spans. The separate `vitaminc_real` and `vitaminc_synthetic` names in the README refer to fact-verification test sets; the [flagging download](https://github.com/TalSchuster/VitaminC#revision-flagging) is its own archive of real Wikipedia revisions. [Paper §4.1](https://aclanthology.org/2021.naacl-main.52.pdf) defines the binary task; the sentence diff fields are derived edit representations, not human type/span gold.

The flagging labels have a genuine human source, with a sampling caveat: the authors mined revisions, used a BERT classifier to select roughly 305,000 candidate sentence edits, then had trained humans mark factual changes and filtered pairs lacking self-contained context. The paper reports **304,671 reviewed** and **107,056 factual** edits. Those are paper counts, not the downloaded archive's counts. The released JSONL files contain **304,670 rows** in total, one fewer than the reported reviewed count. The 70-person claim-writing/review process and the four-annotator Fleiss κ = 0.7065 check on 2,000 **claim–evidence** pairs do **not** establish multiple independent judgments or agreement for every flagging label. The paper does not state a flagging-specific agreement statistic. Sources: [paper §§3.1–3.4 and Appendix A.2](https://aclanthology.org/2021.naacl-main.52.pdf).

This is a **model-preselected** sample from English Wikipedia, not a random sample of all revisions or natural news. The paper describes mining popular and linked pages, FEVER pages, and COVID-19 pages, and explicitly notes a strong quantitative-edit concentration. Any GMEE finding here would be a Wikipedia factual-revision component result, not evidence of end-to-end news claim evolution or truth/causal propagation. [Paper §§3.1 and A.1](https://aclanthology.org/2021.naacl-main.52.pdf).

## Source and frozen bytes

The authors' README links the mutable `master` download at `https://github.com/TalSchuster/talschuster.github.io/raw/master/static/vitaminc_flagging.zip`. At audit time, the data host's `master` was `152c9639f1e33ca295d0776b618c17884088f72f`; the [commit-pinned file](https://raw.githubusercontent.com/TalSchuster/talschuster.github.io/152c9639f1e33ca295d0776b618c17884088f72f/static/vitaminc_flagging.zip) has Git blob ID `0143d07f6ed0a72320742290627c16603ccd2f9d`, matching `git hash-object` of the downloaded ZIP. The mutable and pinned downloads had identical SHA-256. The ZIP is 51,778,363 bytes, SHA-256 `7e13400c6c2f1aeca8a084eedbdbb3dff797d3660c93b9229fdeb85ebd82006e`. The authors' code repository `HEAD` at audit time was `eb532922b88b199df68ed26afeb58dca5501b52f`.

| Archive member | Bytes | Rows | SHA-256 |
|---|---:|---:|---|
| `train.jsonl` | 181,062,596 | 236,998 | `9ed654d11db34be1918af0abe83df348f462daefbdf1ee6a521ae7682ab3277b` |
| `dev.jsonl` | 27,961,722 | 36,624 | `fd1e6a3c15d53b7529e5c04533619c1ffa6091435aa6864842fe2f0e47363733` |
| `test.jsonl` | 23,819,197 | 31,048 | `0e1094b357d72716febc75ebccf24581b558d0a3e6ae69c23d23f892aeed3a3a` |
| `LICENSE` | 513 | — | `e5727854e203fc66d725caa6d8e97e541f64a906d1d15d19e63f32bb52134dd1` |
| `README.txt` | 198 | — | `aecc6e74b43865b1c8a3c9e044a296644badbf4ffd81adbb6d0ffc80a26256cd` |

All data remain in `.local-deployment/research-data/vitaminc/`, which `git check-ignore -v` confirms is ignored by `.gitignore:84`. No raw dataset text has been added to Git or the application database.

## Schema and split integrity

Every JSONL row parses with the same nine string fields: `case_id`, `wiki_revision_id`, `label`, `sent_a`, `sent_b`, `diff_viz`, `sent_a_diff`, `sent_b_diff`, `page`. `page` is a title string, not an immutable Wikipedia page ID. The available labels in **train/dev only** are `factual` and `not factual`; this audit deliberately did not inspect test label values. There is no annotator ID, label revision history, event ID, timestamp, or explicit natural/synthetic flag in these records.

| Integrity check | Train | Dev | Test |
|---|---:|---:|---:|
| Distinct `page` titles | 32,492 | 4,149 | 4,207 |
| Distinct `wiki_revision_id` values | 206,293 | 29,091 | 26,698 |
| Duplicate `case_id` rows | 0 | 0 | 0 |
| Rows with either sentence blank | 1,937 | 271 | 247 |
| Duplicate unordered exact sentence pairs *within* split | 24,730 | 5,854 | 3,406 |

Duplicate counts are repeated rows after the first instance of each exact pair. For the VitaminC claim–evidence data, the authors report random splitting by article, consistent with FEVER where articles overlap ([paper §3.4](https://aclanthology.org/2021.naacl-main.52.pdf)); the paper does not separately document flagging split construction. In the flagging archive, raw `page` title sets have **zero** cross-split intersections. Integrity checks nevertheless found these overlaps:

| Split pair | Same title after trim/underscore/space/case normalization | Same `wiki_revision_id` | Same unordered exact sentence pair |
|---|---:|---:|---:|
| Train–dev | 0 | 36 | 145 |
| Train–test | 1 | 42 | 138 |
| Dev–test | 0 | 0 | 31 |

The exact-pair counts compare full `sent_a`/`sent_b` text in either order, without using labels. For train–test, 133 of the 138 shared pairs have both sentences nonempty. Revision IDs are [unique identifiers for revisions](https://www.mediawiki.org/wiki/Manual:Revision_table/en), so their recurrence under disjoint title strings is a more direct leakage warning than generic repeated sentence text. The train split itself has 106 revision IDs associated with more than one title. Page moves/aliases or release construction may explain some cases; the audit has not traced them to canonical page IDs. One normalized title also intersects train and test.

Using only unlabeled identity/text checks, **234 dev rows** overlap train on at least one of normalized page, revision ID, or exact unordered pair; **220 test rows** overlap train or dev on the same union. Blank before/after sentences can represent additions/removals, which are within the authors' task definition; discarding them changes the target population. Any exclusion, primary clean subset, and secondary full-release score must be fixed **before** opening test labels. The split check does not detect near-duplicate text, renamed articles beyond simple normalization, or shared events across distinct pages.

## Rights and usage

The archive's `LICENSE` and current repository [DATA_LICENSE](https://github.com/TalSchuster/VitaminC/blob/main/DATA_LICENSE) say these annotations incorporate Wikipedia material and follow applicable page terms, with CC BY-SA 3.0 as a fallback; synthetic annotations also use FEVER material. The repository's MIT **code** license is not a blanket data license. Keep raw text in ignored local storage; review Wikipedia attribution and share-alike duties before redistributing examples or a derived dataset. This audit reports counts and hashes only.

## Verified local commands and next gate

Run from `E:\global-main\global-mass-integration` in PowerShell. Both the authors' mutable link and this pinned URL were downloaded and matched byte for byte; verify the SHA-256 before extraction.

```powershell
$root = '.local-deployment\research-data\vitaminc'
New-Item -ItemType Directory -Force -Path $root | Out-Null
Invoke-WebRequest -Uri 'https://raw.githubusercontent.com/TalSchuster/talschuster.github.io/152c9639f1e33ca295d0776b618c17884088f72f/static/vitaminc_flagging.zip' -OutFile "$root\vitaminc_flagging.zip"
Get-FileHash -Algorithm SHA256 "$root\vitaminc_flagging.zip"
git hash-object "$root\vitaminc_flagging.zip"
Expand-Archive -LiteralPath "$root\vitaminc_flagging.zip" -DestinationPath "$root\extracted"
Get-ChildItem "$root\extracted\vitaminc_flagging" -File | ForEach-Object { "$($_.Name) $($_.Length) $((Get-FileHash -Algorithm SHA256 $_.FullName).Hash)" }
python -c "from pathlib import Path; d=Path('.local-deployment/research-data/vitaminc/extracted/vitaminc_flagging'); print({p.name:sum(1 for _ in p.open(encoding='utf-8')) for p in sorted(d.glob('*.jsonl'))})"
git check-ignore -v "$root\vitaminc_flagging.zip"
git ls-remote https://github.com/TalSchuster/talschuster.github.io.git HEAD
```

The local ignored `audit_flagging.py` computed schema, blank-text, and overlap counts by streaming JSONL. Its test branch never counts or prints labels. Before a paper score, commit a reviewed, text-free integrity/preprocessing script and frozen manifest, predefine the overlap exclusions and primary metric, then score the sealed test labels once. Any protocol that uses the official full test set should also disclose the overlaps above.
