/**
 * @fileoverview communication-suite.js (Barrel Export - DEPRECATED)
 * 
 * This file re-exports from the new modular builders directory.
 * Please update your imports to use the new structure:
 * 
 * Before:
 *   import { CommunicationBuilder } from './communication-suite.js';
 * 
 * After:
 *   import { CommunicationBuilder } from './builders/index.js';
 *   or
 *   import { CommunicationBuilder } from './builders/communication-builder.js';
 * 
 * @deprecated Use ./builders/index.js or specific builder modules
 * @module extractor-test/communication-deprecated
 */

export {
  CommunicationBuilder,
  CommunicationScenarioFactory,
  CommunicationConstants,
  CommunicationExtractorContracts
} from './builders/index.js';
