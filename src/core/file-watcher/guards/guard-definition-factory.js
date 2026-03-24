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

export async function loadGuardMember(moduleLoader, selector, label = 'guard') {
  try {
    const mod = await moduleLoader();
    return selector(mod);
  } catch (error) {
    throw new Error(`Failed to load ${label}: ${error.message}`);
  }
}
