/**
 * @fileoverview Source Extractor
 * 
 * Extrae fuentes/dependencias de un nodo AST.
 * 
 * @module data-flow/output-extractor/extractors/source-extractor
 * @version 1.0.0
 */

import { getMemberPath, getIdentifierName } from '../helpers/ast-helpers.js';

/**
 * Extrae todas las fuentes (identificadores) de un nodo
 * @param {Object} node - Nodo AST
 * @returns {string[]}
 */
export function extractSources(node) {
  const sources = [];
  
  const collect = (n) => {
    if (!n) return;

    if (n.type === 'Identifier') {
      sources.push(n.name);
    } else if (n.type === 'ThisExpression') {
      sources.push('this');
    } else if (n.type === 'MemberExpression') {
      const path = getMemberPath(n);
      if (path) sources.push(path);
    } else if (n.type === 'SpreadElement') {
      const spreadName = getIdentifierName(n.argument);
      if (spreadName) sources.push(`...${spreadName}`);
    } else {
      for (const key in n) {
        if (key === 'loc' || key === 'type') continue;
        const val = n[key];
        if (Array.isArray(val)) {
          val.forEach(collect);
        } else if (val && typeof val === 'object') {
          collect(val);
        }
      }
    }
  };

  collect(node);
  return [...new Set(sources)];
}

export default { extractSources };
