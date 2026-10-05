import fs from 'node:fs';
import path from 'node:path';

/**
 * Maps a host filesystem path (e.g. the agent's Telegram image cache) onto the
 * equivalent path inside the container, using the MCP_HOST_IMAGE_DIR /
 * MCP_CONTAINER_IMAGE_DIR env pair. This lets agents keep sending host paths
 * even though the container only sees the mounted directory.
 */
export function mapHostPathToContainer(hostPath: string): string {
  const hostDir = (process.env.MCP_HOST_IMAGE_DIR || '').trim().replace(/[\\/]+$/, '');
  const containerDir = (process.env.MCP_CONTAINER_IMAGE_DIR || '').trim().replace(/[\\/]+$/, '');
  if (!hostDir || !containerDir) {
    return hostPath;
  }
  const normalizedHostDir = hostDir.replace(/\\/g, '/');
  const normalizedPath = hostPath.replace(/\\/g, '/');
  if (normalizedPath === normalizedHostDir || normalizedPath.startsWith(`${normalizedHostDir}/`)) {
    const relative = normalizedPath.slice(normalizedHostDir.length);
    return `${containerDir}${relative}`;
  }
  return hostPath;
}

/**
 * Resolves the on-disk path of a file supplied by the agent, transparently
 * rewriting host paths from a mounted cache directory to their in-container
 * equivalent. Returns null when the file cannot be found either way.
 */
export function resolveFileOnDisk(candidatePath: string): string | null {
  const direct = path.resolve(candidatePath);
  if (fs.existsSync(direct)) {
    return direct;
  }
  const mapped = mapHostPathToContainer(candidatePath);
  if (mapped !== candidatePath) {
    const resolvedMapped = path.resolve(mapped);
    if (fs.existsSync(resolvedMapped)) {
      return resolvedMapped;
    }
  }
  return null;
}
