/**
 * @fileoverview Phases Test Factory (Modular Entry)
 */

export {
  PhaseContextBuilder,
  AtomBuilder,
  FunctionInfoBuilder,
  FileMetadataBuilder
} from './phases-test/builders.js';

export {
  AtomScenarios,
  PhaseContextScenarios,
  PhaseValidator,
  PhaseContracts
} from './phases-test/scenarios.js';

export { PhasesTestFactory } from './phases-test/factory.js';

import { PhasesTestFactory } from './phases-test/factory.js';
export default PhasesTestFactory;