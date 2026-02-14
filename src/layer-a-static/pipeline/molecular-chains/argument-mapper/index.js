/**
 * @fileoverview Argument Mapper - Public API
 * 
 * Analyzes how arguments from a caller function
 * map to parameters of a callee function.
 * 
 * @module molecular-chains/argument-mapper
 */

// Main class
export { ArgumentMapper } from './ArgumentMapper.js';

// Transforms
export { TransformType, detectTransform } from './transforms/index.js';

// Extractors
export { 
  extractArgumentCode, 
  extractRootVariable 
} from './extractors/index.js';

// Analysis
export { 
  analyzeDataFlow, 
  trackReturnUsage,
  detectChainedTransforms,
  calculateChainComplexity
} from './analysis/index.js';

// Utils
export { 
  calculateConfidence,
  findVariableUsages,
  escapeRegex
} from './utils/index.js';

// Default export
export { ArgumentMapper as default } from './ArgumentMapper.js';
