/**
 * @fileoverview Source Extractor
 * 
 * Extrae fuentes/dependencias de un nodo AST.
 * 
 * @module data-flow/output-extractor/extractors/source-extractor
 * @version 1.0.0
 */

import { getMemberPath, getIdentifierName, text } from '../../../utils/ts-ast-utils.js';

/**
 * Extrae todas las fuentes (identificadores) de un nodo
 * @param {Object} node - Nodo AST
 * @returns {string[]}
 */
export function extractSources(node, code) {
  const sources = [];

  const collect = (n) => {
    if (!n) return;

    if (n.type === 'identifier') {
      sources.push(text(n, code));
    } else if (n.type === 'this') {
      sources.push('this');
    } else if (n.type === 'member_expression') {
      const path = getMemberPath(n, code);
      if (path) sources.push(path);
    } else if (n.type === 'spread_element' || n.type === 'rest_element') {
      const idNode = n.namedChildren.find(c => c.type === 'identifier');
      if (idNode) sources.push(`...${text(idNode, code)}`);
    } else {
      for (const child of n.namedChildren) {
        collect(child);
      }
    }
  };

  collect(node);
  return [...new Set(sources)];
}

export default { extractSources };
