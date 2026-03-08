import { uniquePaths } from '../../layer-graph/utils/path-utils.js';
import { summarizePersistedScannedFileCoverage } from './compiler-persistence.js';

export function collectDiscoveredFilePaths(currentFiles = []) {
  return uniquePaths(currentFiles.map((file) => file.path).filter(Boolean));
}

export function reconcilePersistedManifestCoverage(changes, discoveredFilePaths, indexedFilePaths) {
  const missingIndexedPaths = discoveredFilePaths.filter((filePath) => !indexedFilePaths.has(filePath));
  if (missingIndexedPaths.length === 0) {
    return { recoveredCount: 0, recoveredPaths: [] };
  }

  const recoveredPathSet = new Set(missingIndexedPaths);
  changes.unchangedFiles = changes.unchangedFiles.filter((filePath) => !recoveredPathSet.has(filePath));
  changes.modifiedFiles = changes.modifiedFiles.filter((filePath) => !recoveredPathSet.has(filePath));

  for (const filePath of missingIndexedPaths) {
    if (!changes.newFiles.includes(filePath)) {
      changes.newFiles.push(filePath);
    }
  }

  return {
    recoveredCount: missingIndexedPaths.length,
    recoveredPaths: missingIndexedPaths
  };
}

export async function summarizePersistedManifestDrift(projectPath, discoveredFilePaths) {
  const fileCoverage = await summarizePersistedScannedFileCoverage(projectPath, discoveredFilePaths);
  return {
    missingFileCount: fileCoverage.missingFileCount || 0,
    expectedFileCount: fileCoverage.expectedFileCount || 0,
    persistedFileCount: fileCoverage.persistedFileCount || 0,
    coverage: fileCoverage
  };
}
