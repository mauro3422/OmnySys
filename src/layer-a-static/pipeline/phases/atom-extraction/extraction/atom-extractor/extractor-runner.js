/**
 * Extractor runner - executes all registered extractors
 * @module pipeline/phases/atom-extraction/extraction/atom-extractor/extractor-runner
 *
 * ✅ OPT: usa getExtractorSync() cuando el cache está caliente (warmExtractorCache()
 *         fue llamado al inicio del worker), eliminando el overhead de async/await
 *         por cada uno de los 8 extractores × 18,546 átomos.
 */

import { getAtomLevelExtractors } from '#layer-a/extractors/metadata/registry.js';
import { logger } from '#utils/logger.js';
import { loadExtractor, getExtractorSync } from './extractor-loader.js';

/**
 * Run all registered atom-level extractors in order.
 * Uses sync path when cache is warm (after warmExtractorCache()), async path on cold start.
 * @param {Object} ctx - { functionCode, functionInfo, fileMetadata, filePath, fullFileCode }
 * @returns {Promise<Object>} - Map of extractor name → result
 */
export async function runAtomExtractors(ctx) {
  const results = {};
  ctx.results = results;

  for (const entry of getAtomLevelExtractors()) {
    try {
      // Fast path: use sync accessor when cache is already warm (loaded by warmExtractorCache)
      let fn = getExtractorSync(entry);
      if (!fn) {
        // Cold path: only on the very first atom processed by this worker
        fn = await loadExtractor(entry);
      }
      const args = entry.getArgs(ctx);
      results[entry.name] = fn(...args);

    } catch (err) {
      console.warn(`Extractor "${entry.name}" failed for ${ctx.filePath || 'unknown'}: ${err.message}`);
      results[entry.name] = null;
    }
  }

  return results;
}
