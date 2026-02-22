/**
 * @fileoverview Test Extractor
 * 
 * Extrae callbacks de test (describe, it, test, etc.).
 * 
 * @module parser/extractors/definitions/test-extractor
 */

import { getFileId, findCallsInFunction } from '../../helpers.js';

const TEST_CALLBACK_NAMES = new Set([
  'describe', 'it', 'test', 'beforeEach', 'afterEach', 
  'beforeAll', 'afterAll', 'xit', 'xdescribe', 'fit', 'fdescribe'
]);

/**
 * Extrae callbacks de test (describe, it, test, etc.) sin guardar el nodo AST.
 * Solo metadata serializable para evitar explosión de memoria.
 * @param {Object} nodePath - Path de Babel (ArrowFunctionExpression | FunctionExpression)
 * @param {string} filePath - Ruta del archivo
 * @param {Object} fileInfo - Info del archivo acumulada
 */
export function extractTestCallback(nodePath, filePath, fileInfo) {
  const node = nodePath.node;
  const parent = nodePath.parent;

  if (parent?.type !== 'CallExpression') return;

  const callName = parent.callee?.name || parent.callee?.property?.name;
  if (!callName || !TEST_CALLBACK_NAMES.has(callName)) return;

  // Obtener el label del test (primer argumento string, si existe)
  const labelArg = parent.arguments?.[0];
  const label = (labelArg?.type === 'StringLiteral' || labelArg?.type === 'TemplateLiteral')
    ? (labelArg.value || `${callName}_${node.loc?.start.line || 0}`)
    : `${callName}_${node.loc?.start.line || 0}`;

  const safeName = label.replace(/[^a-zA-Z0-9_$]/g, '_').slice(0, 60);
  const functionId = `${getFileId(filePath)}::${callName}__${safeName}`;

  // findCallsInFunction necesita el nodePath completo pero NO guardamos el nodo
  const calls = findCallsInFunction(nodePath);

  fileInfo.functions.push({
    id: functionId,
    name: `${callName}(${label})`,
    fullName: `${callName}(${label})`,
    type: node.type === 'ArrowFunctionExpression' ? 'arrow' : 'expression',
    className: null,
    line: node.loc?.start.line || 0,
    endLine: node.loc?.end.line || 0,
    params: (node.params || []).map(p => p.name || p.left?.name || 'param'),
    isExported: false,
    isAsync: node.async || false,
    isGenerator: node.generator || false,
    calls,
    isTestCallback: true,
    testCallbackType: callName
    // Sin node: node — evita explosión de memoria con miles de callbacks anidados
  });
}
