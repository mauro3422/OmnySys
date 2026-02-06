/**
 * @fileoverview index.js
 * 
 * Re-export de extractores
 * 
 * @module validators/extractors
 */

export {
  extractActualLocalStorageKeys,
  extractValidStorageKeys,
  storageKeyExists
} from './storage-extractor.js';

export {
  extractActualEventNames,
  extractValidEventNames,
  eventNameExists
} from './event-extractor.js';

export {
  extractActualGlobalVariables,
  extractValidGlobalVariables,
  globalVariableExists
} from './global-extractor.js';
