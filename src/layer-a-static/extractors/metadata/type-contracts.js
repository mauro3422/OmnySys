/**
 * @fileoverview Type Contracts (Legacy Compatibility)
 * 
 * Este archivo mantiene compatibilidad hacia atrás.
 * Nuevo código debe importar desde './type-contracts/index.js'
 * 
 * @deprecated Use './type-contracts/index.js' instead
 * @module type-contracts-legacy
 * @version 2.0.0
 */

export {
  // Core functions
  extractTypeContracts,
  validateTypeCompatibility,
  extractTypeContractConnections,
  
  // Utilities
  normalizeType,
  isNullableType,
  generateSignature,
  analyzeType,
  
  // Strategies
  ExtractionStrategy,
  StrategyRegistry,
  JSDocStrategy,
  TypeScriptStrategy,
  InferenceStrategy,
  
  // Validators
  CompatibilityEngine,
  getCompatibilityEngine,
  
  // Connections
  filterByConfidence,
  groupByTarget,
  TypeIndex,
  
  // Constants
  TYPE_KINDS,
  PRIMITIVE_TYPES,
  COERCION_TYPES
} from './type-contracts/index.js';
