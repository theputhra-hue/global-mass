# Visitor registration and developer approval

## Visitor experience

A visitor chooses **New to GMEE? Create an account**, enters a full name, email
and password, then chooses **Request access**. Registration creates an active
login with `role=viewer` and `access_status=pending`. The visitor can sign in,
check approval, rotate a session and sign out, but cannot see collection data.

The waiting page checks `/auth/me` every 15 seconds while pending. When a
reviewer approves the account, the same session enters the viewing workspace.
Signing in again later also works. A declined account sees its decision and
continues to have no data access. No automatic email delivery is configured.

Names are required, trimmed and limited to 120 characters. Passwords retain
the existing Argon2 hashing and complexity rules. Duplicate registration never
changes an existing identity. Client-supplied role, approval or legacy
`read_only` flags cannot bypass review or request a writing role.

## Developer experience

Open **Manage data → Account management → All accounts** on the developer dashboard.
The default directory includes every registered email across all roles, including
developers, researchers, legacy users, viewers and disabled accounts. Each row
shows the name, email, role, active state, approval state and registration time.
Use the Show selector for pending, approved, declined, paused or banned accounts.
Active viewers and legacy users have **Allow viewing**, **Pause access** and
**Ban account** controls. Each action requires confirmation of the affected email.
Pending viewers also have **Decline request**. Developer/researcher accounts, the
acting developer and disabled identities are protected on the server and in the UI.
Lists are paginated and refresh every 30 seconds; status counts cover all roles.
Passwords and password hashes are never returned.

Only active, approved administrators whose emails are in the existing
`DEVELOPER_UPLOAD_EMAILS` allowlist can list/review accounts. Review records the
reviewer ID, timestamp, decision and incremented revision. A compare-and-swap
update permits one decision for a pending viewer: stale tabs and simultaneous
reviewers receive 409 and cannot overwrite an earlier decision. Review cannot
promote visitors, alter developer/researcher identities or reactivate disabled
accounts. **Allow viewing** sets the role to viewer, including legacy user accounts,
so restoring access never grants editing permissions. **Pause** blocks data access
and revokes sessions but permits a new sign-in to the status page. **Ban** blocks
sign-in and data access and revokes sessions. Both are reversible with Allow.
A banned identity cannot be changed to paused to bypass its sign-in restriction. There is no bulk approval or automatic approval.

## API boundaries

- `POST /api/v1/auth/register`: name/email/password → pending viewer + normal
  in-memory access tokens and server-verified tab reload recovery (see
  [session design](RELOAD_SESSION_RECOVERY.md)). `GET /auth/me` includes `access_status`.
- `GET /api/v1/developer/accounts`: developer-only directory of all roles and active states;
  `access_status=all` (default), pending, approved, rejected, paused or banned; defaults to 20,
  maximum 50 per page. Nonnegative offsets allow paging through the entire directory.
  Responses add `is_active` on each row and `counts.all` for the complete total.
- `POST /api/v1/developer/accounts/{id}/review`: developer-only decision with
  `decision=approve|reject` and `expected_revision`.
- `POST /api/v1/developer/accounts/{id}/control`: developer-only action with
  `action=allow|pause|ban` and `expected_revision`; conflicting, stale or protected
  changes return 409. No automatic retries or bulk actions are provided.
- Collection, graph, saved-result, publication and private-case routers require
  authentication in both local and cloud profiles. Anonymous requests receive
  401; pending/rejected/paused identities receive 403, including direct API URLs.
  Revoked access tokens receive 401. Banned accounts cannot log in or refresh.
- An approved viewer can only read. Authenticated mutations return 403, except
  the explicit session-logout endpoint. Login and refresh have their own
  credential verification. Health, capability discovery and authored public
  project demonstrations remain available without corpus access.

Suspension increments a durable `access_epoch` and revokes all refresh sessions
in one transaction. Access JWTs carry the epoch (`ae`); legacy JWTs are accepted
as epoch 1 only. Old tokens remain invalid after Allow. Issuance and rotation
lock the user before sessions so concurrent refresh cannot escape suspension.
Idle reader pages recheck their account every 30 seconds; new protected requests
enforce the decision immediately. Content already viewed cannot be retracted.

The current database state is checked on every authorized request; JWT role
claims or old sessions cannot override an approval decision. Protected data and
account responses use no-store caching. Session-aware frontend requests reject
late results after an identity switch and refresh expired access tokens.

Viewing still creates session/audit/cache activity; read-only describes research
content and analysis permissions, not authentication bookkeeping.

## Migration and operations

`gmee11` adds approval state, revision and review metadata, plus a status
constraint and request-list index. Existing identities are backfilled as
approved, preserving developer and previously provisioned viewer access. Only
future public signup is forced to pending. The active publication is unchanged.

`gmee12` adds `access_epoch` (existing users default to 1) and extends the
status constraint with paused/banned. It preserves all existing roles, approval
states, passwords and corpus rows. Its downgrade refuses to erase suspension
or token-revocation state. Deploy the API before the updated frontend.

Deploy API and frontend together, verify existing developer access, then check
the registration/review flow. The migration downgrade refuses to silently
remove the approval boundary. Do not run pre-approval application code against
pending identities. Backups and rollback must preserve account decisions.

The operator-only `create_viewer_accounts.py` remains a direct-database tool
for explicitly pre-approved identities; it never resets mismatched accounts.
`set_user_role.py` represents an explicit operator role/access grant. Neither
script is a public provisioning route. Credentials stay outside Git.

Read-only verification sweeps now require `GMEE_VERIFY_TOKEN` from an approved
account. They check a viewer's comparison rejection instead of running analysis.

## Verification

- 710 backend tests passed; coverage 82.53%, above the 70% gate.
- 351 frontend tests passed; lint, production build and architecture checks pass.
- 30 infrastructure tests passed. The disposable HTTP smoke now checks pending
  access denial, developer approval, viewing-only access and existing researcher
  comparison contracts. Its operator bootstrap requires an explicitly marked,
  empty testing database at the exact Compose fixture host/database; production
  startup never creates default accounts.
- PostgreSQL CI exercises legacy-account migration and concurrent review races.
- Browser rehearsal: visitor signs in to the waiting page; a separate developer
  session sees the request and approves it; the visitor enters the 7,421-article
  viewing workspace. Rehearsal uses a separate database copy.

Local passing checks do not establish production deployment; verify Render's
exact deployed commit and the live API boundaries separately.
