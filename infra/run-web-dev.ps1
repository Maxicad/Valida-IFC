$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$logDir = Join-Path $repoRoot "infra"
$logPath = Join-Path $logDir "web-dev.log"

Set-Location $repoRoot
New-Item -ItemType Directory -Force -Path $logDir | Out-Null

corepack pnpm --filter @valida-ifc/web exec next dev --hostname 0.0.0.0 --port 3000 *> $logPath
