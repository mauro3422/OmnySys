/**
 * Extractor loader with caching
 * @module pipeline/phases/atom-extraction/extraction/atom-extractor/extractor-loader
 */

import { logger } from '#utils/logger.js';

// atom-extractor.js lives in: src/layer-a-static/pipeline/phases/atom-extraction/extraction/
// extractors live in:         src/layer-a-static/extractors/metadata/
// → 4 levels up from extraction/ to reach layer-a-static/
const EXTRACTORS_BASE = new URL('../../../../extractors/metadata/', import.meta.url).href;

const _extractorCache = new Map();

/**
 * Load an extractor function from the registry, with caching.
 * @param {Object} entry - Registry entry
 * @returns {Promise<Function>}
 */
export async function loadExtractor(entry) {
  if (_extractorCache.has(entry.name)) {
    return _extractorCache.get(entry.name);
  }
  const url = new URL(entry.file, EXTRACTORS_BASE).href;
  const mod = await import(url);
  const fn = mod[entry.function];
  if (typeof fn !== 'function') {
    throw new Error(`Extractor "${entry.name}" export "${entry.function}" is not a function in ${url}`);
  }
  _extractorCache.set(entry.name, fn);
  return fn;
}
