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
      const result = fn(...args);
      results[entry.name] = result;
      
      // Log treeSitter results for debugging
      if (entry.name === 'treeSitter' && ctx.filePath) {
        console.log(`[treeSitter] ${ctx.filePath}:`, {
          hasSharedState: result?.sharedStateAccess?.length > 0,
          hasEmitters: result?.eventEmitters?.length > 0,
          hasListeners: result?.eventListeners?.length > 0
        });
      }
    } catch (err) {
      console.warn(`Extractor "${entry.name}" failed for ${ctx.filePath || 'unknown'}: ${err.message}`);
      results[entry.name] = null;
    }
  }

  return results;
}
