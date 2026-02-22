/**
 * @fileoverview builders.js (Barrel Export - DEPRECATED)
 * 
 * This file re-exports from the new modular builders directory.
 * Please update your imports to use the new structure:
 * 
 * Before:
 *   import { SystemMapBuilder } from './builders.js';
 * 
 * After:
 *   import { SystemMapBuilder } from './builders/index.js';
 *   or
 *   import { SystemMapBuilder } from './builders/system-map-builder.js';
 * 
 * @deprecated Use ./builders/index.js or specific builder modules
 * @module root-infrastructure-test/builders-deprecated
 */

export {
  SystemMapBuilder,
  ProjectStructureBuilder,
  AtomsIndexBuilder
} from './builders/index.js';
