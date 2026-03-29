/**
 * @fileoverview Helpers for impact wave guard heuristics.
 *
 * @module file-watcher/guards/impact-wave-helpers
 */

export function isTestFilePath(filePath = '') {
  const normalized = String(filePath || '').replace(/\\/g, '/');
  return (
    normalized.startsWith('tests/') ||
    normalized.includes('/tests/') ||
    normalized.includes('/__tests__/') ||
    normalized.endsWith('.test.js') ||
    normalized.endsWith('.test.ts') ||
    normalized.endsWith('.spec.js') ||
    normalized.endsWith('.spec.ts')
  );
}
