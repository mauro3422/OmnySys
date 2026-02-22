/**
 * @fileoverview get_async_analysis (Barrel Export - DEPRECATED)
 *
 * This file re-exports from the new modular async-analysis directory.
 * Please update your imports to use the new structure:
 *
 * Before:
 *   import { get_async_analysis } from './get-async-analysis.js';
 *
 * After:
 *   import { get_async_analysis } from './async-analysis/index.js';
 *
 * @deprecated Use ./async-analysis/index.js
 * @module mcp/tools/get-async-analysis-deprecated
 */

export { get_async_analysis } from './async-analysis/index.js';
export { default } from './async-analysis/index.js';
