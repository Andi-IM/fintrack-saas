#!/usr/bin/env bash
# ==============================================================================
# Script: deploy-vps.sh
# Description: Automated deployment script for FinTrack MCP Server to remote VPS
#              using SSH key authentication and Docker Compose.
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Load environment configuration if .env.deploy exists in current dir or repo root
if [ -f ".env.deploy" ]; then
  echo "Loading deployment configuration from .env.deploy..."
  # shellcheck disable=SC1091
  source .env.deploy
elif [ -f "$REPO_ROOT/.env.deploy" ]; then
  echo "Loading deployment configuration from $REPO_ROOT/.env.deploy..."
  # shellcheck disable=SC1091
  source "$REPO_ROOT/.env.deploy"
fi

# Detect default files
DEFAULT_COMPOSE="$REPO_ROOT/mcp-server/docker-compose.vps.yml"
DEFAULT_ENV="$REPO_ROOT/mcp-server/.env.local"
if [ ! -f "$DEFAULT_ENV" ]; then
  DEFAULT_ENV="$REPO_ROOT/mcp-server/.env"
fi

# Configuration variables (supports both VM_* and VPS_* naming)
VM_HOST="${VM_HOST:-${VPS_HOST:-}}"
VM_USER="${VM_USER:-${VPS_USER:-root}}"
VPS_PORT="${VPS_PORT:-22}"
DEPLOY_SSH_KEY="${DEPLOY_SSH_KEY:-${SSH_KEY_PATH:-~/.ssh/id_ed25519}}"
REMOTE_APP_DIR="${REMOTE_APP_DIR:-/opt/fintrack-mcp}"
LOCAL_ENV_FILE="${LOCAL_ENV_FILE:-$DEFAULT_ENV}"
COMPOSE_FILE="${COMPOSE_FILE:-$DEFAULT_COMPOSE}"
GHCR_USER="${GHCR_USER:-}"
GHCR_PAT="${GHCR_PAT:-}"

# Expand tilde in key path if present
DEPLOY_SSH_KEY="${DEPLOY_SSH_KEY/#\~/$HOME}"

# Validate required variables
if [ -z "$VM_HOST" ]; then
  echo "Error: VM_HOST (or VPS_HOST) is required."
  echo "Example: VM_HOST=123.45.67.89 ./scripts/deploy-vps.sh"
  exit 1
fi

if [ ! -f "$DEPLOY_SSH_KEY" ]; then
  if [ -f "$HOME/.ssh/id_rsa" ]; then
    DEPLOY_SSH_KEY="$HOME/.ssh/id_rsa"
  else
    echo "Error: SSH private key not found at '$DEPLOY_SSH_KEY'."
    exit 1
  fi
fi

if [ ! -f "$LOCAL_ENV_FILE" ]; then
  echo "Error: Local environment file not found at '$LOCAL_ENV_FILE'."
  exit 1
fi

if [ ! -f "$COMPOSE_FILE" ]; then
  echo "Error: Docker compose file not found at '$COMPOSE_FILE'."
  exit 1
fi

SSH_CMD="ssh -i $DEPLOY_SSH_KEY -p $VPS_PORT -o StrictHostKeyChecking=accept-new"
SCP_CMD="scp -i $DEPLOY_SSH_KEY -P $VPS_PORT -o StrictHostKeyChecking=accept-new"

echo "=========================================================="
echo " Starting Deployment to VPS: ${VM_USER}@${VM_HOST}:${VPS_PORT}"
echo " Remote Directory: $REMOTE_APP_DIR"
echo " SSH Key: $DEPLOY_SSH_KEY"
echo " Compose File: $COMPOSE_FILE"
echo " Env File: $LOCAL_ENV_FILE"
echo "=========================================================="

# 1. Test SSH connectivity
echo "Step 1/5: Testing SSH connection..."
$SSH_CMD "${VM_USER}@${VM_HOST}" "echo 'SSH connection successful. Host: \$(hostname)'"

# 2. Ensure remote directory exists and Docker is available
echo "Step 2/5: Checking remote Docker installation and preparing directory..."
$SSH_CMD "${VPS_USER}@${VPS_HOST}" bash <<EOF
  set -e
  if ! command -v docker &> /dev/null; then
    echo "Error: Docker is not installed on remote VPS. Please install Docker first."
    exit 1
  fi
  mkdir -p "$REMOTE_APP_DIR"
EOF

# 3. Transfer compose and environment files
echo "Step 3/5: Transferring configuration files to VPS..."
$SCP_CMD "$COMPOSE_FILE" "${VM_USER}@${VM_HOST}:${REMOTE_APP_DIR}/docker-compose.yml"
$SCP_CMD "$LOCAL_ENV_FILE" "${VM_USER}@${VM_HOST}:${REMOTE_APP_DIR}/.env"

# 4. Pull latest image and restart service
echo "Step 4/5: Pulling latest image and restarting container..."
$SSH_CMD "${VM_USER}@${VM_HOST}" bash <<EOF
  set -e
  cd "$REMOTE_APP_DIR"

  # Optional GHCR login if credentials provided
  if [ -n "$GHCR_USER" ] && [ -n "$GHCR_PAT" ]; then
    echo "Logging in to GitHub Container Registry..."
    echo "$GHCR_PAT" | docker login ghcr.io -u "$GHCR_USER" --password-stdin
  fi

  echo "Pulling latest Docker image..."
  docker compose pull

  echo "Restarting services..."
  docker compose down --remove-orphans || true
  docker compose up -d

  echo "Pruning dangling images..."
  docker image prune -f
EOF

# 5. Verify deployment
echo "Step 5/5: Verifying container status..."
$SSH_CMD "${VM_USER}@${VM_HOST}" "cd $REMOTE_APP_DIR && docker compose ps && docker compose logs --tail 20"

echo "=========================================================="
echo " Deployment completed successfully!"
echo " Container is running on ${VM_USER}@${VM_HOST}"
echo "=========================================================="
