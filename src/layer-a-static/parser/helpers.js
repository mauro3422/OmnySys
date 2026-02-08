/**
 * @fileoverview helpers.js
 * 
 * Funciones utilidad para el parser
 * 
 * @module parser/helpers
 */

import path from 'path';

/**
 * Genera un ID único para el archivo basado en el path completo
 * @param {string} filePath - Ruta del archivo
 * @returns {string}
 */
export function getFileId(filePath) {
  // Usar el path relativo completo para evitar colisiones
  // Ej: src/api/userService.js -> src_api_userService
  const normalized = filePath
    .replace(/\\/g, '_')  // Windows backslash
    .replace(/\//g, '_')  // Unix slash
    .replace(/[^a-zA-Z0-9_]/g, '')  // Remover caracteres especiales
    .replace(/\.[^.]+$/, '');  // Remover extensión
  
  return normalized || 'unknown';
}

/**
 * Verifica si un nodo está exportado
 * @param {Object} nodePath - Path de Babel
 * @returns {boolean}
 */
export function isNodeExported(nodePath) {
  let parent = nodePath.parent;

  if (parent.type === 'ExportNamedDeclaration' || parent.type === 'ExportDefaultDeclaration') {
    return true;
  }

  let currentPath = nodePath;
  while (currentPath.parentPath) {
    currentPath = currentPath.parentPath;
    if (currentPath.node.type === 'ExportNamedDeclaration' ||
        currentPath.node.type === 'ExportDefaultDeclaration') {
      return true;
    }
  }

  return false;
}

/**
 * Verifica si una función está exportada
 * @param {Object} node - Nodo de Babel
 * @param {Object} fileInfo - Info del archivo
 * @returns {boolean}
 */
export function isExportedFunction(node, fileInfo) {
  if (!node.id) return false;
  return fileInfo.exports.some(exp => exp.name === node.id.name);
}

/**
 * Encuentra todas las llamadas a funciones dentro de una función
 * @param {Object} functionPath - Path de Babel para la función
 * @returns {Array} - Array de calls con { name, type, line }
 */
export function findCallsInFunction(functionPath) {
  const calls = [];
  const seen = new Set();

  functionPath.traverse({
    CallExpression(innerPath) {
      const node = innerPath.node;
      if (node.callee.type === 'Identifier') {
        const callKey = `${node.callee.name}:${node.loc?.start.line || 0}`;
        if (!seen.has(callKey)) {
          seen.add(callKey);
          calls.push({
            name: node.callee.name,
            type: 'direct_call',
            line: node.loc?.start.line || 0
          });
        }
      }
    }
  });

  return calls;
}
