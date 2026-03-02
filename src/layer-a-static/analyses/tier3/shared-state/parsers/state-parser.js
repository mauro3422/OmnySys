/**
 * @fileoverview State Parser - Parsea acceso a estado global
 */

import { createLogger } from '../../../../../utils/logger.js';
import { isPartOfAssignmentLeft } from '../utils/index.js';
import { startLine, text } from '../../../../extractors/data-flow/utils/ts-ast-utils.js';
import { getTree } from '../../../../parser/index.js';

const logger = createLogger('OmnySys:shared:state:parser');

const FUNCTION_NODE_TYPES = [
  'function_declaration',
  'function_expression',
  'arrow_function',
  'method_definition',
  'generator_function_declaration',
  'generator_function',
];

/**
 * Parsea código y extrae accesos a estado global usando Tree-sitter
 * @param {string} code - Código fuente
 * @param {string} filePath - Ruta del archivo
 * @returns {Promise<Object>} - Accesos globales encontrados
 */
export async function detectGlobalState(code, filePath = '') {
  const globalAccess = [];
  const readProperties = new Set();
  const writeProperties = new Set();
  const propertyAccessMap = new Map();

  try {
    const tree = await getTree(filePath, code);
    if (!tree) return { globalAccess: [], readProperties: [], writeProperties: [], propertyAccessMap: {} };

    let currentFunction = 'module-level';

    const cursor = tree.rootNode.walk();

    function traverse() {
      const nodeType = cursor.nodeType;
      let isFunction = FUNCTION_NODE_TYPES.includes(nodeType);
      let oldContext = currentFunction;

      if (isFunction || nodeType === 'member_expression') {
        const node = cursor.currentNode;

        if (isFunction) {
          const nameNode = node.childForFieldName('name');
          currentFunction = nameNode ? text(nameNode, code) : 'anonymous';
        }

        if (nodeType === 'member_expression') {
          const objectNode = node.childForFieldName('object');
          const propertyNode = node.childForFieldName('property');

          if (objectNode && propertyNode) {
            const objName = text(objectNode, code);
            const propName = text(propertyNode, code);

            if (objName === 'window' || objName === 'global' || objName === 'globalThis') {
              const fullRef = `${objName}.${propName}`;
              let accessType = isPartOfAssignmentLeft(node) ? 'write' : 'read';

              const location = {
                filePath,
                line: startLine(node),
                column: node.startPosition.column,
                functionContext: currentFunction,
                type: accessType,
                objectName: objName,
                propName,
                fullReference: fullRef,
                confidence: 1.0
              };
              globalAccess.push(location);

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
        }
      }

      if (cursor.gotoFirstChild()) {
        do {
          traverse();
        } while (cursor.gotoNextSibling());
        cursor.gotoParent();
      }

      if (isFunction) {
        currentFunction = oldContext;
      }
    }

    traverse();
    if (typeof cursor.delete === 'function') cursor.delete();
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

// Aliases para compatibilidad
export const parseGlobalState = detectGlobalState;

export default { detectGlobalState, parseGlobalState };
