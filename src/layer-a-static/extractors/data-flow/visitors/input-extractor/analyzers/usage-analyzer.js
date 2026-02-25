/**
 * @fileoverview Usage Analyzer
 * 
 * Analiza los usos de parámetros en el cuerpo de la función.
 * 
 * @module data-flow/input-extractor/analyzers/usage-analyzer
 * @version 1.0.0
 */

import { getIdentifierName } from '../helpers/ast-helpers.js';

/**
 * Encuentra todos los usos de los parámetros
 * @param {Object} functionNode - Nodo de la función (Tree-sitter)
 * @param {Array} inputs - Inputs extraídos
 * @param {string} code - Código fuente
 * @returns {Map} Mapa de nombre -> usos
 */
export function findUsages(functionNode, inputs, code) {
  const usages = new Map();

  // Inicializar mapa de usos
  for (const input of inputs) {
    usages.set(input.name, []);
  }

  // En Tree-sitter, el cuerpo suele estar en un campo 'body' o ser un bloque
  const bodyNode = functionNode.childForFieldName('body');
  if (!bodyNode) return usages;

  traverseNode(bodyNode, usages, inputs, code, 0);
  return usages;
}

/**
 * Traversa recursivamente el AST buscando usos (Tree-sitter)
 * @param {Object} node - Nodo Tree-sitter
 * @param {Map} usages - Mapa de usos
 * @param {Array} inputs - Inputs para verificar
 * @param {string} code - Código fuente
 * @param {number} depth - Profundidad actual
 */
function traverseNode(node, usages, inputs, code, depth = 0) {
  if (!node || depth > 100) return;

  const nodeType = node.type;

  // Identifier - posible uso
  if (nodeType === 'identifier') {
    const name = code.slice(node.startIndex, node.endIndex);

    // Evitar registrar la definición del parámetro como uso
    const parent = node.parent;
    const isParamDef = parent && (parent.type === 'parameter' || parent.type === 'assignment_pattern' || parent.type === 'object_pattern' || parent.type === 'array_pattern');

    if (!isParamDef) {
      recordUsage(name, {
        type: 'reference',
        line: node.startPosition.row + 1
      }, usages, inputs);
    }
  }

  // MemberExpression: obj.prop -> en Tree-sitter es member_expression
  if (nodeType === 'member_expression') {
    const objectNode = node.childForFieldName('object');
    const propertyNode = node.childForFieldName('property');

    const objectName = getIdentifierName(objectNode, code);
    const propertyName = propertyNode ? code.slice(propertyNode.startIndex, propertyNode.endIndex) : null;

    if (objectName) {
      recordUsage(objectName, {
        type: 'property_access',
        property: propertyName,
        line: node.startPosition.row + 1
      }, usages, inputs);
    }
  }

  // CallExpression: func(arg) -> en Tree-sitter es call_expression
  if (nodeType === 'call_expression') {
    const calleeNode = node.childForFieldName('function');
    const argumentsNode = node.childForFieldName('arguments');

    const calleeName = getIdentifierName(calleeNode, code);

    if (argumentsNode) {
      const args = argumentsNode.namedChildren;
      args.forEach((arg, index) => {
        const argName = getIdentifierName(arg, code);
        if (argName) {
          recordUsage(argName, {
            type: 'argument_pass',
            toFunction: calleeName,
            argumentPosition: index,
            line: arg.startPosition.row + 1
          }, usages, inputs);
        }

        if (arg.type === 'spread_element') {
          const spreadId = arg.namedChildren.find(c => c.type === 'identifier');
          const spreadName = spreadId ? code.slice(spreadId.startIndex, spreadId.endIndex) : null;
          if (spreadName) {
            recordUsage(spreadName, {
              type: 'spread',
              toFunction: calleeName,
              line: arg.startPosition.row + 1
            }, usages, inputs);
          }
        }
      });
    }
  }

  // Recursión en hijos nombrados
  for (const child of node.namedChildren) {
    traverseNode(child, usages, inputs, code, depth + 1);
  }
}

/**
 * Registra un uso de un input
 * @param {string} name - Nombre del input
 * @param {Object} usage - Información del uso
 * @param {Map} usages - Mapa de usos
 * @param {Array} inputs - Lista de inputs
 */
function recordUsage(name, usage, usages, inputs) {
  // Verificar si name es un input directo
  if (usages.has(name)) {
    usages.get(name).push(usage);
    return;
  }

  // Verificar si es una propiedad de un destructured input
  for (const input of inputs) {
    if (input.type && input.type.startsWith('destructured')) {
      const prop = input.properties?.find(p => p.local === name);
      if (prop) {
        const usageList = usages.get(input.name);
        if (usageList) {
          usageList.push({
            ...usage,
            destructuredProperty: prop.original || prop.index
          });
        }
        return;
      }
    }
  }
}

export default { findUsages };
