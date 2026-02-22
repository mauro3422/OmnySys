/**
 * @fileoverview contracts.js (Barrel Export - DEPRECATED)
 * 
 * This file re-exports from the new modular contracts directory.
 * Please update your imports to use the new structure:
 * 
 * Before:
 *   import { createStructureContract } from './contracts.js';
 * 
 * After:
 *   import { createStructureContract } from './contracts/index.js';
 *   or
 *   import { createStructureContract } from './contracts/structure-contract.js';
 * 
 * @deprecated Use ./contracts/index.js or specific contract modules
 * @module test-suite-generator/contracts-deprecated
 */

export {
  createStructureContract,
  createErrorHandlingContract,
  createRuntimeContract,
  createReturnStructureContract,
  createAsyncContract,
  ContractPresets
} from './contracts/index.js';
