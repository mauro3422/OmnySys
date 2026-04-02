import { createLogger } from '../../utils/logger.js';
import { parseFileFromDisk } from '../../layer-a-static/parser/index.js';
import { analyzeFileCore, calculateShadowVolume } from '../../layer-a-static/pipeline/core-analyzer.js';
import { persistAnalysisArtifacts } from './analyze-persistence.js';
import { saveFileResult } from '../../layer-a-static/pipeline/single-file-db.js';
import {
  _calculateContentHash,
  buildFileResult
} from './analyze-utils.js';

const logger = createLogger('OmnySys:analyze:flow');

export async function collectAndBuildFileAnalysis(context, filePath, fullPath) {
  try {
    const parsed = await parseFileFromDisk(fullPath);
    if (!parsed) throw new Error('Failed to parse file');

    const coreAnalysis = await analyzeFileCore(filePath, context.rootPath, {
      depth: 'deep',
      source: parsed.source
    });

    const moleculeAtoms = coreAnalysis.atoms;
    const metadata = coreAnalysis.metadata;

    const shadowStats = calculateShadowVolume(parsed.source, moleculeAtoms);
    metadata.shadowVolume = shadowStats.percentage;
    metadata.unindexedLines = shadowStats.unindexedLines;

    await persistAnalysisArtifacts(context.rootPath, filePath, moleculeAtoms);

    const contentHash = await _calculateContentHash(fullPath);
    const result = buildFileResult(filePath, parsed, coreAnalysis.parsed.imports || [], [], [], metadata, moleculeAtoms, contentHash);
    await saveFileResult(context.rootPath, filePath, result, contentHash, null, false, false);

    result.moleculeAtoms = moleculeAtoms;
    return result;
  } catch (error) {
    logger.error(`Error in collectAndBuildFileAnalysis for ${filePath}: ${error.message}`);
    throw error;
  }
}

export async function runFileWatcherSemanticGuards(context, filePath, moleculeAtoms) {
  if (!moleculeAtoms || moleculeAtoms.length === 0) return;

  try {
    const { guardRegistry } = await import(`./guards/registry.js?bust=${Date.now()}`);
    await guardRegistry.initializeDefaultGuards();
    await guardRegistry.runSemanticGuards(context.rootPath, filePath, context, moleculeAtoms, { verbose: true });
    logger.info(`🛡️  Semantic guards checked: ${filePath}`);
  } catch (guardError) {
    logger.debug(`Semantic guards failed or skipped for ${filePath}: ${guardError.message}`);
  }
}
