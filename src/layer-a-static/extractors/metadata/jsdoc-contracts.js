/**
 * @fileoverview jsdoc-contracts.js
 * 
 * Extrae contratos de documentación JSDoc/TSDoc
 * 
 * @module extractors/metadata/jsdoc-contracts
 */

import { getLineNumber, getNextLine } from '../utils.js';

/**
 * Extrae contratos de documentación JSDoc/TSDoc
 * @param {string} code - Código fuente
 * @returns {Object} - { functions: [], types: [], contracts: [] }
 */
export function extractJSDocContracts(code) {
  const contracts = {
    functions: [],
    types: [],
    all: []
  };
  
  // Regex para bloques JSDoc/TSDoc completos
  const jsdocPattern = /\/\*\*\s*([\s\S]*?)\s*\*\//g;
  
  let match;
  while ((match = jsdocPattern.exec(code)) !== null) {
    const block = match[1];
    const line = getLineNumber(code, match.index);
    
    const contract = {
      line,
      description: '',
      params: [],
      returns: null,
      throws: [],
      deprecated: false,
      deprecatedReason: ''
    };
    
    // Extraer descripción (primera línea sin @)
    const lines = block.split('\n');
    for (const line of lines) {
      const cleanLine = line.replace(/^\s*\*\s?/, '').trim();
      
      if (cleanLine.startsWith('@param')) {
        const paramMatch = cleanLine.match(/@param\s*(?:\{([^}]+)\})?\s*(?:\[?([^\]]+)\]?)?\s*-?\s*(.*)/);
        if (paramMatch) {
          contract.params.push({
            type: paramMatch[1] || 'any',
            name: paramMatch[2] || '',
            description: paramMatch[3] || '',
            optional: cleanLine.includes('[') && cleanLine.includes(']')
          });
        }
      } else if (cleanLine.startsWith('@returns') || cleanLine.startsWith('@return')) {
        const returnsMatch = cleanLine.match(/@returns?\s*(?:\{([^}]+)\})?\s*(.*)/);
        if (returnsMatch) {
          contract.returns = {
            type: returnsMatch[1] || 'any',
            description: returnsMatch[2] || ''
          };
        }
      } else if (cleanLine.startsWith('@throws') || cleanLine.startsWith('@throw')) {
        const throwsMatch = cleanLine.match(/@throws?\s*(?:\{([^}]+)\})?\s*(.*)/);
        if (throwsMatch) {
          contract.throws.push({
            type: throwsMatch[1] || 'Error',
            description: throwsMatch[2] || ''
          });
        }
      } else if (cleanLine.startsWith('@deprecated')) {
        contract.deprecated = true;
        contract.deprecatedReason = cleanLine.replace('@deprecated', '').trim();
      } else if (!cleanLine.startsWith('@') && cleanLine && !contract.description) {
        contract.description = cleanLine;
      }
    }
    
    contracts.all.push(contract);
    
    // Detectar si es para una función o tipo
    const nextLine = getNextLine(code, match.index + match[0].length);
    if (nextLine.includes('function') || nextLine.includes('=>') || nextLine.includes('(')) {
      contracts.functions.push(contract);
    } else if (nextLine.includes('interface') || nextLine.includes('type ')) {
      contracts.types.push(contract);
    }
  }
  
  return contracts;
}
