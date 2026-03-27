/**
 * @fileoverview Helpers for file deletion lifecycle in the file watcher.
 *
 * Keeps the public handler facade small and isolates the event/cache cleanup
 * logic from the main handler module.
 *
 * @module core/file-watcher/handlers/file-handlers-delete
 */

import { createLogger } from '../../../utils/logger.js';
import { getRecentCommits } from './recent-commits.js';
import {
  cleanupRelationships,
  removeAtomMetadata,
  removeFileMetadata
} from './metadata-cleanup.js';
import { emitFileLifecycleEvent, formatOriginSuffix, logFileLifecycle } from './file-handler-events.js';
import {
  resolveDeletedFilePath,
  clearDeletedFileState,
  fileExistsOnDisk,
  createDeletedFileShadows
} from './file-handlers-delete-helpers.js';

const logger = createLogger('OmnySys:file-watcher:handlers:delete');

export async function handleDeletedFileLifecycle(context, filePath, changeContext = {}) {
  logFileLifecycle(`[FILE DELETING] ${filePath}${formatOriginSuffix(changeContext)}`);

  const fullPath = resolveDeletedFilePath(context.rootPath, filePath);
  const fileExists = await fileExistsOnDisk(fullPath);

  if (!fileExists) {
    logger.debug(`[SKIP] File already deleted on disk: ${filePath}`);
    await removeFileMetadata.call(context, filePath);
    await removeAtomMetadata.call(context, filePath);
    clearDeletedFileState(context, filePath);
    emitFileLifecycleEvent(context, 'file:deleted', filePath, changeContext);
    return;
  }

  try {
    await createDeletedFileShadows(context, filePath, {
      commits: await getRecentCommits(context.dataPath)
    });
    await removeFileMetadata.call(context, filePath);
    await removeAtomMetadata.call(context, filePath);
    await cleanupRelationships.call(context, filePath);
    clearDeletedFileState(context, filePath);
    await context.notifyDependents(filePath, 'file_deleted');
    emitFileLifecycleEvent(context, 'file:deleted', filePath, changeContext);
    logger.info(`[FILE DELETED] ${filePath} - shadows preserved`);
  } catch (error) {
    logger.error(`[DELETE ERROR] ${filePath}:`, error);
    throw error;
  }
}

export async function createShadowsForDeletedFile(context, filePath) {
  return await createDeletedFileShadows(context, filePath, {
    commits: await getRecentCommits(context.dataPath)
  });
}
