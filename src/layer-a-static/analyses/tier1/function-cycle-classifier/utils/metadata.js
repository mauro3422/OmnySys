/**
 * @fileoverview metadata.js
 * 
 * Function metadata extraction utilities
 * 
 * @module function-cycle-classifier/utils/metadata
 */

/**
 * Extrae metadatos SOLO de campos confirmados que existen
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
 * Build metadata index for cycle functions
 */
export function buildMetadataIndex(cycle, atomsIndex) {
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
