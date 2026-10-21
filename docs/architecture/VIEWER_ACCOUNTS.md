# Read-only visitor accounts

Website accounts use email-shaped login identifiers; they do not create email
inboxes or deliver mail. The operator provisions the `viewer` role separately
from public signup. Public signup continues to create ordinary `user` accounts.

## Permissions

Viewers can search published articles, inspect saved claims and assessments,
open topic coverage and timelines, explore the story map and recorded graph,
and read methods. They cannot run comparisons or evidence checks, save notes,
upload data, publish releases or access developer controls.

`get_current_user` reads the current database role for each authenticated
request. It denies every method other than GET/HEAD/OPTIONS for viewers, with
one explicit exception for POST `/api/v1/auth/logout`. Login and refresh have
their own credential checks and remain available. An elevated role in an older
JWT cannot override the database restriction. Developer reads still require
the existing admin role and email allowlist. The UI hides editing destinations,
guards direct links and replaces inline analyzer forms with a viewing notice.

Viewing can still create authentication sessions, audit entries and ordinary
read caches. Read-only describes research data and analysis permissions; it
does not disable session lifecycle or server observability.

## Provisioning and release order

1. Test and deploy the viewer-aware API and frontend. The API startup runs the
   additive `gmee10` PostgreSQL enum migration; it changes no existing accounts.
2. Confirm the new API is serving before provisioning viewer rows. Older API
   versions cannot deserialize the new enum value.
3. Load the target database configuration privately into the operator process.
   Run `backend/scripts/create_viewer_accounts.py` with repeated `--email` flags
   and an absolute `--credentials-file` outside the repository, in an OS-protected
   directory. The script generates independent random passwords and stores
   Argon2 hashes in the database. It does not expose a provisioning HTTP route.
4. Keep the same private credentials file for retries. Provisioning verifies
   existing active viewers against that file and refuses mismatched accounts,
   inactive users or existing non-viewer roles. It never resets passwords.
5. Verify `/auth/me` reports `viewer`, published data loads, authenticated
   mutations return 403, developer access is false, and logout works. Compare
   publication revision and run ID before and after the operation.

Do not commit credentials, include passwords in command-line arguments, or
publish shared login credentials on the landing page. The enum downgrade is
deliberately blocked until an operator explicitly handles existing viewer rows;
it must never silently grant them ordinary-user permissions.

## Validation for the initial implementation

- Backend: 691 unit/regression tests passed, including actual JWT/database
  authorization against both runtime profiles and provisioning retry checks.
- Frontend: 344 tests passed; the common desktop/mobile navigation and inline
  analyzer restrictions have dedicated checks. Lint, production build, strict
  backend typing, route contracts and architecture checks pass.
- A real PostgreSQL integration regression checks the migrated enum can store
  and deserialize a viewer. This runs in backend CI against its disposable
  PostgreSQL service.
- Local browser rehearsal uses a separate fixture account and the isolated
  published-data database. Production provisioning and deployment are verified
  separately; passing tests alone does not establish live account availability.
