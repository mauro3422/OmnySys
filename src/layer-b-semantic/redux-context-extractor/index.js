/**
 * @fileoverview Redux Context Extractor Module
 * 
 * @module redux-context-extractor
 * @version 2.0.0
 */

export { extractRedux } from './redux/redux-extractor.js';
export { extractContext } from './context/context-extractor.js';
export { getLineNumber } from './utils/location-helpers.js';

export function extractReduxAndContext(code) {
  return {
    redux: extractRedux(code),
    context: extractContext(code)
  };
}

export default { extractRedux, extractContext, extractReduxAndContext, getLineNumber };
