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

const logger = createLogger('OmnySys:file-watcher:handlers:delete');

function resolveFullPath(rootPath, filePath) {
  return rootPath
    ? ((filePath.startsWith('/') || filePath.match(/^[A-Z]:/)) ? filePath : `${rootPath}/${filePath}`).replace(/\\/g, '/')
    : filePath;
}

function clearCachedFileState(context, filePath) {
  if (context.fileHashes) context.fileHashes.delete(filePath);
  if (context.fileStats) context.fileStats.delete(filePath);
}

function emitDeletedEvent(context, filePath, changeContext = {}) {
  context.emit('file:deleted', {
    filePath,
    origin: changeContext.origin || 'unknown',
    source: changeContext.source || null
  });
}

export async function handleDeletedFileLifecycle(context, filePath, changeContext = {}) {
  const originSuffix = changeContext.origin ? ` (origin=${changeContext.origin})` : '';
  logger.info(`[FILE DELETING] ${filePath}${originSuffix}`);

  const fs = await import('fs/promises');
  const fullPath = resolveFullPath(context.rootPath, filePath);
  const fileExists = await fs.access(fullPath).then(() => true).catch(() => false);

  if (!fileExists) {
    logger.debug(`[SKIP] File already deleted on disk: ${filePath}`);
    await removeFileMetadata.call(context, filePath);
    await removeAtomMetadata.call(context, filePath);
    clearCachedFileState(context, filePath);
    emitDeletedEvent(context, filePath, changeContext);
    return;
  }

  try {
    await createShadowsForDeletedFile(context, filePath);
    await removeFileMetadata.call(context, filePath);
    await removeAtomMetadata.call(context, filePath);
    await cleanupRelationships.call(context, filePath);
    clearCachedFileState(context, filePath);
    await context.notifyDependents(filePath, 'file_deleted');
    emitDeletedEvent(context, filePath, changeContext);
    logger.info(`[FILE DELETED] ${filePath} - shadows preserved`);
  } catch (error) {
    logger.error(`[DELETE ERROR] ${filePath}:`, error);
    throw error;
  }
}

export async function createShadowsForDeletedFile(context, filePath) {
  const { getShadowRegistry } = await import('../../../layer-c-memory/shadow-registry/index.js');
  const registry = getShadowRegistry(context.dataPath);
  await registry.initialize();

  const atoms = await context.getAtomsForFile(filePath);
  if (!atoms || atoms.length === 0) {
    logger.debug(`[SHADOW] No atoms found for deleted file: ${filePath}`);
    return 0;
  }

  let created = 0;
  for (const atom of atoms) {
    try {
      atom.filePath = filePath;
      const shadow = await registry.createShadow(atom, {
        reason: 'file_deleted',
        commits: await getRecentCommits(context.dataPath)
      });
      logger.debug(`[SHADOW] ${atom.id} -> ${shadow.shadowId}`);
      created++;
    } catch (error) {
      logger.debug(`[SHADOW SKIP] ${atom.id}: ${error.message}`);
    }
  }

  return created;
}
