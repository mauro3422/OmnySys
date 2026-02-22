/**
 * @fileoverview builders.js (Barrel Export - DEPRECATED)
 * 
 * This file re-exports from the new modular builders directory.
 * Please update your imports to use the new structure:
 * 
 * Before:
 *   import { ShadowBuilder } from './builders.js';
 * 
 * After:
 *   import { ShadowBuilder } from './builders/index.js';
 *   or
 *   import { ShadowBuilder } from './builders/shadow-builder.js';
 * 
 * @deprecated Use ./builders/index.js or specific builder modules
 * @module layer-c-shadow-registry/builders-deprecated
 */

export {
  ShadowBuilder,
  AtomBuilder,
  LineageBuilder,
  SearchResultBuilder,
  AncestryBuilder
} from './builders/index.js';

export { default } from './builders/index.js';
