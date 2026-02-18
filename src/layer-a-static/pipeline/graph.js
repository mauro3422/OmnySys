import { buildGraph } from '#layer-graph/index.js';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('OmnySys:graph');



export function buildSystemGraph(normalizedParsedFiles, normalizedResolvedImports, verbose = true) {
  if (verbose) logger.info('Building dependency graph...');
  const systemMap = buildGraph(normalizedParsedFiles, normalizedResolvedImports);
  if (verbose) {
    logger.info(`  ✓ Graph with ${systemMap.metadata.totalFiles} files`);
    logger.info(`  ✓ ${systemMap.metadata.totalDependencies} dependencies found`);
    if (systemMap.metadata.cyclesDetected.length > 0) {
      logger.info(`  ⚠️  ${systemMap.metadata.cyclesDetected.length} cycles detected!`);
    }
    logger.info('');
  }
  return systemMap;
}
