/**
 * @fileoverview Context Extractor
 * 
 * Extrae información de React Context.
 * 
 * @module redux-context-extractor/context/context-extractor
 * @version 1.0.0
 */

import { getLineNumber } from '../utils/location-helpers.js';

export function extractContext(code) {
  const result = { providers: [], consumers: [], contexts: [], hooks: [] };
  let match;
  
  const createContextPattern = /createContext\s*\(/g;
  while ((match = createContextPattern.exec(code)) !== null) {
    result.contexts.push({ type: 'context_created', line: getLineNumber(code, match.index) });
  }
  
  const useContextPattern = /useContext\s*\(\s*(\w+)\s*\)/g;
  while ((match = useContextPattern.exec(code)) !== null) {
    result.hooks.push({ type: 'use_context', contextName: match[1], line: getLineNumber(code, match.index) });
  }
  
  const providerPattern = /(\w+)\.Provider/g;
  while ((match = providerPattern.exec(code)) !== null) {
    result.providers.push({ type: 'provider', contextName: match[1], line: getLineNumber(code, match.index) });
  }
  
  return result;
}

export default { extractContext };
