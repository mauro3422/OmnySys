import { semanticGuardDefinitionsCore } from './default-semantic-guard-definitions-core.js';
import { semanticGuardDefinitionsGovernance } from './default-semantic-guard-definitions-governance.js';

export const semanticGuardDefinitions = [
  ...semanticGuardDefinitionsCore,
  ...semanticGuardDefinitionsGovernance
];
