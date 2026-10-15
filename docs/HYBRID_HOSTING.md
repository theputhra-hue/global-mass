# Render frontend with a local ML backend

Updated: 2026-10-15. A new frontend is live at
`https://global-mass.onrender.com`, built from `theputhra-hue/global-mass`.
The previous frontend at `https://gmee-v1.onrender.com` was not replaced.
This profile runs the API/models/datastores on the owner's PC.
It does not make the full ML application fit Render's 512 MB free instance.

## Integration notice — 15 October 2026

The major-project integration retains this hosting profile and its offline
model preparation/preflight behavior. Its new additive migration chain ends at
`gmee06`; the prior verified database below was at `gmee03`. Back up and rehearse
the `gmee04`/`gmee05`/`gmee06` upgrade on an isolated restore before applying it to that
existing deployment. The read-only launcher deliberately refuses a schema
mismatch and does not auto-upgrade or stamp the database. Article search retains
a claim-vector fallback for existing articles without document embeddings.
No public deployment, tunnel replacement or live data migration is part of the
integration. See [current integration evidence](INTEGRATION_REVIEW.md).

## Previously verified hosting state

- Existing PostgreSQL database upgraded from `b8f4d2c91a55` to `gmee03` after a
  custom-format backup, isolated restore, successful migration rehearsal, and
  count/checksum comparisons of preserved article/claim/relationship/account/
  session/source fields.
- Existing corpus retained: 7,421 articles and 5,157 claims at verification.
- Local readiness, article/claim totals, and semantic search pass.
- Embedding, stance, and local claim-extraction models prepared in the host cache;
  resolved revision metadata is saved in ignored `.local-deployment/models.json`.
- Local NLI probes returned entailment and contradiction for controlled inputs.
  These probes establish execution, not scientific accuracy.
- Public HTTPS readiness/dashboard/search probes pass through a temporary tunnel;
  the allowed frontend origin is `https://gmee-v1.onrender.com`.
- Backend regression: 485 tests passed, 81.34% coverage; 8 PostgreSQL integration
  tests passed separately against the restored rehearsal database, not live data.
- New Render static site `global-mass` is live (service `srv-db88m5rncjis73f24vog`,
  initial deployed source `afb62fd`). Its public API environment value and exact
  tunnel-origin CSP are configured; five security response headers are set.
- Live browser login transport returned the expected invalid-credentials error
  for a deliberately nonexistent test account. This verifies connectivity, not
  successful account authentication. No real credentials were used in that check.
- The old frontend is in another Render account and remains unchanged.

## Startup

Keep Docker Desktop running and the PC awake. These commands use the existing
`gmee_postgres`, `gmee_redis`, and `gmee_neo4j` containers. They do not create or
replace database volumes. Do not use `down --volumes` against the existing stack.

```powershell
# From repository root, start only the existing datastores if stopped.
docker start gmee_postgres gmee_redis gmee_neo4j

cd backend
# Read-only connection/schema/count preflight. No migrations applied.
& .venv/Scripts/python.exe -m scripts.serve_local --frontend-origin https://global-mass.onrender.com --additional-frontend-origin https://gmee-v1.onrender.com --check

# Explicit preparation downloads public models into the host cache.
# Run on initial setup, or when deliberately changing the model configuration.
& .venv/Scripts/python.exe -m scripts.prepare_local_models

# Start one API process; embeddings load from the prepared cache before serving.
& .venv/Scripts/python.exe -m scripts.serve_local --frontend-origin https://global-mass.onrender.com --additional-frontend-origin https://gmee-v1.onrender.com
```

The launcher resolves published host ports from existing Docker metadata, so it
does not hardcode an obsolete PostgreSQL port or copy database passwords into
command arguments. It uses the private root `.env` for application settings,
keeps scheduled ingestion disabled, checks the schema revision, and binds only
to `127.0.0.1:8000`. Missing schema/model prerequisites stop startup.
The serving process sets Hugging Face/Transformers offline mode; preparation
runs separately with network access. New/changed models must be prepared before
restarting the server rather than downloaded while handling a request.

The launcher never runs migrations automatically. Future migrations require a
backup and isolated rehearsal; a schema mismatch must not be bypassed by stamping
the database version without applying the migration.

If models or caches change, use the same model space as the stored embeddings.
Matching dimensionality alone does not prove model-space compatibility. This
profile uses the existing `all-mpnet-base-v2` configuration and records revisions;
it does not retroactively establish the provenance of all historical vectors.

PowerShell convenience wrappers are also provided:

```powershell
./infra/scripts/start_local_backend.ps1 -FrontendOrigin https://global-mass.onrender.com -AdditionalFrontendOrigin https://gmee-v1.onrender.com -CheckOnly
./infra/scripts/start_local_backend.ps1 -FrontendOrigin https://global-mass.onrender.com -AdditionalFrontendOrigin https://gmee-v1.onrender.com -PrepareModels
```

On machines requiring signed PowerShell scripts, follow the machine's signing
policy or use the equivalent Python commands above. Do not weaken the execution
policy just to run a helper. The helper syntax can be checked without executing it.

## Temporary HTTPS connection

After local readiness passes, open another terminal:

```powershell
Invoke-RestMethod http://127.0.0.1:8000/api/v1/health/ready
cloudflared tunnel --url http://127.0.0.1:8000 --no-autoupdate
```

`infra/scripts/start_demo_tunnel.ps1` combines readiness checking and that tunnel
command on machines where local script execution is permitted.

Use the exact `https://...trycloudflare.com` URL printed by cloudflared. It is a
public endpoint: existing API authentication/authorization still applies, but
public read routes remain public. Only the API port is tunneled; do not forward
PostgreSQL, Redis, Neo4j, or the Docker daemon to the internet.

Quick Tunnel URLs change after a restart and have no uptime guarantee. They are
for testing/development, not a permanent production deployment. See
[Cloudflare's Quick Tunnel documentation](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/).
For a stable address, configure a named tunnel and an owned domain separately.
Do not commit Cloudflare tunnel credentials or change a named tunnel belonging
to another project.

The host launcher ignores forwarded client-IP headers. Tunnel clients therefore
share conservative peer-based rate limits. Per-client edge identity requires a
separately reviewed trusted-proxy setup; do not trust arbitrary X-Forwarded-For
or set a wildcard forwarding allowlist to evade the shared limit.

## Change or reconnect the Render frontend

The new `global-mass` service is already connected. Use these steps to change
its tunnel address, or to connect the old `gmee-v1` service from its owning account.
There is no reason to delete either service to change its API base URL.

1. Open the existing static site's Environment page.
2. Set `VITE_API_BASE_URL` to the current tunnel origin followed by `/api/v1`.
   This is a public API base URL, not a database URL or credential.
3. Inspect its Content-Security-Policy header. Add that exact HTTPS tunnel origin
   to `connect-src` while retaining the existing allowed origins/directives.
   Do not use a broad `https:` or `*` allowlist.
4. Save and redeploy the frontend so Vite embeds the new URL in its build.
5. Check readiness through HTTPS; then test sign-in, totals, article search, and
   a protected read-only corpus check through the actual hosted frontend.
6. After any Quick Tunnel restart, repeat the API-base/CSP update and rebuild.

Do not share `.env`, JWT secrets, passwords, or database connection URLs in chat
or in frontend build variables. This profile requires only the public HTTPS API
base URL in the frontend.

## Shutdown and recovery

- Stop cloudflared with Ctrl+C to remove public access.
- Stop the API with Ctrl+C. Leave datastores alone unless intentionally shutting
  down the local stack; do not remove their volumes.
- Start Docker/datastores, rerun preflight, and restart the API/tunnel after a PC
  reboot. A temporary tunnel will receive a new hostname.
- Backups in `.local-deployment/` contain sensitive database content. They are
  Git-ignored, but are not automatically encrypted or copied off the PC. Protect
  them and complete the off-host encrypted-backup task before a durable release.
- The hosting rehearsal container is separate from live `gmee_postgres`; never
  point restore/fixture teardown commands at the live container.

This profile does not solve the separate durable-worker/heartbeat/recovery tasks
in [the master task sheet](../TASK_SHEET.md). Store readiness and working models
do not establish queue correctness, capacity, factual accuracy, or publication readiness.
