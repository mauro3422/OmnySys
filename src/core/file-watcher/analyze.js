import { createLogger } from '../../utils/logger.js';

const logger = createLogger('OmnySys:analyze');

import { parseFileFromDisk } from '../../layer-a-static/parser/index.js';
import { analyzeFileCore, calculateShadowVolume } from '../../layer-a-static/pipeline/core-analyzer.js';
import { persistAnalysisArtifacts } from './analyze-persistence.js';

import {
  _calculateContentHash,
  _detectChangeType,
  buildFileResult
} from './analyze-utils.js';

export { _detectChangeType, _calculateContentHash };

/**
 * Collects and builds the analysis result for a single file.
 */
export async function collectFileAnalysis(filePath, fullPath) {
  try {
    const parsed = await parseFileFromDisk(fullPath);
    if (!parsed) throw new Error('Failed to parse file');

    const coreAnalysis = await analyzeFileCore(filePath, this.rootPath, {
      depth: 'deep',
      source: parsed.source
    });

    const moleculeAtoms = coreAnalysis.atoms;
    const metadata = coreAnalysis.metadata;

    const shadowStats = calculateShadowVolume(parsed.source, moleculeAtoms);
    metadata.shadowVolume = shadowStats.percentage;
    metadata.unindexedLines = shadowStats.unindexedLines;

    await persistAnalysisArtifacts(this.rootPath, filePath, moleculeAtoms);

    const contentHash = await _calculateContentHash(fullPath);
    const result = buildFileResult(filePath, parsed, coreAnalysis.parsed.imports || [], [], [], metadata, moleculeAtoms, contentHash);

    result.moleculeAtoms = moleculeAtoms;

    return result;
  } catch (error) {
    logger.error(`Error in collectFileAnalysis for ${filePath}: ${error.message}`);
    throw error;
  }
}

/**
 * Collects, indexes and validates a file in the system.
 */
export async function collectAndIndexFile(filePath, fullPath, isUpdate = false) {
  const analysis = await collectFileAnalysis.call(this, filePath, fullPath);
  logger.info(`🧩 FileWatcher compile: ${filePath} -> ${analysis.moleculeAtoms?.length || 0} atoms, shadow=${analysis.metadata?.shadowVolume ?? 'n/a'}%${isUpdate ? ' [update]' : ' [create]'}`);

  if (analysis.moleculeAtoms && analysis.moleculeAtoms.length > 0) {
    try {
      const { guardRegistry } = await import(`./guards/registry.js?bust=${Date.now()}`);
      await guardRegistry.initializeDefaultGuards();

      await guardRegistry.runSemanticGuards(this.rootPath, filePath, this, analysis.moleculeAtoms, { verbose: true });
      logger.info(`🛡️  Semantic guards checked: ${filePath}`);
    } catch (guardError) {
      logger.debug(`Semantic guards failed or skipped for ${filePath}: ${guardError.message}`);
    }
  }

  return analysis;
}
