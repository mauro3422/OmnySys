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
 * @param {Object} functionNode - Nodo de la función
 * @param {Array} inputs - Inputs extraídos
 * @returns {Map} Mapa de nombre -> usos
 */
export function findUsages(functionNode, inputs) {
  const usages = new Map();
  
  // Inicializar mapa de usos
  for (const input of inputs) {
    usages.set(input.name, []);
  }
  
  const body = functionNode.body;
  if (!body) return usages;

  traverseNode(body, usages, inputs, 0);
  return usages;
}

/**
 * Traversa recursivamente el AST buscando usos
 * @param {Object} node - Nodo AST
 * @param {Map} usages - Mapa de usos
 * @param {Array} inputs - Inputs para verificar
 * @param {number} depth - Profundidad actual
 */
function traverseNode(node, usages, inputs, depth = 0) {
  if (!node || depth > 100) return;

  // Identifier - posible uso
  if (node.type === 'Identifier') {
    recordUsage(node.name, {
      type: 'reference',
      line: node.loc?.start?.line
    }, usages, inputs);
  }

  // MemberExpression: obj.prop
  if (node.type === 'MemberExpression') {
    const objectName = getIdentifierName(node.object);
    const propertyName = node.computed
      ? getIdentifierName(node.property)
      : (node.property.name || node.property.value);

    if (objectName) {
      recordUsage(objectName, {
        type: 'property_access',
        property: propertyName,
        line: node.loc?.start?.line
      }, usages, inputs);
    }
  }

  // CallExpression: func(arg)
  if (node.type === 'CallExpression') {
    const calleeName = getIdentifierName(node.callee);

    node.arguments.forEach((arg, index) => {
      const argName = getIdentifierName(arg);
      if (argName) {
        recordUsage(argName, {
          type: 'argument_pass',
          toFunction: calleeName,
          argumentPosition: index,
          line: arg.loc?.start?.line
        }, usages, inputs);
      }

      if (arg.type === 'SpreadElement') {
        const spreadName = getIdentifierName(arg.argument);
        if (spreadName) {
          recordUsage(spreadName, {
            type: 'spread',
            toFunction: calleeName,
            line: arg.loc?.start?.line
          }, usages, inputs);
        }
      }
    });
  }

  // Recursión en propiedades del nodo
  for (const key in node) {
    if (key === 'loc' || key === 'type') continue;

    const value = node[key];
    if (Array.isArray(value)) {
      for (const child of value) {
        traverseNode(child, usages, inputs, depth + 1);
      }
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      traverseNode(value, usages, inputs, depth + 1);
    }
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
