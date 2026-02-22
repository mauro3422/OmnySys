/**
 * @fileoverview builders.js (Barrel Export - DEPRECATED)
 *
 * This file re-exports from the new modular builders directory.
 * Please update your imports to use the new structure:
 *
 * Before:
 *   import { PipelineBuilder } from './builders.js';
 *
 * After:
 *   import { PipelineBuilder } from './builders/index.js';
 *   or
 *   import { PipelineBuilder } from './builders/pipeline-builder.js';
 *
 * @deprecated Use ./builders/index.js or specific builder modules
 * @module pipeline-test/builders-deprecated
 */

export {
  PipelineBuilder,
  FileProcessingBuilder,
  MolecularChainBuilder,
  EnhancerBuilder
} from './builders/index.js';
