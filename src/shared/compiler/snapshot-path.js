export function normalizeSnapshotPath(value = '') {
  const normalized = String(value || '').replace(/\\/g, '/').replace(/\/+/g, '/').trim();
  if (!normalized) {
    return null;
  }

  return normalized.startsWith('./') ? normalized.slice(2) : normalized;
}

export function normalizeComparisonPath(value = '') {
  return normalizeSnapshotPath(value)?.replace(/\.[jt]sx?$/, '') || null;
}
