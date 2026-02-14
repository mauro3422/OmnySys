/**
 * @fileoverview Redux Context Extractor (Legacy Compatibility)
 * 
 * @deprecated Use './redux-context-extractor/index.js' instead
 * @module redux-context-extractor-legacy
 * @version 2.0.0
 */

export {
  extractRedux,
  extractContext,
  extractReduxAndContext,
  getLineNumber
} from './redux-context-extractor/index.js';

export { extractReduxAndContext as default } from './redux-context-extractor/index.js';
