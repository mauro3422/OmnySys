/**
 * @fileoverview Function Extractors
 * 
 * Extrae definiciones de funciones (declaraciones, arrows, expressions)
 * 
 * @module parser/extractors/definitions/function-extractors
 */

import { getFileId, isExportedFunction, findCallsInFunction } from '../../helpers.js';

/**
 * Extrae definición de función (cualquier tipo)
 * @param {Object} nodePath - Path de Babel
 * @param {string} filePath - Ruta del archivo
 * @param {Object} fileInfo - Info del archivo acumulada
 * @param {string} functionType - Tipo: 'declaration' | 'method' | 'arrow' | 'expression'
 * @param {string} className - Nombre de la clase (solo para métodos)
 * @returns {Object} - Definición de función
 */
export function extractFunctionDefinition(nodePath, filePath, fileInfo, functionType = 'declaration', className = null) {
  const node = nodePath.node;
  
  // Determinar nombre según tipo
  let functionName;
  if (functionType === 'method' && node.key) {
    functionName = node.key.name || node.key.value;
  } else if (node.id) {
    functionName = node.id.name;
  } else {
    functionName = 'anonymous';
  }
  
  // Construir ID único
  const fullName = className ? `${className}.${functionName}` : functionName;
  const functionId = `${getFileId(filePath)}::${fullName}`;
  
  fileInfo.definitions.push({
    type: functionType === 'method' ? 'method' : 'function',
    name: fullName,
    className: className,
    params: node.params?.length || 0
  });

  const functionCalls = findCallsInFunction(nodePath);
  const isExported = isExportedFunction(node, fileInfo);

  fileInfo.functions.push({
    id: functionId,
    name: functionName,
    fullName: fullName,
    type: functionType,
    className: className,
    line: node.loc?.start.line || 0,
    endLine: node.loc?.end.line || 0,
    params: (node.params || []).map(p => p.name || p.left?.name || 'param'),
    isExported: isExported,
    isAsync: node.async || false,
    isGenerator: node.generator || false,
    calls: functionCalls,
    node: node
  });

  return fileInfo;
}

/**
 * Extrae arrow function
 * @param {Object} nodePath - Path de Babel
 * @param {string} filePath - Ruta del archivo
 * @param {Object} fileInfo - Info del archivo acumulada
 */
export function extractArrowFunction(nodePath, filePath, fileInfo) {
  const node = nodePath.node;
  
  // Handle both direct ArrowFunctionExpression and VariableDeclarator containing one
  let arrowNode = node;
  let functionName = 'arrow';
  
  if (node.type === 'VariableDeclarator' && node.init?.type === 'ArrowFunctionExpression') {
    arrowNode = node.init;
    functionName = node.id?.name || 'arrow';
  } else if (node.type === 'ArrowFunctionExpression') {
    functionName = node.id?.name || 'arrow';
  }
  
  fileInfo.definitions.push({
    type: 'arrow',
    name: functionName,
    params: arrowNode.params?.length || 0
  });

  const functionCalls = findCallsInFunction(nodePath);
  const functionId = `${getFileId(filePath)}::${functionName}`;

  fileInfo.functions.push({
    id: functionId,
    name: functionName,
    fullName: functionName,
    type: 'arrow',
    className: null,
    line: arrowNode.loc?.start.line || 0,
    endLine: arrowNode.loc?.end.line || 0,
    params: (arrowNode.params || []).map(p => p.name || p.left?.name || 'param'),
    isExported: false,
    isAsync: arrowNode.async || false,
    isGenerator: false,
    calls: functionCalls,
    node: arrowNode
  });

  return fileInfo;
}

/**
 * Extrae function expression
 * @param {Object} nodePath - Path de Babel
 * @param {string} filePath - Ruta del archivo
 * @param {Object} fileInfo - Info del archivo acumulada
 */
export function extractFunctionExpression(nodePath, filePath, fileInfo) {
  const node = nodePath.node;
  const name = node.id?.name || 'expression';
  
  fileInfo.definitions.push({
    type: 'expression',
    name: name,
    params: node.params?.length || 0
  });

  const functionCalls = findCallsInFunction(nodePath);
  const functionId = `${getFileId(filePath)}::${name}`;

  fileInfo.functions.push({
    id: functionId,
    name: name,
    fullName: name,
    type: 'expression',
    className: null,
    line: node.loc?.start.line || 0,
    endLine: node.loc?.end.line || 0,
    params: (node.params || []).map(p => p.name || p.left?.name || 'param'),
    isExported: false,
    isAsync: node.async || false,
    isGenerator: node.generator || false,
    calls: functionCalls,
    node: node
  });

  return fileInfo;
}
