# Local developer console

Open `/#/dashboard/developer` after signing in. Account also links to the console
after the backend confirms developer access. The same theme and typography as
the reader workspace are used, with responsive cards and scrollable job tables.

## Available controls

- Overview: article/claim/relationship totals and recent recorded jobs.
- Sources: pause/enable existing collection sources without deleting articles.
- Processing: individually confirm collection, preprocessing, NLP and evolution.
  Runs use the existing orchestrators and single-flight job records. They are
  synchronous HTTP operations, not a durable background queue. After a timeout,
  inspect status before retrying. The UI disables starts while a running job is
  visible; backend uniqueness remains the authority for each stage.
  Stage receipts show returned counts and warn about incomplete graph sync.
  The configured NLP article limit is displayed; preprocessing may chain NLP,
  and NLP may chain evolution when its corpus threshold is met.
- Review: processing/extraction status counts, article and graph links, job
  timestamps/heartbeats. Raw provider errors are excluded from overview responses.
- Publishing: upload workspace and release checklist. Automatic export, public
  activation, cancellation, scheduling and crash recovery remain unavailable.

## Access and configuration

All console endpoints and all four existing pipeline trigger endpoints now
require an active administrator whose exact email is in DEVELOPER_UPLOAD_EMAILS.
The intended deployment allowlist is prab@gmee.com and pavan@gmee.com, configured
in the private environment. Do not infer access from the UI or an email supplied
in the request body. The backend checks the authenticated stored account.

Set DEVELOPER_PIPELINE_ENABLED=true only on the intended local analysis backend.
Default false blocks pipeline triggers and source switches, including for approved
developers. Cloud upload remains separately available to approved developers.
This flag is an operator-configured execution profile, not proof of physical
locality. Do not enable it on the lightweight public cloud backend.

Initial local verification used the isolated gmee_upload_local_20261015 database.
The subsequent [500-article validation](validation/LOCAL_500_ARTICLE_REPORT_2026-10-15.md)
uses gmee_bench500_20261015_144907 on API port 8002 and frontend port 5050;
original local/public corpus data is not replaced.
No source credentials/URLs, passwords or full provider logs are exposed by the
console overview. Counts are operational statistics, not scientific validation.
