/**
 * @fileoverview definitions.js
 * 
 * Extrae definiciones (funciones, clases, variables)
 * 
 * @module parser/extractors/definitions
 */

import { getFileId, isExportedFunction, findCallsInFunction } from '../helpers.js';

/**
 * Extrae definición de función
 * @param {Object} nodePath - Path de Babel
 * @param {string} filePath - Ruta del archivo
 * @param {Object} fileInfo - Info del archivo acumulada
 * @returns {Object} - Definición de función
 */
export function extractFunctionDefinition(nodePath, filePath, fileInfo) {
  const node = nodePath.node;
  
  fileInfo.definitions.push({
    type: 'function',
    name: node.id.name,
    params: node.params.length
  });

  const functionCalls = findCallsInFunction(nodePath);
  const isExported = isExportedFunction(node, fileInfo);

  fileInfo.functions.push({
    id: `${getFileId(filePath)}::${node.id.name}`,
    name: node.id.name,
    line: node.loc?.start.line || 0,
    endLine: node.loc?.end.line || 0,
    params: node.params.map(p => p.name || ''),
    isExported: isExported,
    calls: functionCalls
  });

  return fileInfo;
}

/**
 * Extrae definición de clase
 * @param {Object} nodePath - Path de Babel
 * @param {Object} fileInfo - Info del archivo acumulada
 * @returns {Object} - Definición de clase
 */
export function extractClassDefinition(nodePath, fileInfo) {
  const node = nodePath.node;
  
  if (node.id) {
    fileInfo.definitions.push({
      type: 'class',
      name: node.id.name
    });
  }

  return fileInfo;
}

/**
 * Extrae variables exportadas (constantes y objetos)
 * @param {Object} nodePath - Path de Babel
 * @param {Object} fileInfo - Info del archivo acumulada
 * @returns {Object} - Info actualizada
 */
export function extractVariableExports(nodePath, fileInfo) {
  const node = nodePath.node;

  // Solo nos interesan las constantes
  if (node.kind !== 'const') return fileInfo;

  node.declarations.forEach(declarator => {
    if (declarator.id.type === 'Identifier') {
      const name = declarator.id.name;
      const init = declarator.init;

      // Detectar si es un objeto (potencial estado mutable)
      if (init && init.type === 'ObjectExpression') {
        fileInfo.objectExports.push({
          name: name,
          line: declarator.loc?.start.line || 0,
          isMutable: true,
          properties: init.properties.length,
          warning: 'Exported mutable object - potential shared state'
        });
      }
      // Otras constantes exportadas
      else {
        fileInfo.constantExports.push({
          name: name,
          line: declarator.loc?.start.line || 0,
          valueType: init ? init.type : 'unknown'
        });
      }
    }
  });

  return fileInfo;
}
