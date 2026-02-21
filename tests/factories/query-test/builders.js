/**
 * @fileoverview builders.js (Barrel Export - DEPRECATED)
 * 
 * This file re-exports from the new modular builders directory.
 * Please update your imports to use the new structure:
 * 
 * Before:
 *   import { QueryBuilder } from './builders.js';
 * 
 * After:
 *   import { QueryBuilder } from './builders/index.js';
 *   or
 *   import { QueryBuilder } from './builders/query-builder.js';
 * 
 * @deprecated Use ./builders/index.js or specific builder modules
 * @module query-test/builders-deprecated
 */

export {
  ProjectDataBuilder,
  FileDataBuilder,
  ConnectionBuilder,
  QueryBuilder,
  QueryScenarios,
  MockFileSystem
} from './builders/index.js';
