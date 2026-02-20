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
  if (!filePath) return 'unknown';

  // Normalize to forward slashes
  let normalized = filePath.replace(/\\/g, '/');

  // If absolute path, strip everything up to the first project-relative segment
  // Looks for markers like /src/, /lib/, /app/, /packages/
  if (path.isAbsolute(normalized) || /^[a-zA-Z]:\//.test(normalized)) {
    const markers = ['/src/', '/lib/', '/app/', '/packages/'];
    for (const marker of markers) {
      const idx = normalized.indexOf(marker);
      if (idx !== -1) {
        normalized = normalized.slice(idx + 1); // e.g. "src/layer-a/..."
        break;
      }
    }
  }

  // Remove extension, then replace separators and special chars with underscores
  normalized = normalized
    .replace(/\.[^.]+$/, '')
    .replace(/\//g, '_')
    .replace(/[^a-zA-Z0-9_]/g, '')
    .replace(/^_|_$/g, '');

  return normalized || 'unknown';
}

/**
 * Verifica si un nodo está exportado
 * @param {Object} nodePath - Path de Babel
 * @returns {boolean}
 */
export function isNodeExported(nodePath) {
  if (!nodePath) return false;
  
  let parent = nodePath.parent;

  if (parent?.type === 'ExportNamedDeclaration' || parent?.type === 'ExportDefaultDeclaration') {
    return true;
  }

  let currentPath = nodePath;
  while (currentPath.parentPath) {
    currentPath = currentPath.parentPath;
    if (currentPath.node?.type === 'ExportNamedDeclaration' ||
        currentPath.node?.type === 'ExportDefaultDeclaration') {
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
  if (!node?.id) return false;
  return fileInfo?.exports?.some(exp => exp.name === node.id.name) ?? false;
}

/**
 * Serializa un nodo argumento AST a forma compacta para cross-function analysis
 * @param {Object} argNode - Nodo argumento de Babel
 * @returns {{ type: string, code: string, variable: string|null }}
 */
function serializeArg(argNode) {
  if (!argNode) return { type: 'unknown', code: '?', variable: null };
  switch (argNode.type) {
    case 'Identifier':
      return { type: 'identifier', code: argNode.name, variable: argNode.name };
    case 'MemberExpression': {
      const obj = argNode.object?.name || '?';
      const prop = argNode.property?.name ?? argNode.property?.value ?? '?';
      return { type: 'member', code: `${obj}.${prop}`, variable: obj };
    }
    case 'StringLiteral':
      return { type: 'literal', code: `"${argNode.value}"`, variable: null };
    case 'NumericLiteral':
    case 'BooleanLiteral':
      return { type: 'literal', code: String(argNode.value), variable: null };
    case 'NullLiteral':
      return { type: 'literal', code: 'null', variable: null };
    case 'SpreadElement': {
      const inner = serializeArg(argNode.argument);
      return { type: 'spread', code: `...${inner.code}`, variable: inner.variable };
    }
    case 'ObjectExpression':
      return { type: 'object', code: '{...}', variable: null };
    case 'ArrayExpression':
      return { type: 'array', code: '[...]', variable: null };
    case 'CallExpression': {
      const callee = argNode.callee?.name || argNode.callee?.property?.name || 'fn';
      return { type: 'call', code: `${callee}(...)`, variable: null };
    }
    case 'TemplateLiteral':
      return { type: 'template', code: '`...`', variable: null };
    default:
      return { type: 'unknown', code: argNode.type || '?', variable: null };
  }
}

/**
 * Encuentra todas las llamadas a funciones dentro de una función
 * @param {Object} functionPath - Path de Babel para la función
 * @returns {Array} - Array de calls con { name, type, line, args }
 */
export function findCallsInFunction(functionPath) {
  const calls = [];
  const seen = new Set();

  if (!functionPath?.traverse) return calls;

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
            line: node.loc?.start.line || 0,
            args: (node.arguments || []).map(serializeArg)
          });
        }
      }
    }
  });

  return calls;
}
