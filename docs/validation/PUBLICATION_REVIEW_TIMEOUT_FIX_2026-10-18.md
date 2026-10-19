# Publication review timeout correction

The user reported "Upload failed / Request timed out after 15s" after the real
analysis file had already been uploaded. A fresh authenticated live API read
confirmed staged run `0cc697f0-1089-4d96-905a-f6f718789ec8`, matching SHA-256,
7,421 articles, 5,157 claims and 300 relationships. Active public revision was
still 1 (`8121d828-a47e-47cc-b5f6-a578984b694d`). No repeat upload or activation
was performed during this correction.

Two problems were addressed locally:

- The UI used the same pending/error labels for upload, review and publication.
  A read-only review timeout therefore appeared as "Upload failed", alongside
  the successful upload receipt. Operations now have separate labels, review
  timeouts explain that saved data is unchanged, and review retry only repeats
  the GET. Upload/publication errors retain explicit uncertain-outcome guidance
  and are not automatically retried. Manual upload-history refresh is available.
- The review API loaded the full staged JSON into Python/over the database
  connection to show counts and five samples. It now projects only counts,
  identifiers, provenance and up to five articles/claims in SQL. The wire contract
  and publication fingerprint/revision checks are unchanged. The original file
  remains intact and publication still validates it separately.

Verification: 278 frontend tests in 39 files pass, including a forced review
timeout followed by a safe read-only retry; 23 publication/status/reader backend
tests pass, including bounded sample counts and an assertion against selecting
the full payload column. ESLint, TypeScript/build, backend Ruff/mypy and both
architecture checks pass. Vite's existing main-bundle size advisory remains.

Using the existing developer account against the updated local cloud-profile
API and real staged release, a measured review completed in 1,901 ms, returning
6,336 bytes, correct counts and five samples of each type. This is one observed
request, not a latency guarantee. The 15-second review timeout was not increased.
The local API was restarted and the updated frontend built for localhost:3000.
Browser verification opens the same staged review without selecting/uploading
a file or publishing. The original source corpus remains unchanged.

This is a local source/runtime fix. No commit, push, Render deployment or public
release activation was performed. The hosted frontend/backend retain their
previous code until explicitly deployed.
