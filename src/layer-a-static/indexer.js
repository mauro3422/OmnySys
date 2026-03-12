/**
 * @fileoverview Refactored Orchestrator for Layer A
 */

import path from 'path';
import { createLogger } from '../utils/logger.js';
import { analyzeSingleFile } from './pipeline/single-file.js';
import { buildIndexProjectRunner } from './indexer-project-runner.js';
import { buildRefreshPatternsRunner } from './indexer-refresh-runner.js';
import { createIndexerErrorResult } from './indexer-fallback.js';

const logger = createLogger('OmnySys:indexer');

/**
 * Indexa un proyecto completo utilizando el nuevo PipelineRunner
 */
export async function indexProject(rootPath, options = {}) {
  const {
    outputPath = 'system-map.json',
    verbose = true,
    singleFile = null,
    incremental = false,
    skipLLM = false
  } = options;

  const startTime = Date.now();
  const absoluteRootPath = path.isAbsolute(rootPath) ? rootPath : path.resolve(process.cwd(), rootPath);

  try {
    if (singleFile) {
      return await analyzeSingleFile(absoluteRootPath, singleFile, { verbose, incremental });
    }

    const runner = buildIndexProjectRunner({
      absoluteRootPath,
      verbose,
      options: { ...options, outputPath },
      logger,
      skipLLM
    });

    const finalContext = await runner.run(verbose);
    if (verbose) {
      logger.info(`Indexing completed in ${Date.now() - startTime}ms`);
    }
    return finalContext.systemMap;
  } catch (error) {
    logger.error('indexProject failed:', error);
    return createIndexerErrorResult(error);
  }
}

/**
 * Re-calcula patrones y métricas de calidad sin re-indexar/re-parsear archivos.
 * Útil cuando cambian las reglas de los detectores.
 */
export async function refreshPatterns(rootPath, verbose = true) {
  const startTime = Date.now();
  const absoluteRootPath = path.isAbsolute(rootPath) ? rootPath : path.resolve(process.cwd(), rootPath);

  try {
    const runner = buildRefreshPatternsRunner({ absoluteRootPath, verbose, logger });
    const finalContext = await runner.run(verbose);
    if (verbose) {
      logger.info(`Pattern refresh completed in ${Date.now() - startTime}ms`);
    }
    return finalContext.enhancedSystemMap;
  } catch (error) {
    logger.error('refreshPatterns failed:', error);
    return createIndexerErrorResult(error);
  }
}

const isMainModule = process.argv[1]?.includes('indexer.js') || false;
if (isMainModule) {
  const projectPath = process.argv[2] || process.cwd();
  indexProject(projectPath, { verbose: true }).catch((error) => {
    logger.error('Indexer failed:', error);
    process.exit(1);
  });
}
