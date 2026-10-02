# ==============================================================================
# Script: deploy-vps.ps1
# Description: PowerShell deployment script for FinTrack MCP Server to remote VPS
#              using SSH key authentication and Docker Compose.
# ==============================================================================

[CmdletBinding()]
param (
    [string]$VpsHost = $env:VPS_HOST,
    [string]$VpsUser = $(if ($env:VPS_USER) { $env:VPS_USER } else { "root" }),
    [int]$VpsPort = $(if ($env:VPS_PORT) { [int]$env:VPS_PORT } else { 22 }),
    [string]$SshKeyPath = $(if ($env:SSH_KEY_PATH) { $env:SSH_KEY_PATH } else { "$HOME\.ssh\id_ed25519" }),
    [string]$RemoteAppDir = $(if ($env:REMOTE_APP_DIR) { $env:REMOTE_APP_DIR } else { "/opt/fintrack-mcp" }),
    [string]$LocalEnvFile = $(if ($env:LOCAL_ENV_FILE) { $env:LOCAL_ENV_FILE } else { ".\mcp-server\.env.local" }),
    [string]$ComposeFile = ".\mcp-server\docker-compose.vps.yml",
    [string]$GhcrUser = $env:GHCR_USER,
    [string]$GhcrPat = $env:GHCR_PAT
)

$ErrorActionPreference = "Stop"

# Load .env.deploy if present
if (Test-Path ".env.deploy") {
    Write-Host "Loading variables from .env.deploy..." -ForegroundColor Cyan
    Get-Content ".env.deploy" | ForEach-Object {
        $line = $_.Trim()
        if ($line -and -not $line.StartsWith("#")) {
            $key, $value = $line.Split("=", 2)
            if ($key -and $value) {
                $cleanVal = $value.Trim('"', "'")
                switch ($key.Trim()) {
                    "VPS_HOST" { if (-not $VpsHost) { $VpsHost = $cleanVal } }
                    "VPS_USER" { if ($VpsUser -eq "root") { $VpsUser = $cleanVal } }
                    "VPS_PORT" { if ($VpsPort -eq 22) { $VpsPort = [int]$cleanVal } }
                    "SSH_KEY_PATH" { $SshKeyPath = $cleanVal.Replace("~", $HOME) }
                    "REMOTE_APP_DIR" { $RemoteAppDir = $cleanVal }
                    "LOCAL_ENV_FILE" { $LocalEnvFile = $cleanVal }
                    "GHCR_USER" { if (-not $GhcrUser) { $GhcrUser = $cleanVal } }
                    "GHCR_PAT" { if (-not $GhcrPat) { $GhcrPat = $cleanVal } }
                }
            }
        }
    }
}

if (-not $VpsHost) {
    Write-Error "VPS_HOST is required. Set it in .env.deploy or pass -VpsHost parameter."
    exit 1
}

# Resolve local paths
$ResolvedSshKey = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($SshKeyPath.Replace("~", $HOME))
if (-not (Test-Path $ResolvedSshKey)) {
    # Check id_rsa if ed25519 not found
    $RsaKey = "$HOME\.ssh\id_rsa"
    if (Test-Path $RsaKey) {
        $ResolvedSshKey = $RsaKey
    } else {
        Write-Error "SSH private key not found at '$ResolvedSshKey'."
        exit 1
    }
}

if (-not (Test-Path $LocalEnvFile)) {
    if (Test-Path ".\mcp-server\.env") {
        $LocalEnvFile = ".\mcp-server\.env"
    } else {
        Write-Error "Local environment file not found at '$LocalEnvFile'."
        exit 1
    }
}

Write-Host "==========================================================" -ForegroundColor Green
Write-Host " Starting Deployment to VPS: ${VpsUser}@${VpsHost}:${VpsPort}" -ForegroundColor Green
Write-Host " Remote Directory: $RemoteAppDir" -ForegroundColor Green
Write-Host " SSH Key: $ResolvedSshKey" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green

# 1. Test SSH
Write-Host "Step 1/5: Testing SSH connection..." -ForegroundColor Yellow
& ssh -i "$ResolvedSshKey" -p $VpsPort -o StrictHostKeyChecking=accept-new "${VpsUser}@${VpsHost}" "echo 'SSH connection successful.'"
if ($LASTEXITCODE -ne 0) { throw "SSH connection failed" }

# 2. Prepare directory
Write-Host "Step 2/5: Preparing remote directory..." -ForegroundColor Yellow
& ssh -i "$ResolvedSshKey" -p $VpsPort "${VpsUser}@${VpsHost}" "mkdir -p '$RemoteAppDir'"

# 3. Transfer files
Write-Host "Step 3/5: Copying compose and .env to VPS..." -ForegroundColor Yellow
& scp -i "$ResolvedSshKey" -P $VpsPort -o StrictHostKeyChecking=accept-new "$ComposeFile" "${VpsUser}@${VpsHost}:${RemoteAppDir}/docker-compose.yml"
& scp -i "$ResolvedSshKey" -P $VpsPort -o StrictHostKeyChecking=accept-new "$LocalEnvFile" "${VpsUser}@${VpsHost}:${RemoteAppDir}/.env"

# 4. Pull and run
Write-Host "Step 4/5: Pulling latest image and restarting service..." -ForegroundColor Yellow
$RemoteCmd = "cd '$RemoteAppDir' && docker compose pull && docker compose down --remove-orphans 2>/dev/null || true && docker compose up -d"
if ($GhcrUser -and $GhcrPat) {
    $RemoteCmd = "echo '$GhcrPat' | docker login ghcr.io -u '$GhcrUser' --password-stdin && " + $RemoteCmd
}

& ssh -i "$ResolvedSshKey" -p $VpsPort "${VpsUser}@${VpsHost}" "$RemoteCmd"

# 5. Check status
Write-Host "Step 5/5: Checking container status..." -ForegroundColor Yellow
& ssh -i "$ResolvedSshKey" -p $VpsPort "${VpsUser}@${VpsHost}" "cd '$RemoteAppDir' && docker compose ps"

Write-Host "`nDeployment completed successfully!" -ForegroundColor Green
