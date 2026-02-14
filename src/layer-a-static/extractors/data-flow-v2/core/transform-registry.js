/**
 * @fileoverview Transform Registry (Legacy Compatibility)
 * 
 * Este archivo mantiene compatibilidad hacia atrás.
 * Nuevo código debe importar desde './transform-registry/index.js'
 * 
 * @deprecated Use './transform-registry/index.js' instead
 * @module data-flow-v2/transform-registry-legacy
 * @version 2.0.0
 */

// Re-export everything from new modular structure
export {
  // Categories
  ArithmeticTransforms,
  LogicalTransforms,
  ComparisonTransforms,
  StructuralTransforms,
  FunctionalTransforms,
  ControlTransforms,
  SideEffectTransforms,
  // Detectors
  detectSideEffectTransform,
  detectFunctionalTransform,
  determinePurity,
  // Registry
  getTransform,
  getTransformByOperator,
  getTransformsByCategory,
  getAllTransforms,
  getAllStandardTokens,
  searchTransforms,
  hasTransform,
  clearCache
} from './transform-registry/index.js';
