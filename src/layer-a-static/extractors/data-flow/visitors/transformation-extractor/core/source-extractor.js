/**
 * @fileoverview Source Extractor
 * 
 * Extrae fuentes (variables de origen) de nodos AST.
 * 
 * @module transformation-extractor/core/source-extractor
 * @version 1.0.0
 */

import { getMemberPath, startLine, text } from '../../../utils/ts-ast-utils.js';

const LITERAL_TYPES = [
  'string',
  'number',
  'false',
  'true',
  'null',
  'undefined',
  'regex'
];

// Propiedades a ignorar durante recursión
const IGNORED_KEYS = ['loc', 'type', 'range', 'start', 'end'];

export function extractSources(node, code) {
  if (!node) return [];
  const sources = [];
  const visited = new Set();

  const collect = (n) => {
    if (!n || visited.has(n.id)) return;
    visited.add(n.id);

    // Identificador
    if (n.type === 'identifier') {
      sources.push(text(n, code));
      return;
    }

    // This
    if (n.type === 'this') {
      sources.push('this');
      return;
    }

    // Member expression: obj.prop
    if (n.type === 'member_expression') {
      const path = getMemberPath(n, code);
      if (path) sources.push(path);
      return;
    }

    // Literal (no es fuente variable)
    if (LITERAL_TYPES.includes(n.type)) return;

    // Recursión en hijos nombrados
    for (const child of n.namedChildren) {
      collect(child);
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
export function extractSourcesWithContext(node, code) {
  if (!node) return [];
  const sources = [];
  const seen = new Set();

  const collect = (n, context = {}) => {
    if (!n) return;

    if (n.type === 'identifier') {
      const name = text(n, code);
      if (!seen.has(name)) {
        seen.add(name);
        sources.push({
          name,
          type: 'identifier',
          line: startLine(n),
          context
        });
      }
      return;
    }

    if (n.type === 'this') {
      if (!seen.has('this')) {
        seen.add('this');
        sources.push({
          name: 'this',
          type: 'this',
          line: startLine(n),
          context
        });
      }
      return;
    }

    if (n.type === 'member_expression') {
      const path = getMemberPath(n, code);
      if (path && !seen.has(path)) {
        seen.add(path);
        sources.push({
          name: path,
          type: 'member',
          line: startLine(n),
          context
        });
      }
      return;
    }

    // Recursión
    for (const child of n.namedChildren) {
      collect(child, context);
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
export function containsSource(node, sourceName, code) {
  const sources = extractSources(node, code);
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
