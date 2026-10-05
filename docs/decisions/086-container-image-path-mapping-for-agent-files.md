# ADR-086: Container Image Path Mapping for Agent-Supplied Receipt Files

## Status

Accepted

## Context

The FinTrack MCP server runs as a container (Podman/Docker) on the same VPS as the
Hermes agent (ADR-065). Hermes receives receipt images from Telegram, stores them in a
host cache directory (e.g. `/home/ubuntu/.hermes/cache/images/...`), and passes the
host path to `create_receipt`. Because the container only sees its own filesystem, it
cannot read that host path, producing
`Receipt image file was not found on local disk`.

Previously we only supported `image_base64`, which forces the agent to inline a large
base64 payload into a stdio JSON-RPC argument. The host and container share the same
VPS, so a bind mount is cheaper and avoids that overhead.

## Decision

Mount the agent's image cache into the container and teach the MCP server to map host
paths onto the mounted directory:

- `docker-compose.vps.yml` mounts
  `/home/ubuntu/.hermes/cache/images:/app/hermes-images:ro`.
- Two env vars define the mapping: `MCP_HOST_IMAGE_DIR` (host prefix) and
  `MCP_CONTAINER_IMAGE_DIR` (container prefix).
- A shared helper `mcp-server/src/utils/image-path.ts` rewrites any agent-supplied path
  under `MCP_HOST_IMAGE_DIR` to the equivalent `MCP_CONTAINER_IMAGE_DIR` path before the
  server checks the disk. If the mapping is unset, behaviour is unchanged.
- Both `create_receipt` (image) and `create_bank_statement` (PDF) use the helper, so
  agents may keep sending host paths unmodified.
- `image_base64` and direct Supabase `storage_path` remain fully supported as fallbacks.

## Alternatives Considered

- **Base64-only**: Already supported, but wastes memory/stdio bandwidth for large photos
  and requires the agent to read and encode the file. Rejected as the primary path.
- **Rewrite agent output to container paths**: Would require changing Hermes'
  prompt/tool-call construction and keeps two sources of truth. Rejected.
- **Copy files into the container before each call**: Fragile, race-prone, and needs the
  agent to run container commands. Rejected.
- **Migrate MCP to a Supabase Edge Function** to drop the container entirely: Solves VPS
  RAM pressure but removes local filesystem access outright, worsening this problem.
  Rejected for this change.

## Consequences

- Hermes can pass host paths as-is; images upload reliably without base64.
- The mount is read-only (`:ro`), limiting blast radius.
- The mapping depends on env configuration staying in sync with the compose mount; if
  either is missing, the server falls back to the existing error + hint.
- Path traversal outside `MCP_HOST_IMAGE_DIR` is not remapped, so only the intended cache
  is exposed.

## Related Notes

- `mcp-server/src/utils/image-path.ts`
- `mcp-server/src/tools/receipts.ts`, `mcp-server/src/tools/statements.ts`
- `mcp-server/docker-compose.vps.yml`, `mcp-server/.env.example`
- ADR-065 (containerize MCP server), ADR-068 (image upload), ADR-085 (timezone + parsing)
