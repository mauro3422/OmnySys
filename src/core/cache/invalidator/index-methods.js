/**
 * @fileoverview index-methods.js
 *
 * Methods attached to the CacheInvalidator prototype.
 *
 * @module cache-invalidator/index-methods
 */

function normalizeCacheFilePath(filePath) {
  return filePath.replace(/\\/g, '/');
}

async function runInvalidation(invalidator, filePath) {
  const normalizedPath = normalizeCacheFilePath(filePath);
  invalidator.logger?.debug?.(`🗑️  Invalidating cache for: ${normalizedPath}`);

  const transaction = invalidator.orchestrator.createTransaction(normalizedPath);
  const result = await invalidator.orchestrator.execute(transaction, normalizedPath);

  if (result.success) {
    invalidator.logger?.debug?.(`✅ Cache invalidated in ${result.duration}ms: ${normalizedPath}`);
  } else {
    invalidator.logger?.error?.(`❌ Cache invalidation failed: ${normalizedPath}`, result.error);
  }

  return result;
}

export async function invalidateSync(filePath) {
  return runInvalidation(this, filePath);
}

export async function invalidateWithRetry(filePath, maxRetries = null) {
  const normalizedPath = normalizeCacheFilePath(filePath);
  const retries = maxRetries || this.config.maxRetries;

  this.logger?.info?.(`🔄 Invalidating with retry (${retries} max): ${normalizedPath}`);

  return this.retryManager.executeWithRetry(
    () => this.invalidateSync(filePath),
    normalizedPath,
    retries
  );
}

export async function invalidateMultiple(filePaths) {
  this.logger?.debug?.(`🗑️  Invalidating ${filePaths.length} files...`);

  const results = [];
  let successCount = 0;
  let failCount = 0;

  for (const filePath of filePaths) {
    const result = await this.invalidateSync(filePath);
    results.push(result);

    if (result.success) successCount++;
    else failCount++;
  }

  this.logger?.debug?.(`✅ Completed: ${successCount} success, ${failCount} failed`);

  return {
    total: filePaths.length,
    success: successCount,
    failed: failCount,
    results
  };
}

export function getFileStatus(filePath) {
  const normalizedPath = normalizeCacheFilePath(filePath);
  return this.validator.buildStatus(normalizedPath);
}

export async function cleanup() {
  await this.diskOps.cleanupBackups();
}

export function getCacheInvalidatorStats() {
  return {
    pendingOperations: this.pendingOperations.size,
    config: this.config
  };
}
