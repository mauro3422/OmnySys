/**
 * @fileoverview Comprehensive Extractor Test Factory (Modular Entry)
 */

export {
  ExtractionConfigBuilder,
  ClassExtractionBuilder,
  FunctionExtractionBuilder,
  ImportExportBuilder,
  ASTBuilder
} from './comprehensive-extractor-test/builders.js';

export { ExtractionScenarioFactory } from './comprehensive-extractor-test/scenarios.js';

export {
  ExtractionValidator,
  TestConstants,
  createMockExtractionResult
} from './comprehensive-extractor-test/validation.js';

import {
  ExtractionConfigBuilder,
  ClassExtractionBuilder,
  FunctionExtractionBuilder,
  ImportExportBuilder,
  ASTBuilder
} from './comprehensive-extractor-test/builders.js';
import { ExtractionScenarioFactory } from './comprehensive-extractor-test/scenarios.js';
import {
  ExtractionValidator,
  TestConstants,
  createMockExtractionResult
} from './comprehensive-extractor-test/validation.js';

export default {
  ExtractionConfigBuilder,
  ClassExtractionBuilder,
  FunctionExtractionBuilder,
  ImportExportBuilder,
  ASTBuilder,
  ExtractionScenarioFactory,
  ExtractionValidator,
  TestConstants,
  createMockExtractionResult
};