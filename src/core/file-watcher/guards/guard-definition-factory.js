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
    if (typeof selector !== 'function') {
      throw new TypeError(`selector must be a function, got ${typeof selector}: ${String(selector)}`);
    }
    const mod = await moduleLoader();
    if (!mod || typeof mod !== 'object') {
      throw new Error(`Module loaded but is not an object: ${typeof mod}`);
    }
    const result = selector(mod);
    if (typeof result !== 'function' && result !== undefined) {
      throw new Error(`Selector returned ${typeof result}, expected a guard function`);
    }
    return result;
  } catch (error) {
    throw new Error(`Failed to load ${label}: ${error.message}`);
  }
}
