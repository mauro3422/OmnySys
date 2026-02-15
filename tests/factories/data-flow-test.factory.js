/**
 * @fileoverview Data Flow Test Factory (Modular Entry)
 */

export {
  ASTNodeBuilder,
  OutputTestBuilder,
  TransformationTestBuilder,
  TypeInferrerTestBuilder
} from './data-flow-test/builders.js';

export {
  createMockLogger,
  createMockOutputExtractor,
  createMockTransformationExtractor,
  createMockTypeRules
} from './data-flow-test/helpers.js';

export { DataFlowTestFixtures } from './data-flow-test/fixtures.js';
export { DataFlowValidator } from './data-flow-test/validators.js';

import {
  ASTNodeBuilder,
  OutputTestBuilder,
  TransformationTestBuilder,
  TypeInferrerTestBuilder
} from './data-flow-test/builders.js';
import {
  createMockLogger,
  createMockOutputExtractor,
  createMockTransformationExtractor,
  createMockTypeRules
} from './data-flow-test/helpers.js';
import { DataFlowTestFixtures } from './data-flow-test/fixtures.js';
import { DataFlowValidator } from './data-flow-test/validators.js';

export default {
  ASTNodeBuilder,
  OutputTestBuilder,
  TransformationTestBuilder,
  TypeInferrerTestBuilder,
  createMockLogger,
  createMockOutputExtractor,
  createMockTransformationExtractor,
  createMockTypeRules,
  DataFlowTestFixtures,
  DataFlowValidator
};
