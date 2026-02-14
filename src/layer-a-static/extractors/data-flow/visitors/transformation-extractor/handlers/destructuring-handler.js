/**
 * @fileoverview Destructuring Handler
 * 
 * Maneja asignaciones con destructuring (objeto y array).
 * 
 * @module transformation-extractor/handlers/destructuring-handler
 * @version 1.0.0
 */

import { getMemberPath } from '../utils/ast-helpers.js';

/**
 * Maneja destructuring de objeto: const { x, y } = obj
 * @param {Object} pattern - ObjectPattern
 * @param {Object} init - Inicializador
 * @param {Function} addTransformation - Callback para agregar transformación
 * @param {Function} trackVariable - Callback para trackear variable
 */
export function handleObjectDestructuring(pattern, init, addTransformation, trackVariable) {
  const sourcePath = getMemberPath(init) || 'unknown';

  for (const prop of pattern.properties) {
    if (prop.type !== 'ObjectProperty') continue;

    const key = prop.key.name || prop.key.value;
    let localName = key;

    if (prop.value.type === 'Identifier') {
      localName = prop.value.name;
    } else if (prop.value.type === 'AssignmentPattern') {
      localName = prop.value.left.name;
    }

    addTransformation({
      to: localName,
      from: `${sourcePath}.${key}`,
      operation: 'property_access',
      via: 'destructuring',
      line: prop.loc?.start?.line
    });

    trackVariable(localName);
  }
}

/**
 * Maneja destructuring de array: const [a, b] = arr
 * @param {Object} pattern - ArrayPattern
 * @param {Object} init - Inicializador
 * @param {Function} addTransformation - Callback para agregar transformación
 * @param {Function} trackVariable - Callback para trackear variable
 */
export function handleArrayDestructuring(pattern, init, addTransformation, trackVariable) {
  const sourcePath = getMemberPath(init) || 'unknown';

  for (let i = 0; i < pattern.elements.length; i++) {
    const element = pattern.elements[i];
    if (!element) continue;

    let localName = null;
    if (element.type === 'Identifier') {
      localName = element.name;
    } else if (element.type === 'AssignmentPattern') {
      localName = element.left.name;
    } else if (element.type === 'RestElement') {
      localName = element.argument.name;
    }

    if (localName) {
      addTransformation({
        to: localName,
        from: `${sourcePath}[${i}]`,
        operation: element.type === 'RestElement' ? 'rest_destructure' : 'array_index_access',
        via: 'destructuring',
        line: element.loc?.start?.line
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
export function handleNestedDestructuring(pattern, init, parentPath, addTransformation, trackVariable) {
  const currentPath = parentPath || getMemberPath(init) || 'unknown';

  if (pattern.type === 'ObjectPattern') {
    for (const prop of pattern.properties) {
      const key = prop.key.name || prop.key.value;
      const newPath = `${currentPath}.${key}`;

      if (prop.value.type === 'Identifier') {
        addTransformation({
          to: prop.value.name,
          from: newPath,
          operation: 'property_access',
          via: 'nested_destructuring',
          line: prop.loc?.start?.line
        });
        trackVariable(prop.value.name);
      } else if (prop.value.type === 'ObjectPattern' || prop.value.type === 'ArrayPattern') {
        handleNestedDestructuring(prop.value, init, newPath, addTransformation, trackVariable);
      }
    }
  } else if (pattern.type === 'ArrayPattern') {
    for (let i = 0; i < pattern.elements.length; i++) {
      const element = pattern.elements[i];
      if (!element) continue;

      const newPath = `${currentPath}[${i}]`;

      if (element.type === 'Identifier') {
        addTransformation({
          to: element.name,
          from: newPath,
          operation: 'array_index_access',
          via: 'nested_destructuring',
          line: element.loc?.start?.line
        });
        trackVariable(element.name);
      } else if (element.type === 'ObjectPattern' || element.type === 'ArrayPattern') {
        handleNestedDestructuring(element, init, newPath, addTransformation, trackVariable);
      }
    }
  }
}

/**
 * Determina el tipo de destructuring y lo maneja apropiadamente
 * @param {Object} pattern - Pattern (ObjectPattern o ArrayPattern)
 * @param {Object} init - Inicializador
 * @param {Function} addTransformation - Callback
 * @param {Function} trackVariable - Callback
 */
export function handleDestructuring(pattern, init, addTransformation, trackVariable) {
  if (pattern.type === 'ObjectPattern') {
    // Verificar si hay nested patterns
    const hasNested = pattern.properties.some(p => 
      p.value?.type === 'ObjectPattern' || p.value?.type === 'ArrayPattern'
    );

    if (hasNested) {
      handleNestedDestructuring(pattern, init, null, addTransformation, trackVariable);
    } else {
      handleObjectDestructuring(pattern, init, addTransformation, trackVariable);
    }
  } else if (pattern.type === 'ArrayPattern') {
    handleArrayDestructuring(pattern, init, addTransformation, trackVariable);
  }
}
