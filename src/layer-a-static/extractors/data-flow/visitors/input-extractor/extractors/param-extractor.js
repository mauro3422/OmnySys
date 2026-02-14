/**
 * @fileoverview Parameter Extractor
 * 
 * Extrae información de parámetros de función.
 * 
 * @module data-flow/input-extractor/extractors/param-extractor
 * @version 1.0.0
 */

import { extractDefaultValue } from './default-value-extractor.js';

/**
 * Extrae información de todos los parámetros
 * @param {Object[]} params - Array de nodos de parámetros
 * @returns {Array} Información de parámetros
 */
export function extractParameters(params) {
  const inputs = [];
  
  for (let i = 0; i < params.length; i++) {
    const param = params[i];
    const input = parseParameter(param, i);
    if (input) {
      inputs.push(input);
    }
  }
  
  return inputs;
}

/**
 * Parsea un parámetro individual
 * @param {Object} param - Nodo de parámetro
 * @param {number} index - Posición del parámetro
 * @returns {Object|null}
 */
export function parseParameter(param, index) {
  // Parámetro simple: function(name)
  if (param.type === 'Identifier') {
    return {
      name: param.name,
      position: index,
      type: 'simple',
      hasDefault: false
    };
  }

  // Parámetro con default: function(name = 'default')
  if (param.type === 'AssignmentPattern') {
    const left = param.left;
    if (left.type === 'Identifier') {
      return {
        name: left.name,
        position: index,
        type: 'simple',
        hasDefault: true,
        defaultValue: extractDefaultValue(param.right)
      };
    }
    if (left.type === 'ObjectPattern' || left.type === 'ArrayPattern') {
      return parseDestructuring(left, index, param.right);
    }
  }

  // Destructuring: function({ name, email })
  if (param.type === 'ObjectPattern' || param.type === 'ArrayPattern') {
    return parseDestructuring(param, index);
  }

  // Rest parameter: function(...args)
  if (param.type === 'RestElement') {
    const argument = param.argument;
    if (argument.type === 'Identifier') {
      return {
        name: argument.name,
        position: index,
        type: 'rest',
        hasDefault: false,
        isRest: true
      };
    }
  }

  return null;
}

/**
 * Parsea destructuring patterns
 * @param {Object} pattern - Nodo de pattern
 * @param {number} index - Posición del parámetro
 * @param {Object} [defaultValue] - Valor default
 * @returns {Object|null}
 */
export function parseDestructuring(pattern, index, defaultValue = null) {
  const properties = [];

  if (pattern.type === 'ObjectPattern') {
    for (const prop of pattern.properties) {
      if (prop.type === 'ObjectProperty') {
        const key = prop.key.name || prop.key.value;
        let valueName = key;

        if (prop.value.type === 'Identifier') {
          valueName = prop.value.name;
        } else if (prop.value.type === 'AssignmentPattern') {
          valueName = prop.value.left.name;
        }

        properties.push({
          original: key,
          local: valueName,
          hasDefault: prop.value.type === 'AssignmentPattern'
        });
      }
    }

    return {
      name: `__destructured_${index}`,
      position: index,
      type: 'destructured-object',
      hasDefault: defaultValue !== null,
      defaultValue: defaultValue ? extractDefaultValue(defaultValue) : null,
      properties
    };
  }

  if (pattern.type === 'ArrayPattern') {
    for (let i = 0; i < pattern.elements.length; i++) {
      const element = pattern.elements[i];
      if (element?.type === 'Identifier') {
        properties.push({
          index: i,
          local: element.name,
          hasDefault: false
        });
      } else if (element?.type === 'AssignmentPattern') {
        properties.push({
          index: i,
          local: element.left.name,
          hasDefault: true
        });
      }
    }

    return {
      name: `__destructured_${index}`,
      position: index,
      type: 'destructured-array',
      hasDefault: defaultValue !== null,
      properties
    };
  }

  return null;
}

export default {
  extractParameters,
  parseParameter,
  parseDestructuring
};
