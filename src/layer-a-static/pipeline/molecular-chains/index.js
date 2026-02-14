/**
 * @fileoverview index.js
 * 
 * Main entry point for molecular-chains module.
 * 
 * @module molecular-chains
 */

// Builders
export { ChainBuilder } from './builders/ChainBuilder.js';
export { ChainIdGenerator } from './builders/ChainIdGenerator.js';
export { ChainStepBuilder } from './builders/ChainStepBuilder.js';
export { ChainSummaryBuilder } from './builders/ChainSummaryBuilder.js';

// Utils
export { isValidChainNode, getUniqueFunctions } from './utils/index.js';

// Default export
export { ChainBuilder as default } from './builders/ChainBuilder.js';
