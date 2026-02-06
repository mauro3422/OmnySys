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
    '.OmnySysData/',
    'coverage/',
    '.vscode/'
  ];

  return ignorePatterns.some(pattern => filePath.includes(pattern));
}

/**
 * Obtiene estadísticas del watcher
 */
export function getStats() {
  return {
    ...this.stats,
    pendingChanges: this.pendingChanges.size,
    processingFiles: this.processingFiles.size,
    trackedFiles: this.fileHashes.size,
    isRunning: this.isRunning
  };
}
