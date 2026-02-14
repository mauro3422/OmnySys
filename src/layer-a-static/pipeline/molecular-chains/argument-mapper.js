/**
 * @fileoverview Argument Mapper - Backward Compatibility Wrapper
 * @deprecated Use ./argument-mapper/index.js directly
 * 
 * This file exists for backward compatibility.
 * Please import from './argument-mapper/index.js' instead.
 * 
 * Example migration:
 *   Before: import { ArgumentMapper } from './argument-mapper.js';
 *   After:  import { ArgumentMapper } from './argument-mapper/index.js';
 * 
 * @module molecular-chains/argument-mapper-deprecated
 */

// Re-export everything from the new modular structure
export * from './argument-mapper/index.js';

// Default export
export { ArgumentMapper as default } from './argument-mapper/index.js';
