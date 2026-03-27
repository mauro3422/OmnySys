import { createStandardContext } from './guard-standards.js';
import { hasAsyncNamingMismatch } from '../../../shared/compiler/index.js';

export function analyzeAtomNaming(atom) {
  if (!hasAsyncNamingMismatch(atom)) {
    return [];
  }

  return [{
    atomId: atom.id,
    atomName: atom.name,
    type: 'NAMING_MISMATCH',
    severity: 'low',
    message: `Function '${atom.name}' is synchronous but its name suggests async behavior.`,
    context: createStandardContext({
      guardName: 'integrity-guard',
      atomId: atom.id,
      atomName: atom.name,
      severity: 'low',
      suggestedAction: 'Rename function to reflect its synchronous nature, or make it async',
      suggestedAlternatives: [
        'Rename to remove "async" from name',
        'Add async keyword if function should be async',
        'Check if missing await in the function body'
      ],
      extraData: {
        isAsync: atom.is_async,
        expectedAsync: true
      }
    })
  }];
}
