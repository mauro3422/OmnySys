/**
 * @fileoverview metadata.js
 * 
 * Function metadata extraction utilities
 * 
 * @module function-cycle-classifier/utils/metadata
 */

export { extractFunctionMetadata } from '../extractors/metadata-extractor.js';
import { extractFunctionMetadata } from '../extractors/metadata-extractor.js';

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
