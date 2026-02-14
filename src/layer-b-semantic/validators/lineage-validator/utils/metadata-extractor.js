/**
 * @fileoverview Metadata Extractor
 * 
 * Extrae metadatos validados para guardar.
 * 
 * @module layer-b-semantic/validators/lineage-validator/utils/metadata-extractor
 */

/**
 * Extrae metadatos validados para guardar
 * @param {Object} atom - Átomo fuente
 * @returns {Object} Metadatos extraídos
 */
export function extractMetadata(atom) {
  return {
    id: atom.id,
    name: atom.name,
    dna: atom.dna,
    dataFlow: {
      inputCount: atom.dataFlow?.inputs?.length || 0,
      outputCount: atom.dataFlow?.outputs?.length || 0,
      transformationCount: atom.dataFlow?.transformations?.length || 0,
      flowType: atom.dna?.flowType || 'unknown'
    },
    semantic: atom.semantic ? {
      verb: atom.semantic.verb,
      domain: atom.semantic.domain,
      entity: atom.semantic.entity,
      operationType: atom.semantic.operationType
    } : null,
    filePath: atom.filePath,
    lineNumber: atom.lineNumber,
    isExported: atom.isExported
  };
}
