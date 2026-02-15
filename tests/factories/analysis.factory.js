/**
 * @fileoverview Analysis Factory (Modular Entry)
 */

export {
  createMockSystemMap,
  createMockFile,
  createMockFunction,
  createMockFunctionLink
} from './analysis/mocks.js';

export {
  createAnalysisStructureSuite,
  createDetectionAnalysisSuite,
  createSeverityClassificationSuite
} from './analysis/suites.js';

export {
  ANALYSIS_TEST_CONSTANTS,
  ScenarioBuilder
} from './analysis/constants.js';
