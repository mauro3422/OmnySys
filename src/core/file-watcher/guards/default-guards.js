/**
 * @fileoverview Default guard registration coordinator.
 *
 * Keeps the registry wiring thin while the catalog of default guard
 * definitions lives in a separate helper module.
 *
 * @module core/file-watcher/guards/default-guards
 */

import {
  impactGuardDefinitions,
  semanticGuardDefinitions
} from './default-guard-definitions.js';

async function registerGuardDefinitions(definitions, registerGuard) {
  for (const definition of definitions) {
    const guard = await definition.loadGuard();
    registerGuard(definition.name, guard, definition.metadata);
  }
}

export async function registerAllDefaultSemanticGuards(registry) {
  try {
    await registerGuardDefinitions(
      semanticGuardDefinitions,
      (name, guard, metadata) => registry.registerSemanticGuard(name, guard, metadata)
    );
  } catch (error) {
    throw new Error(`Failed to register default semantic guards: ${error.message}`);
  }
}

export async function registerAllDefaultImpactGuards(registry) {
  try {
    await registerGuardDefinitions(
      impactGuardDefinitions,
      (name, guard, metadata) => registry.registerImpactGuard(name, guard, metadata)
    );
  } catch (error) {
    throw new Error(`Failed to register default impact guards: ${error.message}`);
  }
}
