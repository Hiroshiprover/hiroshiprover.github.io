/**
 * Pure staging watcher path contract. The real adapter uses this so body MDX
 * changes do not trigger docs-plugin reloads; category/tag paths remain watched
 * and an optional sentinel path is appended only under the gate.
 */
export function filterStagingWatchPaths(paths, { watchSentinel = false, sentinelPath = null } = {}) {
  if (!Array.isArray(paths)) throw new TypeError('getPathsToWatch must return an array')
  const filtered = paths.filter((p) => !String(p).includes('/**/*.{md,mdx}'))
  if (!watchSentinel || typeof sentinelPath !== 'string' || sentinelPath.length === 0) return filtered
  return [...filtered, sentinelPath]
}
