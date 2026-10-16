# Working on GMEE

Start from current `main` and use a short feature branch. Fetch before starting
and merge/rebase current main before review; do not replace another developer's
work with an older folder or force-push shared branches. Resolve conflicts by
responsibility and verify combined behaviour rather than choosing an entire side.

## Boundaries

- `frontend/src/app`: routing and composition; no business API implementations.
- `frontend/src/features`: reader, developer and research capabilities.
- `frontend/src/shared`: transport, session, reusable UI and utilities. Shared
  code must not import feature pages or the application entrypoint.
- Backend HTTP adapters validate/authorize and delegate to services. Local AI
  adapters are separate from published-result operations.
- `app.main:app` and `app.cloud:app` remain stable entrypoints. Cloud must import
  no heavy AI libraries or pipeline execution routes. Research examples must not
  be inserted into the published corpus or used as human evaluation labels.

## Change discipline

1. Read the current architecture and relevant module documentation.
2. Keep path-only moves and behaviour changes in separate commits.
3. Preserve route/API/format contracts; describe intentional changes and migration.
4. Run checks appropriate to the touched layers and record actual results.
5. Open a PR with the problem, resulting behaviour, tests and remaining limits.
6. Merge only after checking CI for the exact reviewed head. Verify deployment
   after merge; a pushed branch is not evidence that the live site changed.

Do not commit `.env`, account credentials, exported private data, model weights,
database dumps, generated logs, local environments or copied source checkouts.
Keep frozen research artifacts and migrations intact. Folder `1/` is an untracked
historical comparison copy; it is not a second active application or a merge source
to overwrite the current checkout with. Review unique logic before archiving it.

## Verification

- Frontend: `npm ci`, `npm run lint`, `npm test`, `npm run build` from `frontend/`.
- Backend: install the existing local lock/dev profile, then `pytest`, Ruff and
  strict mypy from `backend/` (see CI for the current exact commands).
- Interfaces: `python -m scripts.check_contracts --mode local`, `--mode cloud`
  and `--mode publication` from `backend/`.
- Cloud isolation: install `backend/requirements-cloud.lock` in a fresh environment
  and run `python infra/scripts/check_cloud_runtime.py` from the repository root.
- Infrastructure: `python -m unittest discover -s infra/tests` and the deployment
  validators. Real database/model tests have separate opt-in profiles.

Never run migrations, data imports or model preparation merely to check an import
or page layout. Use disposable fixtures for tests and explicitly rehearsed backups
before an intended database upgrade. Follow `TASK_SHEET.md` for outstanding work.
