/**
 * @fileoverview analysis-checker.js
 *
 * Verifica y ejecuta Layer A si es necesario.
 * Flujo: Verifica .omnysysdata/ -> Ejecuta Layer A si falta -> Espera completado
 *
 * @module mcp/core/analysis-checker
 */

import { createLogger } from '../../../utils/logger.js';
import { hasExistingAnalysis } from './analysis-checker/file-scanner.js';
import { detectCacheChanges } from './analysis-checker/change-detector.js';
import { countPendingLLMAnalysis } from './analysis-checker/llm-analyzer.js';
import { runFullIndexing } from './analysis-checker/index-runner.js';

const logger = createLogger('OmnySys:analysis:checker');

/**
 * Verifica y ejecuta analisis si es necesario
 * Flujo principal llamado durante inicializacion
 * @param {string} projectPath - Project root path
 * @returns {Promise<Object>} - Result object
 */
export async function checkAndRunAnalysis(projectPath) {
  try {
    const { getProjectMetadata } =
      await import('#layer-c/query/apis/project-api.js');

    const hasAnalysis = await hasExistingAnalysis(projectPath);

    if (!hasAnalysis) {
      logger.info('⚠️  No analysis found, running Layer A...');
      logger.info('   ⏳ This may take 30-60 seconds...\n');

      await runFullIndexing(projectPath);

      logger.info('\n✅ Layer A completed');
      logger.info('   🤖 LLM enrichment will continue in background');
      return { ran: true, filesAnalyzed: 0 };
    }

    const metadata = await getProjectMetadata(projectPath);
    const fileCount = metadata?.metadata?.totalFiles || 0;

    logger.info(`✅ Found existing analysis: ${fileCount} files`);

    const hasValidBaseAnalysis =
      fileCount > 0 &&
      (metadata?.fileIndex || metadata?.files) &&
      metadata?.metadata?.enhanced === true;

    if (!hasValidBaseAnalysis) {
      logger.info('   🚨 Analysis incomplete, running Layer A...');
      logger.info('   ⏳ This may take 30-60 seconds...\n');

      await runFullIndexing(projectPath);

      logger.info('\n✅ Layer A completed');
      logger.info('   🤖 LLM enrichment will continue in background');
      return { ran: true, filesAnalyzed: fileCount };
    }

    logger.info('   ✅ Layer A analysis valid');

    logger.info('   🔍 Checking for file changes...');
    const changes = await detectCacheChanges(projectPath, metadata);
    
    const hasChanges = changes.newFiles.length > 0 || 
                       changes.modifiedFiles.length > 0 || 
                       changes.deletedFiles.length > 0;
    
    if (hasChanges) {
      logger.info(`   🔄 Changes detected:`);
      if (changes.newFiles.length > 0) {
        logger.info(`      + ${changes.newFiles.length} new files`);
      }
      if (changes.modifiedFiles.length > 0) {
        logger.info(`      ~ ${changes.modifiedFiles.length} modified files`);
      }
      if (changes.deletedFiles.length > 0) {
        logger.info(`      - ${changes.deletedFiles.length} deleted files`);
      }
      logger.info('   🚀 Re-running Layer A analysis...');
      logger.info('   ⏳ This may take 30-60 seconds...\n');
      
      await runFullIndexing(projectPath);
      
      logger.info('\n✅ Layer A completed (updated)');
      logger.info('   🤖 LLM enrichment will continue in background');
      return { ran: true, filesAnalyzed: changes.unchangedFiles.length + changes.newFiles.length + changes.modifiedFiles.length };
    }

    const pendingLLM = await countPendingLLMAnalysis(projectPath);
    if (pendingLLM > 0) {
      logger.info(`   ⏳ ${pendingLLM} files pending LLM enrichment (background)`);
    } else {
      logger.info('   ✅ All files processed (no changes detected)');
    }

    return { ran: false, filesAnalyzed: fileCount };
  } catch (error) {
    logger.info('   ❌ Analysis check failed:', error.message);
    throw error;
  }
}
