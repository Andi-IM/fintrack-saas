# ADR-065: Containerize MCP Server and Publish to GHCR

## Status

Accepted

## Context

Following the implementation of the dedicated TypeScript MCP Server in `mcp-server/` (ADR-063), users and automated agents need a frictionless, zero-dependency method to execute the MCP server without having to manually set up Node.js or `pnpm` on every local machine or host environment.

Additionally, team members and external tools need access to versioned, containerized artifacts directly associated with this repository on GitHub.

## Decision

1. **Containerization**:
   - Provide a multi-stage `Dockerfile` in `mcp-server/Dockerfile` using `node:20-alpine`.
   - Use `pnpm` (enabled via Corepack) for lean, deterministic builds with `--frozen-lockfile`.
   - Prune development dependencies (`pnpm prune --prod`) and run under the unprivileged `node` system user for container security.
   - Maintain a `.dockerignore` file in `mcp-server/` to omit `node_modules`, `dist`, local environment files (`.env*`), and git metadata from container builds.

2. **Registry & Continuous Delivery**:
   - Publish container images to GitHub Packages / GitHub Container Registry (`ghcr.io/${{ github.repository }}-mcp`).
   - Create a GitHub Actions workflow `.github/workflows/mcp-docker.yml` that builds and pushes the image upon pushes to `main` affecting `mcp-server/**` or manually via `workflow_dispatch`.
   - Tag images with `latest`, Git branch/tag, and Git commit SHA (`sha-<short>`) using GitHub Actions cache (`type=gha`) for fast builds.

3. **Execution Model**:
   - Clients (Claude Desktop, Cursor, Antigravity) can launch the container using Docker stdio transport (`docker run -i --rm -e SUPABASE_URL=... -e FINTRACK_USER_ID=... ghcr.io/<repo>-mcp:latest`).

## Alternatives Considered

- **Local npm global installation (`npm i -g`)**: Rejected as it requires pre-installing Node.js and dependencies on host environments and creates version drift across machines.
- **Docker Hub publishing**: Rejected in favor of GHCR because GHCR directly integrates with GitHub repository permissions, automated secrets (`GITHUB_TOKEN`), and team access controls without requiring third-party credentials.

## Consequences

- Positive: Zero-dependency runtime for MCP clients (only Docker required on host).
- Positive: Automated build, tagging, and publishing to GitHub Packages on every main release.
- Positive: Secure multi-stage build running as non-root user.
- Trade-off: Requires client machines running Docker if choosing the containerized execution path instead of local Node.js.

## Related Notes

- [ADR-063: Dedicated FinTrack MCP Server](file:///d:/01_Projects/fintrack-saas/docs/decisions/063-dedicated-fintrack-mcp-server.md)
- [mcp-server/Dockerfile](file:///d:/01_Projects/fintrack-saas/mcp-server/Dockerfile)
- [.github/workflows/mcp-docker.yml](file:///d:/01_Projects/fintrack-saas/.github/workflows/mcp-docker.yml)
- [mcp-server/README.md](file:///d:/01_Projects/fintrack-saas/mcp-server/README.md)
