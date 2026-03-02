/**
 * Extractor loader with caching
 * @module pipeline/phases/atom-extraction/extraction/atom-extractor/extractor-loader
 */

import { logger } from '#utils/logger.js';
import { getAtomLevelExtractors } from '#layer-a/extractors/metadata/registry.js';

const EXTRACTORS_BASE = new URL('../../../../../extractors/metadata/', import.meta.url).href;

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

/**
 * Get a cached extractor synchronously (only call after warmExtractorCache()).
 * @param {Object} entry - Registry entry
 * @returns {Function|null}
 */
export function getExtractorSync(entry) {
  return _extractorCache.get(entry.name) || null;
}

/**
 * Pre-warm all atom-level extractor modules.
 * Call once at worker startup before processing any files.
 * Reduces per-atom overhead from ~4ms (cold) to ~0.7ms (warm).
 * @returns {Promise<void>}
 */
export async function warmExtractorCache() {
  const entries = getAtomLevelExtractors();
  await Promise.all(entries.map(entry => loadExtractor(entry)));
  logger.debug(`[ExtractorLoader] Warmed ${entries.length} extractors`);
}
