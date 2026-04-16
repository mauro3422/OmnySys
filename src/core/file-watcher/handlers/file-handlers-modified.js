import { createLogger } from '../../../utils/logger.js';
import { runAsyncBoundary } from '../../../shared/compiler/index.js';
import { collectAndIndexFile } from '../analyze.js';
import { guardRegistry } from '../guards/registry.js';
import { validateAllExports } from '#layer-c/mcp/tools/validate-exports-chain.js';
import { isTestFactorySurface } from '#layer-c/mcp/tools/validate-exports-chain-helpers.js';
import { emitFileLifecycleEvent, formatOriginSuffix, logFileLifecycle } from './file-handler-events.js';
import {
  readModifiedFileSnapshot,
  shouldSkipModifiedFile,
  invalidateModifiedFileCache,
  recordModifiedFileStats,
  loadPreviousAtomsForFile,
  processModifiedFilePostActions
} from './file-handlers-modified-helpers.js';

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

async function runSemanticGuardsForModifiedFile(fileWatcher, filePath, analysis) {
  const { runFileWatcherSemanticGuards } = await import('../analyze-flow.js');
  await runFileWatcherSemanticGuards(fileWatcher, filePath, analysis.moleculeAtoms || analysis.atoms || []);
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
  return await runAsyncBoundary('handleFileModifiedForWatcher', async () => {
    try {
      const snapshot = await readModifiedFileSnapshot(fullPath);
      if (shouldSkipModifiedFile(snapshot)) {
        return;
      }

      const newHash = await fileWatcher._calculateContentHash(fullPath);
      if (await invalidateModifiedFileCache(fileWatcher, filePath, newHash)) {
        return;
      }

      await recordModifiedFileStats(fileWatcher, filePath, snapshot);

      logFileLifecycle(`[FILE MODIFIED] ${filePath}${formatOriginSuffix(changeContext)}`);
      const previousAtoms = await loadPreviousAtomsForFile(fileWatcher, filePath);

      const analysis = await collectAndIndexFile.call(fileWatcher, filePath, fullPath, true);

      await processModifiedFilePostActions(
        fileWatcher,
        filePath,
        fullPath,
        previousAtoms,
        analysis,
        validateExportsForModifiedFile,
        runSemanticGuardsForModifiedFile,
        reconcileWatcherIssuesAfterModification
      );

      emitFileLifecycleEvent(fileWatcher, 'file:modified', filePath, changeContext, { analysis });
    } catch (error) {
      throw error;
    }
  });
}
