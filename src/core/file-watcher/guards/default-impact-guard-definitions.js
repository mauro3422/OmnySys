import { impactGuardDefinitionsCore } from './default-impact-guard-definitions-core.js';
import { impactGuardDefinitionsRuntime } from './default-impact-guard-definitions-runtime.js';
import { impactGuardDefinitionsSemantic } from './default-impact-guard-definitions-semantic.js';

export const impactGuardDefinitions = [
  ...impactGuardDefinitionsCore,
  ...impactGuardDefinitionsRuntime,
  ...impactGuardDefinitionsSemantic
];
