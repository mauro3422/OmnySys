import { statsPool } from '../../shared/utils/stats-pool.js';

/**
 * Verifica si un archivo es relevante para análisis
 */
export function isRelevantFile(filePath) {
  return /\.(js|ts|jsx|tsx|mjs|cjs)$/.test(filePath);
}

/**
 * Verifica si un archivo debe ser ignorado
 */
export function shouldIgnore(filePath) {
  const ignorePatterns = [
    'node_modules/',
    '.git/',
    'dist/',
    'build/',
    '.omnysysdata/',
    'coverage/',
    '.vscode/'
  ];

  return ignorePatterns.some(pattern => filePath.includes(pattern));
}

/**
 * Obtiene estadísticas del watcher
 */
export function getStats(...args) {
  const pooled = statsPool.getStats('watcher', ...args) || {};
  return {
    ...pooled,
    isRunning: this.isRunning,
    pendingChanges: this.pendingChanges?.size || 0,
    trackedFiles: this.fileHashes?.size || 0,
    startupNoiseSuppressed: this.startupNoiseSuppressed || 0,
    startupSuppressionWindowMs: 1500
  };
}
