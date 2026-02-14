/**
 * @fileoverview Source Extractor
 * 
 * Extrae fuentes (variables de origen) de nodos AST.
 * 
 * @module transformation-extractor/core/source-extractor
 * @version 1.0.0
 */

import { getMemberPath, getIdentifierName } from '../utils/ast-helpers.js';

// Tipos de nodos literales (no son fuentes variables)
const LITERAL_TYPES = [
  'StringLiteral', 
  'NumericLiteral', 
  'BooleanLiteral', 
  'NullLiteral',
  'BigIntLiteral'
];

// Propiedades a ignorar durante recursión
const IGNORED_KEYS = ['loc', 'type', 'range', 'start', 'end'];

/**
 * Extrae todas las fuentes (variables) de un nodo
 * @param {Object} node - Nodo AST
 * @returns {Array<string>} - Lista de nombres de fuentes
 */
export function extractSources(node) {
  const sources = [];
  const visited = new Set();

  const collect = (n) => {
    if (!n || visited.has(n)) return;
    visited.add(n);

    // Identificador
    if (n.type === 'Identifier') {
      sources.push(n.name);
      return;
    }

    // This
    if (n.type === 'ThisExpression') {
      sources.push('this');
      return;
    }

    // Member expression: obj.prop
    if (n.type === 'MemberExpression') {
      const path = getMemberPath(n);
      if (path) sources.push(path);
      return;
    }

    // Literal (no es fuente variable)
    if (LITERAL_TYPES.includes(n.type)) {
      return;
    }

    // Recursión en otros nodos
    for (const key in n) {
      if (IGNORED_KEYS.includes(key)) continue;
      
      const val = n[key];
      if (Array.isArray(val)) {
        val.forEach(collect);
      } else if (val && typeof val === 'object' && val.type) {
        collect(val);
      }
    }
  };

  collect(node);
  return [...new Set(sources)]; // Eliminar duplicados
}

/**
 * Extrae fuentes con información de contexto
 * @param {Object} node - Nodo AST
 * @returns {Array<Object>} - Fuentes con metadata
 */
export function extractSourcesWithContext(node) {
  const sources = [];
  const seen = new Set();

  const collect = (n, context = {}) => {
    if (!n) return;

    if (n.type === 'Identifier') {
      if (!seen.has(n.name)) {
        seen.add(n.name);
        sources.push({
          name: n.name,
          type: 'identifier',
          line: n.loc?.start?.line,
          context
        });
      }
      return;
    }

    if (n.type === 'ThisExpression') {
      if (!seen.has('this')) {
        seen.add('this');
        sources.push({
          name: 'this',
          type: 'this',
          line: n.loc?.start?.line,
          context
        });
      }
      return;
    }

    if (n.type === 'MemberExpression') {
      const path = getMemberPath(n);
      if (path && !seen.has(path)) {
        seen.add(path);
        sources.push({
          name: path,
          type: 'member',
          line: n.loc?.start?.line,
          context
        });
      }
      return;
    }
  };

  collect(node);
  return sources;
}

/**
 * Verifica si un nodo contiene una fuente específica
 * @param {Object} node - Nodo AST
 * @param {string} sourceName - Nombre de la fuente
 * @returns {boolean} - True si contiene la fuente
 */
export function containsSource(node, sourceName) {
  const sources = extractSources(node);
  return sources.includes(sourceName);
}

/**
 * Filtra fuentes que son inputs conocidos
 * @param {Array<string>} sources - Lista de fuentes
 * @param {Set<string>} inputNames - Set de nombres de input
 * @returns {Array<string>} - Fuentes que son inputs
 */
export function filterInputSources(sources, inputNames) {
  return sources.filter(s => inputNames.has(s));
}
