/**
 * @fileoverview Class Extractor
 * 
 * Extrae definiciones de clases.
 * 
 * @module parser/extractors/definitions/class-extractor
 */

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
