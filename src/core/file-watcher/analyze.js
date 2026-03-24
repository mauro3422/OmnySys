import { createLogger } from '../../utils/logger.js';

const logger = createLogger('OmnySys:analyze');

import { collectAndBuildFileAnalysis, runFileWatcherSemanticGuards } from './analyze-flow.js';
import { _calculateContentHash, _detectChangeType } from './analyze-utils.js';

export { _detectChangeType, _calculateContentHash };

/**
 * Collects and builds the analysis result for a single file.
 */
export async function collectFileAnalysis(filePath, fullPath) {
  return await collectAndBuildFileAnalysis(this, filePath, fullPath);
}

/**
 * Collects, indexes and validates a file in the system.
 */
export async function collectAndIndexFile(filePath, fullPath, isUpdate = false) {
  const analysis = await collectFileAnalysis.call(this, filePath, fullPath);
  logger.info(`🧩 FileWatcher compile: ${filePath} -> ${analysis.moleculeAtoms?.length || 0} atoms, shadow=${analysis.metadata?.shadowVolume ?? 'n/a'}%${isUpdate ? ' [update]' : ' [create]'}`);
  await runFileWatcherSemanticGuards(this, filePath, analysis.moleculeAtoms);

  return analysis;
}
