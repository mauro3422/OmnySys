/**
 * @fileoverview analysis-checker.js
 *
 * Verifica y ejecuta Layer A si es necesario.
 * Flujo: Verifica .omnysysdata/ -> Ejecuta Layer A si falta -> Espera completado
 *
 * @module mcp/core/analysis-checker
 */

import path from 'path';
import fs from 'fs/promises';

const DATA_DIR = '.omnysysdata';
import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('OmnySys:analysis:checker');



/**
 * Verifica si existe analisis previo en .omnysysdata/
 */
async function hasExistingAnalysis(projectPath) {
  try {
    const indexPath = path.join(projectPath, DATA_DIR, 'index.json');
    await fs.access(indexPath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Cuenta archivos pendientes de analisis LLM
 */
async function countPendingLLMAnalysis(projectPath) {
  try {
    const { getProjectMetadata, getFileAnalysis } =
      await import('#layer-a/query/index.js');

    const metadata = await getProjectMetadata(projectPath);

    let pendingCount = 0;
    const fileEntries = metadata?.fileIndex || metadata?.files || {};

    for (const filePath of Object.keys(fileEntries)) {
      const analysis = await getFileAnalysis(projectPath, filePath);

      // Un archivo necesita LLM si:
      // 1. No tiene llmInsights Y
      // 2. Tiene caracteristicas que sugieren que necesita LLM
      if (!analysis?.llmInsights) {
        const needsLLM =
          analysis?.semanticAnalysis?.sharedState?.writes?.length > 0 ||
          analysis?.semanticAnalysis?.eventPatterns?.eventListeners?.length > 0 ||
          (analysis?.exports?.length > 0 && analysis?.dependents?.length === 0);

        if (needsLLM) pendingCount++;
      }
    }

    return pendingCount;
  } catch {
    return 0;
  }
}

/**
 * Ejecuta Layer A completo (BLOQUEANTE)
 */
async function runFullIndexing(projectPath) {
  const { indexProject } = await import('#layer-a/indexer.js');

  logger.error('   \uD83D\uDE80 Starting Layer A: Static Analysis...');
  logger.error('   \u23F3 This may take 30-60 seconds...');

  try {
    const result = await indexProject(projectPath, {
      verbose: true,
      skipLLM: false,
      outputPath: 'system-map.json'
    });

    logger.error(`\n   \uD83D\uDCCA Layer A: ${Object.keys(result.files || {}).length} files analyzed`);

    // Verificar si IA se activo
    const hasLLM = Object.values(result.files || {}).some(
      f => f.aiEnhancement || f.llmInsights
    );

    if (hasLLM) {
      logger.error('   \uD83E\uDD16 Layer B: IA enrichment applied');
    } else {
      logger.error('   \u2139\uFE0F  Layer B: Static analysis sufficient (no IA needed)');
    }

    return result;
  } catch (error) {
    logger.error('   \u274C Indexing failed:', error.message);
    throw error;
  }
}

/**
 * Verifica y ejecuta analisis si es necesario
 * Flujo principal llamado durante inicializacion
 */
export async function checkAndRunAnalysis(projectPath) {
  try {
    const { getProjectMetadata } =
      await import('#layer-a/query/index.js');

    const hasAnalysis = await hasExistingAnalysis(projectPath);

    if (!hasAnalysis) {
      logger.error('\u26A0\uFE0F  No analysis found, running Layer A...');
      logger.error('   \u23F3 This may take 30-60 seconds...\n');

      await runFullIndexing(projectPath);

      logger.error('\n\u2705 Layer A completed');
      logger.error('   \uD83E\uDD16 LLM enrichment will continue in background');
      return { ran: true, filesAnalyzed: 0 };
    }

    // Tiene analisis, verificar si es valido
    const metadata = await getProjectMetadata(projectPath);
    const fileCount = metadata?.metadata?.totalFiles || 0;

    logger.error(`\u2705 Found existing analysis: ${fileCount} files`);

    // Validar si el analisis base de Layer A esta completo
    const hasValidBaseAnalysis =
      fileCount > 0 &&
      (metadata?.fileIndex || metadata?.files) &&
      metadata?.metadata?.enhanced === true;

    if (!hasValidBaseAnalysis) {
      logger.error('   \uD83D\uDEA8 Analysis incomplete, running Layer A...');
      logger.error('   \u23F3 This may take 30-60 seconds...\n');

      await runFullIndexing(projectPath);

      logger.error('\n\u2705 Layer A completed');
      logger.error('   \uD83E\uDD16 LLM enrichment will continue in background');
      return { ran: true, filesAnalyzed: fileCount };
    }

    logger.error('   \u2705 Layer A analysis valid');

    // Verificar si hay archivos pendientes de LLM
    const pendingLLM = await countPendingLLMAnalysis(projectPath);
    if (pendingLLM > 0) {
      logger.error(`   \u23F3 ${pendingLLM} files pending LLM enrichment (background)`);
    } else {
      logger.error('   \u2705 All files processed');
    }

    return { ran: false, filesAnalyzed: fileCount };
  } catch (error) {
    logger.error('   \u274C Analysis check failed:', error.message);
    throw error;
  }
}
