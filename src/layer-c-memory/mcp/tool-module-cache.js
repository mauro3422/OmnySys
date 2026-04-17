const REVISION_KEY = '__omnysysToolModuleRevision';

function readRevision() {
  const value = globalThis[REVISION_KEY];
  return Number.isFinite(value) ? value : 0;
}

export function getToolModuleRevision() {
  return readRevision();
}

export function bumpToolModuleRevision() {
  const next = readRevision() + 1;
  globalThis[REVISION_KEY] = next;
  return next;
}

export function getFreshModuleSpecifier(specifier) {
  const revision = getToolModuleRevision();
  const separator = String(specifier).includes('?') ? '&' : '?';
  return `${specifier}${separator}rev=${revision}`;
}
