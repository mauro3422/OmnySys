/**
 * @fileoverview index.js
 * 
 * Re-export de detectores
 * 
 * @module metadata-contract/detectors
 */

export {
  detectGodObject,
  detectOrphanModule,
  detectPatterns,
  getPatternDescriptions,
  detectFacade,
  detectConfigHub,
  detectEntryPoint
} from './architectural-patterns.js';
