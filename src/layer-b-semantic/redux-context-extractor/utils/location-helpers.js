/**
 * @fileoverview Location Helpers
 * 
 * @module redux-context-extractor/utils/location-helpers
 * @version 1.0.0
 */

export function getLineNumber(code, index) {
  return code.slice(0, index).split('\n').length;
}

export default { getLineNumber };
