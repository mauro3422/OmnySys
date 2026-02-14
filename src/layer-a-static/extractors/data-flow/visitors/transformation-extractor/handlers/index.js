/**
 * @fileoverview Transformation Extractor Handlers - Index
 * 
 * @module transformation-extractor/handlers
 * @version 1.0.0
 */

export {
  handleObjectDestructuring,
  handleArrayDestructuring,
  handleNestedDestructuring,
  handleDestructuring
} from './destructuring-handler.js';

export {
  MUTATING_METHODS,
  MAP_SET_MUTATING_METHODS,
  OBJECT_MUTATING_METHODS,
  isMutatingMethod,
  handleMutatingCall,
  createMutationTransformation,
  analyzeMutationImpact,
  getAllMutatingMethods
} from './mutation-handler.js';
