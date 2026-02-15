/**
 * @fileoverview Error Flow Module
 * 
 * Sistema modular de análisis de flujo de errores.
 * 
 * @module error-flow
 * @version 2.0.0
 */

// Main function
export { extractErrorFlow } from './extractors/error-flow-extractor.js';

// Extractors
export { extractThrows } from './extractors/throw-extractor.js';
export { extractCatches, extractTryBlocks } from './extractors/catch-extractor.js';

// Analyzers
export { detectPropagationPattern, detectUnhandledCalls } from './analyzers/propagation-analyzer.js';

/**
 * Compatibility adapter used by pipeline connection enricher.
 * Builds coarse-grained error flow links between atoms.
 */
export function extractErrorFlowConnections(atoms = []) {
  if (!Array.isArray(atoms) || atoms.length === 0) {
    return [];
  }

  const connections = [];
  const throwers = atoms.filter((atom) => (atom.errorFlow?.throws || []).length > 0);
  const catchers = atoms.filter((atom) => (atom.errorFlow?.catches || []).length > 0);

  for (const source of throwers) {
    for (const target of catchers) {
      if (source.id === target.id) continue;

      connections.push({
        type: 'error-flow',
        from: source.id,
        to: target.id,
        relationship: 'throws-caught-by',
        confidence: 0.5
      });
    }
  }

  return connections;
}
