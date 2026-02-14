/**
 * @fileoverview Transform Registry Module
 * 
 * Sistema modular de registro de transformaciones primitivas.
 * 
 * @module data-flow-v2/transform-registry
 * @version 2.0.0
 */

// Categories
export { ArithmeticTransforms } from './categories/arithmetic.js';
export { LogicalTransforms, ComparisonTransforms } from './categories/logical.js';
export { StructuralTransforms } from './categories/structural.js';
export { FunctionalTransforms } from './categories/functional.js';
export { ControlTransforms } from './categories/control.js';
export { SideEffectTransforms } from './categories/side-effects.js';

// Detectors
export { 
  detectSideEffectTransform, 
  detectFunctionalTransform,
  determinePurity 
} from './detectors.js';

// Registry
export {
  getTransform,
  getTransformByOperator,
  getTransformsByCategory,
  getAllTransforms,
  getAllStandardTokens,
  searchTransforms,
  hasTransform,
  clearCache
} from './registry.js';
