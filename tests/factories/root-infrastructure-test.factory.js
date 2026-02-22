/**
 * @fileoverview Root Infrastructure Test Factory (Modular Entry)
 */

export {
  SystemMapBuilder,
  ProjectStructureBuilder,
  AtomsIndexBuilder
} from './root-infrastructure-test/builders/index.js';

export {
  createMockScannerOutput,
  createMockResolverResult,
  createMockPipelineContext
} from './root-infrastructure-test/helpers.js';

export { InfrastructureScenarios } from './root-infrastructure-test/scenarios.js';

export {
  createTestEnvironment,
  assertValidSystemMap,
  assertValidAnalysisReport
} from './root-infrastructure-test/test-utils.js';

import {
  SystemMapBuilder,
  ProjectStructureBuilder,
  AtomsIndexBuilder
} from './root-infrastructure-test/builders/index.js';
import {
  createMockScannerOutput,
  createMockResolverResult,
  createMockPipelineContext
} from './root-infrastructure-test/helpers.js';
import { InfrastructureScenarios } from './root-infrastructure-test/scenarios.js';
import {
  createTestEnvironment,
  assertValidSystemMap,
  assertValidAnalysisReport
} from './root-infrastructure-test/test-utils.js';

export default {
  SystemMapBuilder,
  ProjectStructureBuilder,
  AtomsIndexBuilder,
  InfrastructureScenarios,
  createMockScannerOutput,
  createMockResolverResult,
  createMockPipelineContext,
  createTestEnvironment,
  assertValidSystemMap,
  assertValidAnalysisReport
};
