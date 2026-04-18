import { getFileExports } from '#layer-c/query/apis/file-api.js';
import { normalizeComparablePath, normalizePath } from '#shared/utils/path-utils.js';

function createCacheKey(projectPath, filePath) {
  return `${normalizeComparablePath(projectPath)}::${normalizeComparablePath(filePath)}`;
}

export async function loadModuleExportsFromDb(projectPath, modulePath, exportsByModule) {
  if (!modulePath) return new Set();

  const normalizedModulePath = normalizePath(modulePath, projectPath);
  const cacheKey = createCacheKey(projectPath, normalizedModulePath);
  if (exportsByModule.has(cacheKey)) return exportsByModule.get(cacheKey);

  const moduleExports = await getFileExports(projectPath, normalizedModulePath).catch(() => new Set());

  exportsByModule.set(cacheKey, moduleExports);
  return moduleExports;
}
