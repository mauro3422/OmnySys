/**
 * @fileoverview file-handlers.js
 * 
 * Handlers principales para eventos del file watcher.
 * Maneja creacion, modificacion y borrado de archivos.
 * 
 * @module file-watcher/handlers/file-handlers
 */

import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('OmnySys:file-watcher:handlers');

/**
 * Maneja creacion de archivo
 */
export async function handleFileCreated(filePath, fullPath) {
  logger.info(`[CREATED] ${filePath}`);

  // Analizar y agregar al indice
  await this.analyzeAndIndex(filePath, fullPath);

  // Enriquecer atomos con ancestry
  await this.enrichAtomsWithAncestry(filePath);

  this.emit('file:created', { filePath });
}

/**
 * Enriquece atomos de un archivo con ancestry
 */
export async function enrichAtomsWithAncestry(filePath) {
  const { getShadowRegistry } = await import('../../../layer-c-memory/shadow-registry/index.js');
  const registry = getShadowRegistry(this.dataPath);
  await registry.initialize();

  const atoms = await this.getAtomsForFile(filePath);

  for (const atom of atoms) {
    try {
      const enriched = await registry.enrichWithAncestry(atom);

      if (enriched.ancestry?.replaced) {
        logger.info(`[ANCESTRY] ${atom.id} enriched from ${enriched.ancestry.replaced}`);
        await this.saveAtom(enriched, filePath);
      }
    } catch (error) {
      logger.warn(`[ANCESTRY FAIL] ${atom.id}:`, error.message);
    }
  }
}

/**
 * Guarda un atomo enriquecido
 */
export async function saveAtom(atom, filePath) {
  const { saveAtom: saveAtomToStorage } = await import('#layer-c/storage/index.js');
  await saveAtomToStorage(this.rootPath, filePath, atom.name, atom);
}

/**
 * Maneja modificacion de archivo
 */
export async function handleFileModified(filePath, fullPath) {
  // Hash-dedup
  const newHash = await this._calculateContentHash(fullPath);
  const oldHash = this.fileHashes?.get(filePath);
  if (newHash && oldHash && newHash === oldHash) {
    logger.debug(`[SKIP] ${filePath} - content unchanged`);
    return;
  }
  if (newHash && this.fileHashes) {
    this.fileHashes.set(filePath, newHash);
  }

  logger.info(`[MODIFIED] ${filePath}`);

  // Invalidar cache si existe cacheInvalidator
  if (this.cacheInvalidator) {
    try {
      const result = await this.cacheInvalidator.invalidateSync(filePath);
      if (result.success) {
        logger.info(`✅ Cache invalidated (${result.duration}ms): ${filePath}`);
      } else {
        logger.warn(`⚠️ Cache invalidation failed: ${filePath}`, result.error);
      }
    } catch (error) {
      logger.error(`❌ Error during cache invalidation: ${filePath}`, error.message);
    }
  }

  await this.analyzeAndIndex(filePath, fullPath, true);
  this.emit('file:modified', { filePath });
}

/**
 * Maneja borrado de archivo
 */
export async function handleFileDeleted(filePath) {
  logger.info(`[DELETING] ${filePath}`);

  const fs = await import('fs/promises');
  const fullPath = this.rootPath ?
    (filePath.startsWith('/') || filePath.match(/^[A-Z]:/)) ? filePath : `${this.rootPath}/${filePath}`.replace(/\\/g, '/') :
    filePath;

  const fileExists = await fs.access(fullPath).then(() => true).catch(() => false);

  if (!fileExists) {
    logger.debug(`[SKIP] File already deleted on disk: ${filePath}`);
    await this.removeFromIndex(filePath);
    await this.removeAtomMetadata(filePath);
    this.fileHashes.delete(filePath);
    this.emit('file:deleted', { filePath });
    return;
  }

  try {
    await this.createShadowsForFile(filePath);
    await this.cleanupRelationships(filePath);
    await this.removeFromIndex(filePath);
    await this.removeFileMetadata(filePath);
    await this.removeAtomMetadata(filePath);
    this.fileHashes.delete(filePath);
    await this.notifyDependents(filePath, 'file_deleted');

    this.emit('file:deleted', { filePath });
    logger.info(`[DELETED] ${filePath} - shadows preserved`);
  } catch (error) {
    logger.error(`[DELETE ERROR] ${filePath}:`, error);
    throw error;
  }
}

/**
 * Crea sombras de todos los atomos de un archivo
 */
export async function createShadowsForFile(filePath) {
  const { getShadowRegistry } = await import('../../../layer-c-memory/shadow-registry/index.js');
  const registry = getShadowRegistry(this.dataPath);
  await registry.initialize();

  const atoms = await this.getAtomsForFile(filePath);

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
        commits: await this.getRecentCommits()
      });
      logger.debug(`[SHADOW] ${atom.id} -> ${shadow.shadowId}`);
      created++;
    } catch (error) {
      logger.debug(`[SHADOW SKIP] ${atom.id}: ${error.message}`);
    }
  }

  return created;
}

/**
 * Obtiene atomos de un archivo
 */
export async function getAtomsForFile(filePath) {
  const { loadAtoms } = await import('#layer-c/storage/index.js');
  try {
    return await loadAtoms(this.rootPath, filePath);
  } catch (error) {
    logger.debug(`[NO ATOMS] ${filePath}`);
    return [];
  }
}

/**
 * Obtiene commits recientes del repo git
 */
export async function getRecentCommits() {
  const { execFile } = await import('child_process');
  const { promisify } = await import('util');
  const path = await import('path');

  const execFileAsync = promisify(execFile);
  const cwd = this.dataPath ? path.dirname(this.dataPath) : process.cwd();

  try {
    const { stdout } = await execFileAsync(
      'git', ['log', '--oneline', '-n', '10'],
      { cwd, timeout: 3000, windowsHide: true }
    );
    return stdout.trim().split('\n').filter(Boolean).map(line => {
      const spaceIdx = line.indexOf(' ');
      return {
        hash: line.slice(0, spaceIdx),
        message: line.slice(spaceIdx + 1)
      };
    });
  } catch {
    return [];
  }
}

export default {
  handleFileCreated,
  enrichAtomsWithAncestry,
  saveAtom,
  handleFileModified,
  handleFileDeleted,
  createShadowsForFile,
  getAtomsForFile,
  getRecentCommits
};
