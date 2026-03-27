export function buildToolError(error) {
  return { error: error.message };
}

export function getCachedConnections(cache, projectPath, loader) {
  return cache.getRamCache('connections') || loader(projectPath);
}

export function getCachedImpact(cache, filePath) {
  return cache.getRamCache(`impact:${filePath}`);
}
