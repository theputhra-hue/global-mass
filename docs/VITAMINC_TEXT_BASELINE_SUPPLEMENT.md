# Supplementary sparse text baseline — fixed before its test scores

**19 October 2026.** The primary lexical-versus-GMEE test result is already known.
This is a transparently supplementary comparison; it does not amend the original
analysis freeze or create a new confirmatory hypothesis. The baseline addresses
the weakness of comparing against only eight lexical summary features. The
authors' original bag-of-words and ALBERT results establish why a richer text
comparison matters, but their published scores are not same-row measurements.

Use the same official training rows, the same 234-row dev quarantine, and the
same frozen primary test eligibility as the original experiment. Input consists
only of the two raw sentences. Extract removed and added lowercased word tokens
from a deterministic SequenceMatcher alignment (autojunk disabled); replacements
contribute both removed and added tokens. Mark each token with its old/new side.
Use a TF-IDF vectorizer with word unigrams and bigrams, minimum document frequency
3, maximum 100,000 features, sublinear term frequency, L2 row normalization, and
training-only vocabulary/IDF. The empty edit string has the zero vector.

Fit L2 logistic regression, liblinear, max_iter 1000, seed 1729, no class weights.
The fixed C grid is {0.1, 1, 10}; select clean-dev AUROC (ties rounded to 12 decimal
places choose smaller C). Select a descriptive classification threshold by
clean-dev macro-F1 on 0.00..1.00 in steps of .01, ties choosing the larger value.
Freeze the fitted pipeline, script, configuration, data digests and this plan
before predicting test. Do not retrain or change the vocabulary/grid in response
to test performance. This is our sparse edit baseline, not a reproduction of the
authors' neural bag-of-words model.

Score the same 30,828 clean test rows and the full 31,048-row release. Report
AUROC, average precision, macro-F1, Brier, log loss and confusion with support;
report the primary-clean augmented-minus-sparse AUROC difference with the same
2,000 paired normalized-page draws, seed 20261019, as a **descriptive** interval.
Do not apply the primary material-gain decision rule as an additional discovery.
Keep every prediction and the first test-access marker. Any failed inference or
changed plan after test access must be disclosed. Record train/dev and inference
wall time separately; do not infer an efficiency advantage from different
hardware or workloads.
