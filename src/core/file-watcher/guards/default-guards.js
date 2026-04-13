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

async function registerGuardDefinitions(definitions, registerGuard, logger, guardType) {
  let registeredCount = 0;
  let failedCount = 0;
  
  for (const definition of definitions) {
    try {
      const guard = await definition.loadGuard();
      registerGuard(definition.name, guard, definition.metadata);
      registeredCount++;
    } catch (error) {
      failedCount++;
      logger?.warn(`Failed to register ${guardType} guard '${definition.name}': ${error.message}`);
    }
  }
  
  return { registeredCount, failedCount };
}

async function registerDefaultGuardGroup(registry, definitions, registerGuard, guardType) {
  return registerGuardDefinitions(definitions, registerGuard, registry.logger, guardType);
}

export async function registerAllDefaultSemanticGuards(registry) {
  return registerDefaultGuardGroup(
    registry,
    semanticGuardDefinitions,
    (name, guard, metadata) => registry.registerSemanticGuard(name, guard, metadata),
    'semantic'
  );
}

export async function registerAllDefaultImpactGuards(registry) {
  return registerDefaultGuardGroup(
    registry,
    impactGuardDefinitions,
    (name, guard, metadata) => registry.registerImpactGuard(name, guard, metadata),
    'impact'
  );
}

export default {
  registerAllDefaultSemanticGuards,
  registerAllDefaultImpactGuards
};
