# ADR-067: Scoped CI Path Triggers and VPS SSH Deployment Script

## Status

Accepted

## Context

Prior to this decision, the primary Continuous Integration workflow (`.github/workflows/test.yml`) lacked path filtering. Whenever changes were made exclusively to the `mcp-server/` codebase or documentation, the entire frontend CI suite (including unit tests, Next.js production bundle analysis, and full end-to-end tests) was triggered, taking 10+ minutes and wasting CI compute resources.

Furthermore, deploying the MCP server or services to a Virtual Private Server (VPS) required manual steps without a repeatable, automated deployment script utilizing SSH key authentication.

## Decision

1. **Scoped CI Triggers**:
   - Update `.github/workflows/test.yml` with `paths-ignore` for `mcp-server/**`, `.github/workflows/mcp*`, `docs/**`, and `**.md` so that MCP-only commits do not trigger frontend builds and tests.
   - Introduce a dedicated, lightweight `.github/workflows/mcp-ci.yml` that triggers on `mcp-server/**` modifications to validate and compile the MCP server in under a minute without running unrelated frontend workflows.

2. **VPS Deployment Automation via SSH Key**:
   - Provide automated deployment scripts:
     - `scripts/deploy-vps.sh` (POSIX Bash for Linux, macOS, WSL, Git Bash, and CI).
     - `scripts/deploy-vps.ps1` (Native PowerShell for Windows environments).
   - The deployment script:
     - Authenticates using an SSH private key (`-i <ssh_key_path>`).
     - Supports deploying either containerized via Docker/Compose (pulling from GHCR or building remotely) or direct Node.js PM2/Systemd.
     - Safely syncs environment configuration to the remote host.
     - Verifies health check and reports container/process status.
   - Provide `mcp-server/docker-compose.vps.yml` as a reference Docker Compose stack for VPS deployment.

## Consequences

- Positive: Dramatic reduction in CI duration and GitHub Actions runner consumption when iterating on `mcp-server`.
- Positive: Consistent, one-command deployment to any Linux VPS using SSH keys.
- Positive: Clean separation of concerns between frontend Next.js CI and MCP server CI.

## Related Notes

- [.github/workflows/test.yml](file:///d:/01_Projects/fintrack-saas/.github/workflows/test.yml)
- [.github/workflows/mcp-ci.yml](file:///d:/01_Projects/fintrack-saas/.github/workflows/mcp-ci.yml)
- [scripts/deploy-vps.sh](file:///d:/01_Projects/fintrack-saas/scripts/deploy-vps.sh)
- [scripts/deploy-vps.ps1](file:///d:/01_Projects/fintrack-saas/scripts/deploy-vps.ps1)
