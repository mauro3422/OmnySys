/**
 * @fileoverview path-utils.js
 *
 * Utilidades para normalizar y comparar paths.
 * Las funciones puras viven en #shared/utils/path-utils.js —
 * este archivo re-exporta desde ahí para mantener compat con consumers de layer-c.
 *
 * @module verification/utils/path-utils
 */

export {
  normalizePath,
  arePathsEqual,
  isTestFile,
  isScriptFile,
  classifyFile
} from '#shared/utils/path-utils.js';
