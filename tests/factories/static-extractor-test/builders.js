/**
 * @fileoverview builders.js (Barrel Export - DEPRECATED)
 *
 * This file re-exports from the new modular builders directory.
 * Please update your imports to use the new structure:
 *
 * Before:
 *   import { RouteBuilder } from './builders.js';
 *
 * After:
 *   import { RouteBuilder } from './builders/index.js';
 *   or
 *   import { RouteBuilder } from './builders/route-builder.js';
 *
 * @deprecated Use ./builders/index.js or specific builder modules
 * @module static-extractor-test/builders-deprecated
 */

export {
  RouteBuilder,
  EnvBuilder,
  EventBuilder,
  StorageBuilder,
  GlobalBuilder,
  StaticConnectionBuilder
} from './builders/index.js';
