/**
 * @fileoverview Shared helpers for guard definition tables.
 *
 * Keeps semantic and impact guard definition files on the same canonical
 * loader pattern without duplicating boilerplate wrappers.
 *
 * @module core/file-watcher/guards/guard-definition-factory
 */

export function defineGuard(name, loadGuard, metadata) {
  return { name, loadGuard, metadata };
}

export function createGuardMetadata(domain, version, description, extraMetadata = {}) {
  return {
    domain,
    version,
    description,
    ...extraMetadata
  };
}

export function defineLazyGuard(name, moduleLoader, selector, metadata, label = 'guard') {
  return defineGuard(
    name,
    async () => loadGuardMember(moduleLoader, selector, label),
    metadata
  );
}

export function defineVersionedLazyGuard(
  name,
  moduleLoader,
  selector,
  domain,
  version,
  description,
  extraMetadata = {},
  label = 'guard'
) {
  return defineLazyGuard(
    name,
    moduleLoader,
    selector,
    createGuardMetadata(domain, version, description, extraMetadata),
    label
  );
}

export async function loadGuardMember(moduleLoader, selector, label = 'guard') {
  try {
    const mod = await moduleLoader();
    return selector(mod);
  } catch (error) {
    throw new Error(`Failed to load ${label}: ${error.message}`);
  }
}
