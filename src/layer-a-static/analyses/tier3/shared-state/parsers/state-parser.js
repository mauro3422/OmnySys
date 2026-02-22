/**
 * @fileoverview State Parser - Parsea acceso a estado global
 */

import _traverse from '@babel/traverse';
import { parse } from '@babel/parser';
import { createLogger } from '../../../../../utils/logger.js';
import { isPartOfAssignmentLeft } from '../utils/index.js';

const logger = createLogger('OmnySys:shared:state:parser');

/**
 * Parsea código y extrae accesos a estado global
 * @param {string} code - Código fuente
 * @param {string} filePath - Ruta del archivo
 * @returns {Object} - Accesos globales encontrados
 */
export function parseGlobalState(code, filePath = '') {
  const globalAccess = [];
  const readProperties = new Set();
  const writeProperties = new Set();
  const propertyAccessMap = new Map();

  try {
    const isTypeScript = filePath.endsWith('.ts') || filePath.endsWith('.tsx');
    const plugins = [
      'jsx',
      'objectRestSpread',
      'decorators',
      'classProperties',
      'exportExtensions',
      'asyncGenerators',
      ['pipelineOperator', { proposal: 'minimal' }],
      'nullishCoalescingOperator',
      'optionalChaining',
      'partialApplication'
    ];

    if (isTypeScript) {
      plugins.push(['typescript', { isTSX: filePath.endsWith('.tsx') }]);
    }

    const ast = parse(code, {
      sourceType: 'module',
      allowImportExportEverywhere: true,
      allowReturnOutsideFunction: true,
      plugins
    });

    let currentFunction = 'module-level';

    const traverseFn = _traverse.default ?? _traverse;
    traverseFn(ast, {
      FunctionDeclaration(nodePath) {
        currentFunction = nodePath.node.id?.name || 'anonymous-function';
      },
      ArrowFunctionExpression(nodePath) {
        currentFunction = nodePath.node.id?.name || 'anonymous-arrow';
      },
      FunctionExpression(nodePath) {
        currentFunction = nodePath.node.id?.name || 'anonymous-expression';
      },

      MemberExpression(nodePath) {
        const node = nodePath.node;
        const parent = nodePath.parent;
        const grandparent = nodePath.parent?.parent;

        // Verificar si es window.X o global.X
        if (
          (node.object.name === 'window' || node.object.name === 'global' || node.object.name === 'globalThis') &&
          node.property.name
        ) {
          const objectName = node.object.name;
          const propName = node.property.name;
          const fullRef = `${objectName}.${propName}`;

          // SKIP: Si es parte de una llamada a método
          if (parent.type === 'MemberExpression' && grandparent?.type === 'CallExpression' && grandparent.callee === parent) {
            return;
          }

          // Determinar si es READ o WRITE
          let accessType = 'read';

          // Verificar si es asignación
          if (isPartOfAssignmentLeft(nodePath)) {
            accessType = 'write';
          }

          // Si es argumento de una llamada a función (read)
          if (parent.type === 'CallExpression' && parent.arguments.includes(node)) {
            accessType = 'read';
          }

          // Si es el objeto de una llamada a método directa (read)
          if (parent.type === 'CallExpression' && parent.callee === node) {
            accessType = 'read';
          }

          const location = {
            filePath,
            line: node.loc?.start?.line || 0,
            column: node.loc?.start?.column || 0,
            functionContext: currentFunction,
            type: accessType,
            objectName,
            propName,
            fullReference: fullRef,
            confidence: 1.0
          };

          globalAccess.push(location);

          // Mapear propiedad
          if (!propertyAccessMap.has(propName)) {
            propertyAccessMap.set(propName, { reads: [], writes: [] });
          }

          if (accessType === 'read') {
            readProperties.add(propName);
            propertyAccessMap.get(propName).reads.push(location);
          } else {
            writeProperties.add(propName);
            propertyAccessMap.get(propName).writes.push(location);
          }
        }
      }
    });
  } catch (error) {
    logger.warn(`⚠️  Error parsing ${filePath}:`, error.message);
  }

  return {
    globalAccess,
    readProperties: Array.from(readProperties),
    writeProperties: Array.from(writeProperties),
    propertyAccessMap: Object.fromEntries(propertyAccessMap)
  };
}
