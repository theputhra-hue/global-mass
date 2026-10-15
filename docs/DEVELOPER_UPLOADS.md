# Developer uploads

Route: `/#/dashboard/upload` after sign-in; administrators also see a Developer
uploads link in Account. Current feature stores validated releases in PostgreSQL
staging, separate from articles/claims. It does not activate them in public views.

## Operator setup

1. Rehearse additive migration gmee06 (after upstream gmee04 and gmee05) on an isolated database, take a backup,
   then migrate the target deployment through the normal release procedure.
2. Set backend `DEVELOPER_UPLOAD_EMAILS` to a JSON list of the two approved
   addresses. Default `[]` disables all uploads. Never put the allowlist or
   privileged credentials in frontend build variables.
3. Check identity with each developer and grant their existing account the admin
   role through a trusted operator process. Do not grant admin automatically
   based on a registration email. Current registration does not verify email
   ownership; email alone is insufficient authorization.
4. Restart the backend. Developers sign in, open Account -> Developer uploads,
   select a publication-format-v1 JSON file (10 MiB maximum), and click Validate
   and upload. Review the success receipt and recent history.

Backend requires an active authenticated account, admin role and exact email
allowlist match on every upload/history request. Uploads are streamed with a byte
limit before JSON parsing. Validation errors do not echo submitted text. Run ID
and canonical SHA-256 reject changed-data conflicts and support exact retries.
Database uniqueness also protects concurrent duplicate run IDs.

The feature is implemented locally; migration/allowlist are not applied to live
data automatically. Public activation, local export generation, lightweight cloud
hosting and full publication workflow remain in DATA_PUBLISHING_PLAN.md. Export
only reviewed data with real provenance; arbitrary JSON/CSV/database dumps are
not accepted. Keep staged release count/storage within the selected provider's
quota; retention/cleanup and per-operator publishing audit expansion remain open.
