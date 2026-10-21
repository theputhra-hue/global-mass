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

Open **Manage data → Visitor access requests** on the developer dashboard.
The pending list shows names, email addresses and request times. Choose
**Approve viewing access** or **Decline request**. Approved and declined
accounts are available through the Show selector. Lists are paginated and
refresh every 30 seconds. Passwords and password hashes are never returned.

Only active, approved administrators whose emails are in the existing
`DEVELOPER_UPLOAD_EMAILS` allowlist can list/review accounts. Review records the
reviewer ID, timestamp, decision and incremented revision. A compare-and-swap
update permits one decision for a pending viewer: stale tabs and simultaneous
reviewers receive 409 and cannot overwrite an earlier decision. Review cannot
promote visitors, alter developer/researcher identities or reactivate disabled
accounts. There is no bulk approval or automatic approval.

## API boundaries

- `POST /api/v1/auth/register`: name/email/password → pending viewer + normal
  memory-only session tokens. `GET /auth/me` includes `access_status`.
- `GET /api/v1/developer/accounts`: developer-only list; filters pending,
  approved and rejected; defaults to 20, maximum 50 per page.
- `POST /api/v1/developer/accounts/{id}/review`: developer-only decision with
  `decision=approve|reject` and `expected_revision`.
- Collection, graph, saved-result, publication and private-case routers require
  authentication in both local and cloud profiles. Anonymous requests receive
  401; pending/rejected identities receive 403, including direct API URLs.
- An approved viewer can only read. Authenticated mutations return 403, except
  the explicit session-logout endpoint. Login and refresh have their own
  credential verification. Health, capability discovery and authored public
  project demonstrations remain available without corpus access.

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
