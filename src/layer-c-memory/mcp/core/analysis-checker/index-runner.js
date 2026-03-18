/**
 * Index runner utilities
 * @module mcp/core/analysis-checker/index-runner
 */

import { createLogger } from '../../../../utils/logger.js';
import { seedHashBaseline } from '../../../../layer-c-memory/storage/cache/hash-cache.js';

const logger = createLogger('OmnySys:analysis:checker');

/**
 * Ejecuta Layer A completo (BLOQUEANTE)
 * @param {string} projectPath - Project root path
 * @returns {Promise<Object>} - Indexing result
 */
export async function runFullIndexing(projectPath) {
  const { indexProject } = await import('#layer-a/indexer.js');

  logger.info('   🚀 Starting Layer A: Static Analysis...');
  logger.info('   ⏳ This may take 30-60 seconds...');

  try {
    const result = await indexProject(projectPath, {
      verbose: true,
      skipLLM: false,
      outputPath: 'system-map.json'
    });

    const analyzedFiles = Object.keys(result.files || {});
    if (analyzedFiles.length > 0) {
      const seeded = await seedHashBaseline(projectPath, analyzedFiles, true);
      if (seeded?.seeded > 0) {
        logger.info(`   🧾 Persisted file hash baseline for ${seeded.seeded} file(s)`);
      }
    }

    logger.info(`\n   📊 Layer A: ${analyzedFiles.length} files analyzed`);

    const hasLLM = Object.values(result.files || {}).some(
      f => f.aiEnhancement || f.llmInsights
    );

    if (hasLLM) {
      logger.info('   🤖 Layer B: IA enrichment applied');
    } else {
      logger.info('   ℹ️  Layer B: Static analysis sufficient (no IA needed)');
    }

    return result;
  } catch (error) {
    logger.info('   ❌ Indexing failed:', error.message);
    throw error;
  }
}
