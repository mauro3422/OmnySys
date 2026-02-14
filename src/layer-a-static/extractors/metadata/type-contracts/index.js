/**
 * @fileoverview Type Contracts Module
 * 
 * Sistema modular de contratos de tipo con arquitectura extensible.
 * 
 * @module type-contracts
 * @version 2.0.0
 */

// Types & Analysis
export {
  TYPE_KINDS,
  PRIMITIVE_TYPES,
  COERCION_TYPES,
  analyzeType,
  normalizeType,
  isNullableType,
  extractThrowCondition
} from './types/type-analyzer.js';

// Strategies
export {
  ExtractionStrategy,
  StrategyRegistry
} from './strategies/base-strategy.js';

export { JSDocStrategy } from './strategies/jsdoc-strategy.js';
export { TypeScriptStrategy } from './strategies/typescript-strategy.js';
export { InferenceStrategy } from './strategies/inference-strategy.js';

// Validators
export {
  CompatibilityEngine,
  validateTypeCompatibility,
  getCompatibilityEngine
} from './validators/compatibility-validator.js';

// Extractors
export {
  extractTypeContracts,
  generateSignature,
  registerStrategy
} from './extractors/contract-extractor.js';

// Connections
export {
  extractTypeContractConnections,
  filterByConfidence,
  groupByTarget,
  TypeIndex
} from './contracts/connection-extractor.js';

// Type definitions (JSDoc)
export * from './types/index.js';
