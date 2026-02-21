/**
 * Extractor runner - executes all registered extractors
 * @module pipeline/phases/atom-extraction/extraction/atom-extractor/extractor-runner
 */

import { getAtomLevelExtractors } from '#layer-a/extractors/metadata/registry.js';
import { logger } from '#utils/logger.js';
import { loadExtractor } from './extractor-loader.js';

/**
 * Run all registered atom-level extractors in order.
 * Each extractor's result is stored in results[entry.name] and available
 * to subsequent extractors via ctx.results.
 * @param {Object} ctx - { functionCode, functionInfo, fileMetadata, filePath }
 * @returns {Promise<Object>} - Map of extractor name → result
 */
export async function runAtomExtractors(ctx) {
  const results = {};
  ctx.results = results;

  for (const entry of getAtomLevelExtractors()) {
    try {
      const fn = await loadExtractor(entry);
      const args = entry.getArgs(ctx);
      results[entry.name] = fn(...args);
    } catch (err) {
      logger.warn(`Extractor "${entry.name}" failed: ${err.message}`);
      results[entry.name] = null;
    }
  }

  return results;
}
