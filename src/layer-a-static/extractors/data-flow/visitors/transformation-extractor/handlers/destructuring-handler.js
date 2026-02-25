/**
 * @fileoverview Destructuring Handler
 * 
 * Maneja asignaciones con destructuring (objeto y array).
 * 
 * @module transformation-extractor/handlers/destructuring-handler
 * @version 1.0.0
 */

import { getMemberPath, startLine, text } from '../../../utils/ts-ast-utils.js';

/**
 * Maneja destructuring de objeto: const { x, y } = obj
 * @param {Object} pattern - ObjectPattern
 * @param {Object} init - Inicializador
 * @param {Function} addTransformation - Callback para agregar transformación
 * @param {Function} trackVariable - Callback para trackear variable
 */
export function handleObjectDestructuring(pattern, init, addTransformation, trackVariable, code) {
  const sourcePath = (typeof init === 'string' ? init : getMemberPath(init, code)) || 'unknown';

  for (const prop of pattern.namedChildren) {
    if (prop.type === 'pair') {
      const keyNode = prop.childForFieldName('key');
      const valueNode = prop.childForFieldName('value');
      const key = text(keyNode, code);

      let localName = key;
      if (valueNode.type === 'identifier') {
        localName = text(valueNode, code);
      } else if (valueNode.type === 'assignment_pattern') {
        localName = text(valueNode.childForFieldName('left'), code);
      } else if (valueNode.type === 'object_pattern' || valueNode.type === 'array_pattern') {
        handleNestedDestructuring(valueNode, init, `${sourcePath}.${key}`, addTransformation, trackVariable, code);
        continue;
      }

      addTransformation({
        to: localName,
        from: `${sourcePath}.${key}`,
        operation: 'property_access',
        via: 'destructuring',
        line: startLine(prop)
      });
      trackVariable(localName);
    } else if (prop.type === 'shorthand_property_identifier') {
      const name = text(prop, code);
      addTransformation({
        to: name,
        from: `${sourcePath}.${name}`,
        operation: 'property_access',
        via: 'destructuring',
        line: startLine(prop)
      });
      trackVariable(name);
    }
  }
}

/**
 * Maneja destructuring de array: const [a, b] = arr
 * @param {Object} pattern - ArrayPattern
 * @param {Object} init - Inicializador
 * @param {Function} addTransformation - Callback para agregar transformación
 * @param {Function} trackVariable - Callback para trackear variable
 */
export function handleArrayDestructuring(pattern, init, addTransformation, trackVariable, code) {
  const sourcePath = (typeof init === 'string' ? init : getMemberPath(init, code)) || 'unknown';
  const elements = pattern.namedChildren;

  for (let i = 0; i < elements.length; i++) {
    const element = elements[i];
    if (!element) continue;

    let localName = null;
    if (element.type === 'identifier') {
      localName = text(element, code);
    } else if (element.type === 'assignment_pattern') {
      localName = text(element.childForFieldName('left'), code);
    } else if (element.type === 'rest_element') {
      localName = text(element.namedChildren.find(c => c.type === 'identifier'), code);
    } else if (element.type === 'object_pattern' || element.type === 'array_pattern') {
      handleNestedDestructuring(element, init, `${sourcePath}[${i}]`, addTransformation, trackVariable, code);
      continue;
    }

    if (localName) {
      addTransformation({
        to: localName,
        from: `${sourcePath}[${i}]`,
        operation: element.type === 'rest_element' ? 'rest_destructure' : 'array_index_access',
        via: 'destructuring',
        line: startLine(element)
      });

      trackVariable(localName);
    }
  }
}

/**
 * Maneja nested destructuring: const { a: { b } } = obj
 * @param {Object} pattern - Pattern anidado
 * @param {Object} init - Inicializador
 * @param {string} parentPath - Path padre
 * @param {Function} addTransformation - Callback
 * @param {Function} trackVariable - Callback
 */
export function handleNestedDestructuring(pattern, init, parentPath, addTransformation, trackVariable, code) {
  const currentPath = parentPath || (typeof init === 'string' ? init : getMemberPath(init, code)) || 'unknown';

  if (pattern.type === 'object_pattern') {
    handleObjectDestructuring(pattern, currentPath, addTransformation, trackVariable, code);
  } else if (pattern.type === 'array_pattern') {
    handleArrayDestructuring(pattern, currentPath, addTransformation, trackVariable, code);
  }
}

/**
 * Determina el tipo de destructuring y lo maneja apropiadamente
 * @param {Object} pattern - Pattern (ObjectPattern o ArrayPattern)
 * @param {Object} init - Inicializador
 * @param {Function} addTransformation - Callback
 * @param {Function} trackVariable - Callback
 */
export function handleDestructuring(pattern, init, addTransformation, trackVariable, code) {
  if (pattern.type === 'object_pattern') {
    handleObjectDestructuring(pattern, init, addTransformation, trackVariable, code);
  } else if (pattern.type === 'array_pattern') {
    handleArrayDestructuring(pattern, init, addTransformation, trackVariable, code);
  }
}
