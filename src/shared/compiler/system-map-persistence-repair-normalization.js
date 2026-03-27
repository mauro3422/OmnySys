export function normalizeDbPath(value = '') {
  return String(value || '')
    .trim()
    .replace(/\\/g, '/')
    .replace(/^\.\//, '')
    .replace(/^\/+/, '');
}

export function toJsonText(value, fallback = '[]') {
  try {
    return JSON.stringify(value ?? []);
  } catch {
    return fallback;
  }
}

export function dependencyKey(dependency) {
  return [
    dependency?.sourcePath || '',
    dependency?.targetPath || '',
    dependency?.dependencyType || ''
  ].join('::');
}

export function dedupeDependencies(dependencies = []) {
  const seen = new Set();
  const unique = [];

  for (const dependency of dependencies) {
    const key = dependencyKey(dependency);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(dependency);
  }

  return unique;
}

export function mergeUniquePathList(...lists) {
  const seen = new Set();
  const merged = [];

  for (const list of lists) {
    if (!Array.isArray(list)) continue;

    for (const value of list) {
      const normalized = normalizeDbPath(value);
      if (!normalized || seen.has(normalized)) continue;
      seen.add(normalized);
      merged.push(normalized);
    }
  }

  return merged;
}
