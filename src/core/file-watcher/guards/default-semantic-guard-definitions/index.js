import { semanticGuardDefinitionsCore } from './core.js';
import { semanticGuardDefinitionsGovernance } from './governance.js';

export const semanticGuardDefinitions = [
  ...semanticGuardDefinitionsCore,
  ...semanticGuardDefinitionsGovernance
];
