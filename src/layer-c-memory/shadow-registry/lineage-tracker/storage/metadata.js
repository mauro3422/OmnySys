/**
 * @fileoverview Metadata Extractor
 * 
 * Extrae metadata relevante para storage.
 * 
 * @module layer-c-memory/shadow-registry/lineage-tracker/storage/metadata
 */

/**
 * Extrae metadata relevante para storage
 * @param {Object} atom - Átomo fuente
 * @returns {Object} Metadata extraída
 */
export function extractMetadata(atom) {
  return {
    name: atom.name,
    dataFlow: atom.dataFlow ? {
      inputCount: atom.dataFlow.inputs?.length || 0,
      outputCount: atom.dataFlow.outputs?.length || 0,
      transformationCount: atom.dataFlow.transformations?.length || 0
    } : null,
    semantic: atom.semantic,
    filePath: atom.filePath,
    lineNumber: atom.lineNumber,
    isExported: atom.isExported
  };
}
