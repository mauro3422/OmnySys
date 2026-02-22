/**
 * @fileoverview arrow-extractor.js
 * 
 * Extrae arrow functions
 * Siguiendo SRP: Solo extrae arrow functions
 * 
 * @module extractors/atomic/arrow-extractor
 */

import { extractSignature, extractDataFlow, extractCalls, calculateComplexity, isExported, createAtom } from './utils.js';

/**
 * Extrae arrow functions: const x = () => {}
 * @param {Object} path - Nodo AST de Babel
 * @param {string} filePath - Ruta del archivo
 * @returns {Object} - Átomo de arrow function
 */
export function extractArrowFunction(path, filePath) {
  const node = path.node;
  const varName = path.parent.id?.name || 'anonymous';
  
  return createAtom({
    id: `${filePath}::${varName}`,
    name: varName,
    type: 'arrow',
    file: filePath,
    line: node.loc?.start?.line,
    endLine: node.loc?.end?.line,
    column: node.loc?.start?.column,
    signature: extractSignature(node),
    dataFlow: extractDataFlow(path),
    calls: extractCalls(path),
    complexity: calculateComplexity(path),
    exported: isExported(path.parentPath.parentPath),
    visibility: 'public'
  });
}
