param([int]$Port = 8000)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
if ($Port -lt 1024 -or $Port -gt 65535) { throw 'Port must be between 1024 and 65535.' }
if (-not (Get-Command cloudflared -ErrorAction SilentlyContinue)) {
    throw 'Install cloudflared from Cloudflare before starting an HTTPS demo tunnel.'
}
$health = Invoke-RestMethod -Uri "http://127.0.0.1:$Port/api/v1/health/ready" -TimeoutSec 10
if ($health.status -ne 'ready') { throw 'Backend readiness must pass before opening a tunnel.' }
Write-Output 'Starting a PUBLIC temporary demo endpoint for the local API. Stop with Ctrl+C.'
Write-Output 'Keep this PC awake. The hostname changes after restart; update Render VITE_API_BASE_URL and CSP accordingly.'
# No persistent login, account credential, router port forwarding, or database port exposure.
& cloudflared tunnel --url "http://127.0.0.1:$Port" --no-autoupdate
if ($LASTEXITCODE -ne 0) { throw 'Cloudflare demo tunnel stopped with an error.' }
