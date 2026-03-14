/**
 * @fileoverview class-name-extractor.js
 *
 * Helper compartido para extraer nombres de clases desde nodos Tree-sitter.
 * Evita duplicación conceptual entre extractors.
 *
 * @module layer-a-static/extractors/utils/class-name-extractor
 */

/**
 * Extrae el nombre de una class_declaration o class
 * @param {import('tree-sitter').SyntaxNode} node - Nodo del árbol
 * @param {string} code - Código fuente
 * @returns {string|null} Nombre de la clase o null
 */
export function extractClassName(node, code) {
  const nameNode = node.childForFieldName('name');
  return nameNode ? text(nameNode, code) : 'anonymous';
}

/**
 * Extrae nombre de clase desde el ID de un átomo
 * Formato: "path::ClassName.methodName"
 * @param {string} atomId - ID del átomo
 * @returns {string|null} Nombre de la clase o null
 */
export function extractClassNameFromAtomId(atomId) {
  if (!atomId) return null;
  
  const idParts = atomId.split('::');
  if (idParts?.length === 2) {
    const classMethod = idParts[1]; // "GraphBuilder.build"
    const [className] = classMethod.split('.');
    return className;
  }
  return null;
}

/**
 * Convierte camelCase a underscore_case
 * @param {string} str - Input string
 * @returns {string} Underscore case string
 */
export function camelToUnderscore(str) {
  return str.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
}

/**
 * Remueve sufijos comunes de nombres de clase
 * @param {string} className - Nombre de clase
 * @param {string[]} suffixes - Sufijos a remover (default: ['Builder'])
 * @returns {string} Nombre sin sufijos
 */
export function removeClassSuffixes(className, suffixes = ['Builder']) {
  let result = className;
  for (const suffix of suffixes) {
    if (result.endsWith(suffix)) {
      result = result.slice(0, -suffix.length);
      break;
    }
  }
  return result;
}

// Helper interno
function text(node, code) {
  return code.slice(node.startIndex, node.endIndex);
}
