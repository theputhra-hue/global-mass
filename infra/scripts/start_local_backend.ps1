param(
    [Parameter(Mandatory = $true)]
    [string]$FrontendOrigin,
    [string[]]$AdditionalFrontendOrigin = @(),
    [switch]$CheckOnly,
    [switch]$PrepareModels,
    [int]$Port = 8000
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$python = Join-Path $projectRoot 'backend/.venv/Scripts/python.exe'
if (-not (Test-Path -LiteralPath $python)) {
    throw 'Create backend/.venv and install backend/pyproject.toml dependencies first.'
}
if ($Port -lt 1024 -or $Port -gt 65535) { throw 'Port must be between 1024 and 65535.' }
Push-Location (Join-Path $projectRoot 'backend')
try {
    if ($PrepareModels) {
        & $python -m scripts.prepare_local_models
        if ($LASTEXITCODE -ne 0) { throw 'Model preparation failed; backend was not started.' }
    }
    $arguments = @('-m', 'scripts.serve_local', '--frontend-origin', $FrontendOrigin, '--port', "$Port")
    foreach ($origin in $AdditionalFrontendOrigin) { $arguments += @('--additional-frontend-origin', $origin) }
    if ($CheckOnly) { $arguments += '--check' }
    & $python @arguments
    if ($LASTEXITCODE -ne 0) { throw 'Local backend did not start. Fix its preflight before publishing a tunnel.' }
}
finally { Pop-Location }
