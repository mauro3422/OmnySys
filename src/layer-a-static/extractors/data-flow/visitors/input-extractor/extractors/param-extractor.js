/**
 * @fileoverview Parameter Extractor
 * 
 * Extrae información de parámetros de función.
 * 
 * @module data-flow/input-extractor/extractors/param-extractor
 * @version 1.0.0
 */

// Tree-sitter helpers
function text(node, code) {
  return code.slice(node.startIndex, node.endIndex);
}

import { extractDefaultValue } from './default-value-extractor.js';

/**
 * Extrae información de todos los parámetros
 * @param {Object} paramsNode - Nodo de parámetros (Tree-sitter)
 * @param {string} code - Código fuente
 * @returns {Array} Información de parámetros
 */
export function extractParameters(paramsNode, code) {
  const inputs = [];
  if (!paramsNode) return inputs;

  const params = paramsNode.namedChildren || [];

  for (let i = 0; i < params.length; i++) {
    const param = params[i];
    const input = parseParameter(param, i, code);
    if (input) {
      inputs.push(input);
    }
  }

  return inputs;
}

/**
 * Parsea un parámetro individual
 * @param {Object} param - Nodo de parámetro (Tree-sitter)
 * @param {number} index - Posición del parámetro
 * @param {string} code - Código fuente
 * @returns {Object|null}
 */
export function parseParameter(param, index, code) {
  // Parámetro simple: function(name)
  if (param.type === 'identifier') {
    return {
      name: text(param, code),
      position: index,
      type: 'simple',
      hasDefault: false
    };
  }

  // Parámetro con default: function(name = 'default')
  if (param.type === 'assignment_pattern') {
    const left = param.childForFieldName('left');
    const right = param.childForFieldName('right');

    if (left.type === 'identifier') {
      return {
        name: text(left, code),
        position: index,
        type: 'simple',
        hasDefault: true,
        defaultValue: text(right, code) // Simplificado por ahora
      };
    }
    if (left.type === 'object_pattern' || left.type === 'array_pattern') {
      return parseDestructuring(left, index, code, right);
    }
  }

  // Destructuring: function({ name, email })
  if (param.type === 'object_pattern' || param.type === 'array_pattern') {
    return parseDestructuring(param, index, code);
  }

  // Rest parameter: function(...args)
  if (param.type === 'rest_parameter') {
    // Tree-sitter rest_parameter suele ser (... identifier)
    const identifier = param.namedChildren.find(c => c.type === 'identifier');
    if (identifier) {
      return {
        name: text(identifier, code),
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
 * @param {Object} pattern - Nodo de pattern (Tree-sitter)
 * @param {number} index - Posición del parámetro
 * @param {string} code - Código fuente
 * @param {Object} [defaultValue] - Nodo de valor default
 * @returns {Object|null}
 */
export function parseDestructuring(pattern, index, code, defaultValue = null) {
  const properties = [];

  if (pattern.type === 'object_pattern') {
    // Tree-sitter object_pattern children: pair, shorthand_property_identifier_pattern, etc.
    for (const child of pattern.namedChildren) {
      if (child.type === 'pair') {
        const key = child.childForFieldName('key');
        const value = child.childForFieldName('value');
        if (key && value) {
          const keyName = text(key, code);
          let localName = keyName;

          if (value.type === 'identifier') {
            localName = text(value, code);
          } else if (value.type === 'assignment_pattern') {
            const left = value.childForFieldName('left');
            if (left) localName = text(left, code);
          }

          properties.push({
            original: keyName,
            local: localName,
            hasDefault: value.type === 'assignment_pattern'
          });
        }
      } else if (child.type === 'shorthand_property_identifier_pattern') {
        const name = text(child, code);
        properties.push({
          original: name,
          local: name,
          hasDefault: false
        });
      }
    }

    return {
      name: `__destructured_${index}`,
      position: index,
      type: 'destructured-object',
      hasDefault: defaultValue !== null,
      defaultValue: defaultValue ? text(defaultValue, code) : null,
      properties
    };
  }

  if (pattern.type === 'array_pattern') {
    const elements = pattern.namedChildren;
    for (let i = 0; i < elements.length; i++) {
      const element = elements[i];
      if (element.type === 'identifier') {
        properties.push({
          index: i,
          local: text(element, code),
          hasDefault: false
        });
      } else if (element.type === 'assignment_pattern') {
        const left = element.childForFieldName('left');
        if (left) {
          properties.push({
            index: i,
            local: text(left, code),
            hasDefault: true
          });
        }
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
