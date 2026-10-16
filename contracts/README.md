# Compatibility contracts

These are checked interfaces, not deployment credentials or example datasets.

- `local-api-v1.routes.json`: public API methods and paths in `app.main:app`.
- `cloud-api-v1.routes.json`: methods and paths in `app.cloud:app`.
- `publication-v1.schema.json`: JSON Schema for an existing publication-v1 file.

From `backend/`, run `python -m scripts.check_contracts --mode local`, then
`--mode cloud` and `--mode publication`. The CLI uses inert fixture settings and
does not start application lifespan or connect to stores. The cloud mode needs
the cloud dependency lock/psycopg; local mode needs the local dependency profile.

To propose an intentional change, use `--write` for the relevant mode and review
the diff in the same PR. Keep existing API paths or provide an explicit additive
migration. Do not change publication-v1 semantics to reinterpret older releases;
introduce a versioned format and compatibility path for a breaking change.

These snapshots protect route presence and the publication envelope. They do not
replace authentication tests, response-contract tests, migration rehearsals or
scientific provenance. Regenerate them only for reviewed interface changes.
