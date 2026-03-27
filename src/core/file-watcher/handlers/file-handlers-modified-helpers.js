import fs from 'fs/promises';
import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('OmnySys:file-watcher:handlers:modified');

export async function readModifiedFileSnapshot(fullPath) {
  const stats = await fs.stat(fullPath).catch(() => null);
  if (!stats || stats.isDirectory()) {
    return null;
  }

  return stats;
}

export function shouldSkipModifiedFile(snapshot) {
  return !snapshot;
}

export async function invalidateModifiedFileCache(fileWatcher, filePath, newHash) {
  const oldHash = fileWatcher.fileHashes?.get(filePath);
  if (newHash && oldHash && newHash === oldHash) {
    logger.debug(`[SKIP] ${filePath} - content unchanged`);
    return true;
  }

  if (newHash && fileWatcher.fileHashes) {
    fileWatcher.fileHashes.set(filePath, newHash);
  }

  return false;
}

export async function recordModifiedFileStats(fileWatcher, filePath, snapshot) {
  try {
    if (fileWatcher.fileStats) {
      fileWatcher.fileStats.set(filePath, {
        mtimeMs: snapshot.mtimeMs,
        size: snapshot.size
      });
    }
  } catch {
    // Ignore races where the file disappears between detection and processing.
  }
}

export async function loadPreviousAtomsForFile(fileWatcher, filePath) {
  return await fileWatcher.getAtomsForFile(filePath);
}

export async function processModifiedFilePostActions(
  fileWatcher,
  filePath,
  fullPath,
  previousAtoms,
  analysis,
  validateExportsForModifiedFile,
  runImpactGuardsForModifiedFile,
  reconcileWatcherIssuesAfterModification
) {
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
}
