import { reindexCompilerFile } from '../../../../../shared/compiler/index.js';
import { collectUniquePaths, inspectDiskPresence } from './paths.js';

export async function reindexMutationTarget(projectPath, filePath) {
  const normalizedTargets = collectUniquePaths([filePath]);
  if (normalizedTargets.length === 0) {
    return {
      filePath,
      success: false,
      skipped: true,
      reason: 'invalid_target'
    };
  }

  const normalizedFilePath = normalizedTargets[0];
  const disk = await inspectDiskPresence(projectPath, normalizedFilePath);
  if (!disk.exists) {
    return {
      filePath: normalizedFilePath,
      disk,
      success: false,
      skipped: true,
      reason: 'file_missing'
    };
  }

  const reindexResult = await reindexCompilerFile(normalizedFilePath, projectPath);
  return {
    filePath: normalizedFilePath,
    disk,
    success: !!reindexResult?.success,
    skipped: false,
    reindexResult
  };
}

export async function reindexSettlementTargets(projectPath, reindexTargets = []) {
  const results = [];

  for (const filePath of collectUniquePaths(reindexTargets)) {
    results.push(await reindexMutationTarget(projectPath, filePath));
  }

  return results;
}
