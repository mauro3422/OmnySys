/**
 * @fileoverview typescript.js
 * 
 * Extrae definiciones TypeScript (interfaces, types, enums)
 * 
 * @module parser/extractors/typescript
 */

import { isNodeExported } from '../helpers.js';

/**
 * Extrae definición de interfaz TypeScript
 * @param {Object} nodePath - Path de Babel
 * @param {Object} fileInfo - Info del archivo acumulada
 * @returns {Object} - Info actualizada
 */
export function extractTSInterface(nodePath, fileInfo) {
  const node = nodePath.node;
  
  if (node.id) {
    const isExported = isNodeExported(nodePath);
    fileInfo.typeDefinitions.push({
      type: 'interface',
      name: node.id.name,
      line: node.loc?.start.line || 0,
      isExported: isExported,
      properties: node.body.body.length
    });
  }

  return fileInfo;
}

/**
 * Extrae type alias de TypeScript
 * @param {Object} nodePath - Path de Babel
 * @param {Object} fileInfo - Info del archivo acumulada
 * @returns {Object} - Info actualizada
 */
export function extractTSTypeAlias(nodePath, fileInfo) {
  const node = nodePath.node;
  
  if (node.id) {
    const isExported = isNodeExported(nodePath);
    fileInfo.typeDefinitions.push({
      type: 'type',
      name: node.id.name,
      line: node.loc?.start.line || 0,
      isExported: isExported
    });
  }

  return fileInfo;
}

/**
 * Extrae enum de TypeScript
 * @param {Object} nodePath - Path de Babel
 * @param {Object} fileInfo - Info del archivo acumulada
 * @returns {Object} - Info actualizada
 */
export function extractTSEnum(nodePath, fileInfo) {
  const node = nodePath.node;
  
  if (node.id) {
    const isExported = isNodeExported(nodePath);
    const members = node.members.map(m => m.id.name || m.id.value);
    fileInfo.enumDefinitions.push({
      type: 'enum',
      name: node.id.name,
      line: node.loc?.start.line || 0,
      isExported: isExported,
      members: members
    });
  }

  return fileInfo;
}

/**
 * Extrae uso de type references
 * @param {Object} nodePath - Path de Babel
 * @param {Object} fileInfo - Info del archivo acumulada
 * @returns {Object} - Info actualizada
 */
export function extractTSTypeReference(nodePath, fileInfo) {
  const node = nodePath.node;
  
  if (node.typeName && node.typeName.type === 'Identifier') {
    const typeName = node.typeName.name;
    // Solo agregar si no está duplicado
    if (!fileInfo.typeUsages.some(u => u.name === typeName && u.line === node.loc?.start.line)) {
      fileInfo.typeUsages.push({
        name: typeName,
        line: node.loc?.start.line || 0
      });
    }
  }

  return fileInfo;
}
