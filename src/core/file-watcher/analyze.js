import { collectAndBuildFileAnalysis, runFileWatcherSemanticGuards } from './analyze-flow.js';
import { buildFileWatcherCompileLogMessage } from './analyze-output.js';
import { _calculateContentHash, _detectChangeType } from './detection.js';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('OmnySys:analyze');

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
  logger.info(buildFileWatcherCompileLogMessage(filePath, analysis, isUpdate));
  await runFileWatcherSemanticGuards(this, filePath, analysis.moleculeAtoms);

  return analysis;
}

