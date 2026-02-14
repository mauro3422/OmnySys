/**
 * @fileoverview Metadata Extractor
 * 
 * Extracts function metadata from atoms
 * 
 * @module function-cycle-classifier/extractors/metadata-extractor
 */

/**
 * Extract metadata from an atom
 * @param {Object} atom - Atom data
 * @returns {Object} Extracted metadata
 */
export function extractFunctionMetadata(atom) {
  return {
    name: atom.name,
    complexity: atom.complexity || 0,
    hasSideEffects: atom.hasSideEffects || false,
    hasNetworkCalls: atom.hasNetworkCalls || false,
    hasStorageAccess: atom.hasStorageAccess || false,
    hasErrorHandling: atom.hasErrorHandling || false,
    isAsync: atom.isAsync || false,
    hasLifecycleHooks: atom.hasLifecycleHooks || false,
    temporal: atom.temporal || {},
    calls: atom.calls || []
  };
}

/**
 * Extract metadata for all functions in a cycle
 * @param {Array} cycle - Function IDs in cycle
 * @param {Object} atomsIndex - Index of atoms by file
 * @returns {Object} Metadata map by function ID
 */
export function extractCycleMetadata(cycle, atomsIndex) {
  const metadata = {};
  
  for (const funcId of cycle) {
    const parts = funcId.split('::');
    if (parts.length !== 2) continue;
    
    const [filePath, funcName] = parts;
    const fileData = atomsIndex[filePath];
    
    if (fileData?.atoms) {
      const atom = fileData.atoms.find(a => a.name === funcName);
      if (atom) {
        metadata[funcId] = extractFunctionMetadata(atom);
      }
    }
  }
  
  return metadata;
}
