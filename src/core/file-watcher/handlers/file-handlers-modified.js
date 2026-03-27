import fs from 'fs/promises';
import { createLogger } from '../../../utils/logger.js';
import { collectAndIndexFile } from '../analyze.js';
import { guardRegistry } from '../guards/registry.js';
import { validateAllExports } from '#layer-c/mcp/tools/validate-exports-chain.js';
import { isTestFactorySurface } from '#layer-c/mcp/tools/validate-exports-chain-helpers.js';
import { emitFileLifecycleEvent, formatOriginSuffix, logFileLifecycle } from './file-handler-events.js';

const logger = createLogger('OmnySys:file-watcher:handlers');

async function validateExportsForModifiedFile(fileWatcher, filePath) {
  if (isTestFactorySurface(filePath)) {
    logger.debug(`[EXPORT VALIDATION SKIP] ${filePath}: test factory surface`);
    return;
  }

  const exportValidation = await validateAllExports(fileWatcher.rootPath, filePath);
  if (!exportValidation.valid) {
    logger.warn(
      `[EXPORT VALIDATION] ${filePath}: ${exportValidation.invalidCount || 0} broken export chain(s)`
    );
  }
}

async function runImpactGuardsForModifiedFile(fileWatcher, filePath, fullPath, previousAtoms, analysis) {
  await guardRegistry.initializeDefaultGuards();
  await guardRegistry.runImpactGuards(fileWatcher.rootPath, filePath, fileWatcher, {
    fullPath,
    previousAtoms,
    atoms: analysis.moleculeAtoms || analysis.atoms || [],
    analysis
  });
}

async function reconcileWatcherIssuesAfterModification(fileWatcher, filePath) {
  const { reconcileWatcherIssues } = await import('../watcher-issue-persistence.js');
  const reconciliation = await reconcileWatcherIssues(fileWatcher.rootPath, { maxDelete: 100 });

  if (reconciliation.deletedExpired || reconciliation.deletedSuperseded || reconciliation.deletedOutdated) {
    logger.info(
      `[ISSUE RECONCILE] Cleaned up ${reconciliation.deletedExpired + reconciliation.deletedSuperseded + reconciliation.deletedOutdated} resolved issue(s) after processing ${filePath}`
    );
  }
}

export async function handleFileModifiedForWatcher(fileWatcher, filePath, fullPath, changeContext = {}) {
  const stats = await fs.stat(fullPath).catch(() => null);
  if (!stats || stats.isDirectory()) {
    return;
  }

  const newHash = await fileWatcher._calculateContentHash(fullPath);
  const oldHash = fileWatcher.fileHashes?.get(filePath);
  if (newHash && oldHash && newHash === oldHash) {
    logger.debug(`[SKIP] ${filePath} - content unchanged`);
    return;
  }

  if (newHash && fileWatcher.fileHashes) {
    fileWatcher.fileHashes.set(filePath, newHash);
  }

  try {
    if (fileWatcher.fileStats) {
      fileWatcher.fileStats.set(filePath, {
        mtimeMs: stats.mtimeMs,
        size: stats.size
      });
    }
  } catch {
    // Ignore races where the file disappears between detection and processing.
  }

  logFileLifecycle(`[FILE MODIFIED] ${filePath}${formatOriginSuffix(changeContext)}`);
  const previousAtoms = await fileWatcher.getAtomsForFile(filePath);

  if (fileWatcher.cacheInvalidator) {
    try {
      const result = await fileWatcher.cacheInvalidator.invalidateSync(filePath);
      if (result.success) {
        logger.debug(`✅ Cache invalidated (${result.duration}ms): ${filePath}`);
      } else {
        logger.warn(`⚠️ Cache invalidation failed: ${filePath}`, result.error);
      }
    } catch (error) {
      logger.error(`❌ Error during cache invalidation: ${filePath}`, error.message);
    }
  }

  const analysis = await collectAndIndexFile.call(fileWatcher, filePath, fullPath, true);

  try {
    await validateExportsForModifiedFile(fileWatcher, filePath);
  } catch (error) {
    logger.warn(`[EXPORT VALIDATION SKIP] Failed to validate exports for ${filePath}: ${error.message}`);
  }

  await runImpactGuardsForModifiedFile(fileWatcher, filePath, fullPath, previousAtoms, analysis);

  try {
    await reconcileWatcherIssuesAfterModification(fileWatcher, filePath);
  } catch (error) {
    logger.warn(`[ISSUE RECONCILE SKIP] Failed to reconcile issues after ${filePath}: ${error.message}`);
  }

  logger.info(
    `[FILE PROCESSED] ${filePath} -> atoms=${analysis.moleculeAtoms?.length || analysis.atoms?.length || 0}, previous=${previousAtoms.length}`
  );

  emitFileLifecycleEvent(fileWatcher, 'file:modified', filePath, changeContext, { analysis });
}
