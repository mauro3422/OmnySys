/**
 * @fileoverview function-extractor.js
 * 
 * Extrae funciones declaradas y expresadas
 * Siguiendo SRP: Solo extrae funciones, nada más
 * 
 * @module extractors/atomic/function-extractor
 */

import { extractSignature, extractDataFlow, extractCalls, calculateComplexity, isExported, createAtom } from './utils.js';

/**
 * Extrae funciones declaradas: function name() {}
 * @param {Object} path - Nodo AST de Babel
 * @param {string} filePath - Ruta del archivo
 * @returns {Object} - Átomo de función
 */
export function extractFunctionDeclaration(path, filePath) {
  const node = path.node;
  const name = node.id?.name || 'anonymous';
  
  return createAtom({
    id: `${filePath}::${name}`,
    name,
    type: 'function',
    file: filePath,
    line: node.loc?.start?.line,
    column: node.loc?.start?.column,
    signature: extractSignature(node),
    dataFlow: extractDataFlow(path),
    calls: extractCalls(path),
    complexity: calculateComplexity(path),
    exported: isExported(path),
    visibility: 'public'
  });
}

/**
 * Extrae funciones expresadas: const x = function() {}
 * @param {Object} path - Nodo AST de Babel
 * @param {string} filePath - Ruta del archivo  
 * @returns {Object} - Átomo de función expresada
 */
export function extractFunctionExpression(path, filePath) {
  const node = path.node;
  const varName = path.parent.id?.name || 'anonymous';
  
  return createAtom({
    id: `${filePath}::${varName}`,
    name: varName,
    type: 'function-expression',
    file: filePath,
    line: node.loc?.start?.line,
    column: node.loc?.start?.column,
    signature: extractSignature(node),
    dataFlow: extractDataFlow(path),
    calls: extractCalls(path),
    complexity: calculateComplexity(path),
    exported: isExported(path.parentPath.parentPath),
    visibility: 'public'
  });
}
