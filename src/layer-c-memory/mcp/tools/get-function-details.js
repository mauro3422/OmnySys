/**
 * @fileoverview get_function_details (Barrel Export - DEPRECATED)
 *
 * This file re-exports from the new modular function-details directory.
 * Please update your imports to use the new structure:
 *
 * Before:
 *   import { get_function_details } from './get-function-details.js';
 *
 * After:
 *   import { get_function_details } from './function-details/index.js';
 *
 * @deprecated Use ./function-details/index.js
 * @module mcp/tools/get-function-details-deprecated
 */

export { get_function_details } from './function-details/index.js';
export { default } from './function-details/index.js';
