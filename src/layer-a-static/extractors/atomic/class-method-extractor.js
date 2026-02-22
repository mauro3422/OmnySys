/**
 * @fileoverview class-method-extractor.js
 * 
 * Extrae métodos de clase: métodos regulares, estáticos, privados, getters/setters
 * Siguiendo SRP: Solo extrae métodos de clase
 * 
 * @module extractors/atomic/class-method-extractor
 */

import { extractSignature, extractDataFlow, extractCalls, calculateComplexity, createAtom } from './utils.js';

/**
 * Extrae método de clase regular: class X { method() {} }
 * @param {Object} path - Nodo AST de Babel
 * @param {string} filePath - Ruta del archivo
 * @param {string} className - Nombre de la clase
 * @returns {Object} - Átomo de método
 */
export function extractClassMethod(path, filePath, className) {
  const node = path.node;
  const name = node.key.name;
  
  return createAtom({
    id: `${filePath}::${className}.${name}`,
    name,
    type: node.static ? 'static' : 'method',
    className,
    file: filePath,
    line: node.loc?.start?.line,
    endLine: node.loc?.end?.line,
    column: node.loc?.start?.column,
    signature: extractSignature(node),
    dataFlow: extractDataFlow(path),
    calls: extractCalls(path),
    complexity: calculateComplexity(path),
    exported: false, // Los métodos se exportan vía clase
    visibility: 'public'
  });
}

/**
 * Extrae método privado: class X { #method() {} }
 * @param {Object} path - Nodo AST de Babel
 * @param {string} filePath - Ruta del archivo
 * @param {string} className - Nombre de la clase
 * @returns {Object} - Átomo de método privado
 */
export function extractPrivateMethod(path, filePath, className) {
  const node = path.node;
  const name = `#${node.key.id?.name}`;
  
  return createAtom({
    id: `${filePath}::${className}.${name}`,
    name,
    type: 'private-method',
    className,
    file: filePath,
    line: node.loc?.start?.line,
    endLine: node.loc?.end?.line,
    column: node.loc?.start?.column,
    signature: extractSignature(node),
    dataFlow: extractDataFlow(path),
    calls: extractCalls(path),
    complexity: calculateComplexity(path),
    exported: false,
    visibility: 'private'
  });
}

/**
 * Extrae getter/setter: class X { get prop() {} / set prop(val) {} }
 * @param {Object} path - Nodo AST de Babel
 * @param {string} filePath - Ruta del archivo
 * @param {string} className - Nombre de la clase
 * @returns {Object} - Átomo de getter/setter
 */
export function extractAccessor(path, filePath, className) {
  const node = path.node;
  const name = node.key?.name;
  const type = node.kind; // 'get' o 'set'
  
  return createAtom({
    id: `${filePath}::${className}.${name}`,
    name,
    type: type === 'get' ? 'getter' : 'setter',
    className,
    file: filePath,
    line: node.loc?.start?.line,
    endLine: node.loc?.end?.line,
    column: node.loc?.start?.column,
    signature: extractSignature(node),
    dataFlow: extractDataFlow(path),
    calls: extractCalls(path),
    complexity: 1, // Getters/setters son simples por definición
    exported: false,
    visibility: 'public'
  });
}
