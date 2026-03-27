import fs from 'fs/promises';
import path from 'path';

const WATCHER_RUNTIME_DEPENDENCY_PATHS = [
  'src/core/file-watcher',
  'src/shared/compiler'
];

async function getMaxMtimeRecursively(absolutePath) {
  try {
    let maxMtimeMs = 0;
    const pendingPaths = [absolutePath];

    while (pendingPaths.length > 0) {
      const currentPath = pendingPaths.pop();
      const stat = await fs.stat(currentPath);
      if (stat.mtimeMs > maxMtimeMs) {
        maxMtimeMs = stat.mtimeMs;
      }

      if (!stat.isDirectory()) {
        continue;
      }

      const entries = await fs.readdir(currentPath, { withFileTypes: true });
      for (const entry of entries) {
        pendingPaths.push(path.join(currentPath, entry.name));
      }
    }

    return maxMtimeMs;
  } catch {
    return 0;
  }
}

async function getCachedRuntimeDependencyMtime(projectPath, relativePath, runtimeDependencyMtimes) {
  if (!relativePath) return 0;
  if (runtimeDependencyMtimes.has(relativePath)) {
    return runtimeDependencyMtimes.get(relativePath);
  }

  let mtimeMs = 0;
  try {
    const absolutePath = path.resolve(projectPath, relativePath);
    mtimeMs = await getMaxMtimeRecursively(absolutePath);
  } catch {
    mtimeMs = 0;
  }

  runtimeDependencyMtimes.set(relativePath, mtimeMs);
  return mtimeMs;
}

export async function isAlertOutdatedByRuntimeDependencies(projectPath, detectedAtMs, runtimeDependencyMtimes) {
  for (const dependencyPath of WATCHER_RUNTIME_DEPENDENCY_PATHS) {
    const dependencyMtimeMs = await getCachedRuntimeDependencyMtime(
      projectPath,
      dependencyPath,
      runtimeDependencyMtimes
    );
    if (dependencyMtimeMs > (detectedAtMs + 1000)) {
      return true;
    }
  }

  return false;
}
