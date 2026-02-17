/**
 * @fileoverview Redux Context Extractor Module
 * 
 * @module redux-context-extractor
 * @version 2.0.0
 */

import { extractRedux } from './redux/redux-extractor.js';
import { extractContext } from './context/context-extractor.js';
import { getLineNumber } from './utils/location-helpers.js';

export { extractRedux, extractContext, getLineNumber };

export function extractReduxAndContext(code) {
  return {
    redux: extractRedux(code),
    context: extractContext(code)
  };
}

export default { extractRedux, extractContext, extractReduxAndContext, getLineNumber };
