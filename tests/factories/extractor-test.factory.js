/**
 * @fileoverview Extractor Test Factory (Modular Entry)
 *
 * Backward-compatible entrypoint that re-exports all previous symbols.
 */

export {
  PARSER_CONFIG,
  CodeSampleBuilder,
  FunctionBuilder,
  ArrowFunctionBuilder,
  ClassBuilder
} from './extractor-test/core-builders.js';

export {
  ExtractionScenarioFactory,
  ExtractionValidator,
  TestConstants,
  AtomicExtractorContracts
} from './extractor-test/extraction-suite.js';

export {
  CommunicationBuilder,
  CommunicationScenarioFactory,
  CommunicationConstants,
  CommunicationExtractorContracts
} from './extractor-test/communication-suite.js';

import {
  PARSER_CONFIG,
  CodeSampleBuilder,
  FunctionBuilder,
  ArrowFunctionBuilder,
  ClassBuilder
} from './extractor-test/core-builders.js';
import {
  ExtractionScenarioFactory,
  ExtractionValidator,
  TestConstants,
  AtomicExtractorContracts
} from './extractor-test/extraction-suite.js';
import {
  CommunicationBuilder,
  CommunicationScenarioFactory,
  CommunicationConstants,
  CommunicationExtractorContracts
} from './extractor-test/communication-suite.js';

export default {
  CodeSampleBuilder,
  FunctionBuilder,
  ArrowFunctionBuilder,
  ClassBuilder,
  CommunicationBuilder,
  ExtractionScenarioFactory,
  CommunicationScenarioFactory,
  ExtractionValidator,
  TestConstants,
  CommunicationConstants,
  AtomicExtractorContracts,
  CommunicationExtractorContracts,
  PARSER_CONFIG
};