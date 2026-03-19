import path from 'path';

export function normalizeCanonicalAtomId(id, projectPath = '') {
  if (!id || !String(id).includes('::')) {
    return String(id || '').replace(/\\/g, '/');
  }

  const [pathPart, ...rest] = String(id).split('::');
  const canonicalPath = String(pathPart || '').replace(/\\/g, '/').replace(/^\.\//, '').replace(/^\/+/, '');
  return `${canonicalPath}::${rest.join('::')}`;
}

export function buildCanonicalAtomIdVariants(id, projectPath = '') {
  const variants = new Set();
  const normalizedId = normalizeCanonicalAtomId(id, projectPath);
  if (!normalizedId) {
    return [];
  }

  variants.add(normalizedId);

  if (!String(normalizedId).includes('::') || !projectPath) {
    return Array.from(variants);
  }

  const [pathPart, ...rest] = normalizedId.split('::');
  const normalizedPath = String(pathPart || '').replace(/\\/g, '/');
  const absolutePath = path.isAbsolute(normalizedPath)
    ? normalizedPath
    : path.resolve(projectPath, normalizedPath).replace(/\\/g, '/');
  variants.add(`${absolutePath}::${rest.join('::')}`);

  return Array.from(variants);
}
