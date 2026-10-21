# External news confirmation: access review

**Checked 20 October 2026. Status: human-gold access and rights remain unverified.**

This follow-up to [PUBLIC_BENCHMARK_AUDIT.md](PUBLIC_BENCHMARK_AUDIT.md) checks whether an untouched external news evaluation can be made concrete. It does not add an experimental result or change the VitaminC analysis.

## Decision

The inspected public sources do **not establish access to the complete NewsEdits 2.0 human-annotated benchmark, its official split membership, or its file-specific reuse terms**. A previously overlooked author repository contains an annotation interface and three small annotation-output files. Those files cannot be presumed to be the paper's benchmark. No external test should run against them under a “NewsEdits 2.0 gold” description.

This is an access-verification result, not proof that the complete dataset is unavailable anywhere. Continue the narrow VitaminC paper and its reconstruction while seeking the exact release information. Preserve the external-data gate rather than creating replacement “human” labels.

## Evidence inspected

| Source and pinned state | Verified observation | Consequence |
|---|---|---|
| [`alex2awesome/edit-intentions-pub`](https://github.com/alex2awesome/edit-intentions-pub/tree/8426f86385d4a4e3e4097aee4a3f222079a47b06), commit `8426f86385d4a4e3e4097aee4a3f222079a47b06` | The complete, non-truncated Git tree has three files matching `data/output_data/output-annotation-*.json`: indices 0, 1 and 2, of 2,019, 3,380 and 3,086 bytes. The tree also contains three sampled/downsampled source JSON files, interface assets, instructions, and Flask code. No README, LICENSE, dataset card, or train/dev/test split manifest was found. The repository API returned a null license field. | File names establish an interface output location, not annotation provenance, completeness, adjudication, or official test membership. Contents of the six data JSON files were not opened. |
| Same repository, branch/release metadata | Only `main` was returned by the branches endpoint; the releases endpoint returned no releases. Repository metadata recorded last push `2023-02-07T00:46:18Z`. | No alternative packaged release was identified through those endpoints. Dates alone do not establish the relationship to the later paper. |
| Pinned [`main.py`](https://github.com/alex2awesome/edit-intentions-pub/blob/8426f86385d4a4e3e4097aee4a3f222079a47b06/main.py) | It loads `data/data-downsampled.json`, renders article-version annotation tasks, marks document keys completed using prior output, and saves submitted JSON into numbered annotation-output files. It contains no benchmark split construction or complete-release identification. | This is evidence of annotation tooling. It does not verify that committed outputs were produced by the paper's trained journalists. |
| [`isi-nlp/NewsEdits`](https://github.com/isi-nlp/NewsEdits/tree/34ebd0f1f52412daa77ef6bc6250aca08c57ddb6), commit `34ebd0f1f52412daa77ef6bc6250aca08c57ddb6` | Its README identifies the 2022 NewsEdits project, links a Google Drive folder of preprocessed source corpora, and supplies a contact for data requests. Its tree has no NewsEdits 2.0 human-gold/split manifest or LICENSE file. | The underlying revision corpus is not evidence of human edit-intention gold. The Drive folder could not be inventoried through the web tool in this audit; its full contents remain unchecked. |
| [Author research page](https://www.alexander-spangher.com/research.html?lens=cs) | The NewsEdits 2.0 entry links the arXiv paper; no gold dataset or code link was attached to that entry in the inspected page. | No new release route was verified there. |

GitHub's repository, branch, release, and recursive-tree APIs supplied metadata only. Relevant code was read directly at the pinned commit. Additional author-repository trees were checked by name and metadata: `edit-events` at `2cf06d17da288caaf06b432334f00636373ecfd4`, `edit-pathways` at `4cbf7391689b5f570d734d6acd706a9b6aa36146`, `news-edit-source-credibility` at `aef3ddcafb5b2f4848450dc17f5942ef073a7497`, and `style-guide-edits` at `8d4124250f1af37541d52f2338e840e12e89becd`. These searches did not identify a complete human-gold release manifest. Notebook outputs and possible data files were not opened. A Hugging Face dataset metadata search for `NewsEdits` returned no entries; this is not an exhaustive search of alternate dataset names.

## Task, split, and rights verdict

The paper reports professional annotation of 9,200 sentence revision pairs across 507 article revision pairs. Its first task labels observed edits using both versions and article context; intentions can be multilabel, and additions/deletions can have an empty side. Its second task forecasts future factual updates from an **older version alone**, using silver training data and human test data. The stated chronological 80/20 split belongs to that forecasting training/development construction; it does not supply executable membership for the human edit-tagging benchmark. Section 7.1 describes the underlying NewsEdits corpus as AGPL-3.0 and mentions permission from its creators, but does not resolve the exact annotation files' terms. [NewsEdits 2.0, Sections 1, 3, 4 and 7](https://arxiv.org/html/2411.18811v1).

| Gate | Verdict for the proposed GMEE follow-up |
|---|---|
| Human provenance | Plausible from the paper, unverified for the accessible JSON outputs. Require the authors' exact human release and provenance description. |
| Task match | Conditional for retrospective **factual edit-intention detection**. Define any binary reduction from the actual schema before scoring. It would not validate GMEE's relatedness classes, typed spans, contextual correction judgments, or future-update forecasting. |
| Split | Unverified. Require article/revision identifiers, official partitions and their construction. Never split sentence pairs randomly across an article history. |
| Rights | Unresolved for the actual gold package, article text, and derived releases. A public repository and a null API license field are not an affirmative data license. Obtain the applicable terms before making a release decision. |
| Untouched status | Repository data contents and annotation outputs remain unopened in this audit. Published paper illustrations and example text were visible in automatically returned paper excerpts. A future protocol must disclose that exposure and identify/exclude published example overlaps where possible before calling its evaluation untouched. |

## Concrete next step

Prepare the following information request for a human author to approve and send, or satisfy it through a newly verified public release. **No message has been sent.**

> Please identify the versioned NewsEdits 2.0 human edit-intention annotation release corresponding to the paper's 9,200 sentence pairs and 507 article revision pairs. We need the schema and labeling provenance, article/revision identifiers, official train/development/test manifests, separation of human and silver labels, and applicable terms for research use and redistribution of text, annotations, identifiers and predictions. Does `alex2awesome/edit-intentions-pub` contain only interface examples, or any portion of the evaluated benchmark?

If a release becomes available, first hash the unopened package and inspect its metadata/schema in a controlled ingestion step. Then freeze an exact external protocol: eligible ordered revision pairs, empty-side and incorrect-link handling, multilabel-to-binary target if justified, article/history and syndicated-text groups, overlap exclusions, fixed model comparison, selection policy, primary metric and paired group uncertainty. Only afterward expose the held-out rows to the frozen scorer. Preserve the outcome whether complementary value survives or not.

The current local paper can report its completed VitaminC evidence without claiming that this external confirmation has happened. A broader natural-news contribution still needs the appropriate gold, rights, and evaluation.
