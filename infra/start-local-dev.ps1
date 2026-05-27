$ErrorActionPreference = "Continue"

$repoRoot = Split-Path -Parent $PSScriptRoot
$logDir = Join-Path $repoRoot "infra"
$apiLogPath = Join-Path $logDir "api-dev.log"
$startupLogPath = Join-Path $logDir "startup.log"
$webScriptPath = Join-Path $logDir "run-web-dev.ps1"

Set-Location $repoRoot
New-Item -ItemType Directory -Force -Path $logDir | Out-Null

function Write-StartupLog {
    param([string] $Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Add-Content -Path $startupLogPath -Value "[$timestamp] $Message"
}

function Test-PortListening {
    param([int] $Port)
    $connection = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    return $null -ne $connection
}

Write-StartupLog "Starting Valida IFC local dev services."

$dockerReady = $false
for ($attempt = 1; $attempt -le 24; $attempt += 1) {
    docker info *> $null
    if ($LASTEXITCODE -eq 0) {
        $dockerReady = $true
        break
    }

    $dockerDesktop = "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    if ((Test-Path -LiteralPath $dockerDesktop) -and $attempt -eq 1) {
        Write-StartupLog "Docker is not ready; starting Docker Desktop."
        Start-Process -FilePath $dockerDesktop -WindowStyle Hidden
    }
    Start-Sleep -Seconds 5
}

if ($dockerReady) {
    Write-StartupLog "Starting backend stack with Docker Compose."
    docker compose up -d postgres redis api *> $apiLogPath
} else {
    Write-StartupLog "Docker did not become ready; backend was not started."
}

if (Test-PortListening -Port 3000) {
    Write-StartupLog "Frontend already listening on port 3000."
} else {
    Write-StartupLog "Starting frontend dev server on port 3000."
    Start-Process -FilePath "powershell" -ArgumentList "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", "`"$webScriptPath`"" -WindowStyle Hidden
}

Write-StartupLog "Startup routine finished."
