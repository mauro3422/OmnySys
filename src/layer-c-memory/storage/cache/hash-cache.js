/**
 * @fileoverview Content Hash Cache - Sistema de cache de hashes persistente
 * 
 * Almacena hashes de contenido de archivos en SQLite para detectar
 * cambios reales vs modificaciones de timestamp.
 */

import { createHash } from 'crypto';
import { readFile } from 'fs/promises';
import { getRepository } from '../repository/index.js';
import { BaseSqlRepository } from '#layer-c/storage/repository/core/BaseSqlRepository.js';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('OmnySys:HashCache');

let _hashRepo = null;

function getHashRepo(projectPath) {
  if (_hashRepo && _hashRepo.db) return _hashRepo;
  const repo = getRepository(projectPath);
  _hashRepo = new BaseSqlRepository(repo.db, 'HashCache');
  _hashRepo.ensureTable('file_hashes', `
    file_path TEXT PRIMARY KEY,
    content_hash TEXT NOT NULL,
    last_updated INTEGER NOT NULL
  `);
  return _hashRepo;
}

/**
 * Normaliza rutas a formato canonico para el hash cache.
 * - Siempre con slash (/)
 * - Preferentemente relativa al proyecto
 */
export function normalizeHashCachePath(filePath, projectPath) {
  if (typeof filePath !== 'string' || filePath.length === 0) return '';

  const normalizedProject = String(projectPath || '')
    .replace(/\\/g, '/')
    .replace(/\/+$/, '');

  let normalizedPath = filePath
    .replace(/\\/g, '/')
    .replace(/^[.]\//, '')
    .replace(/\/{2,}/g, '/');

  if (normalizedProject && normalizedPath.toLowerCase().startsWith(`${normalizedProject.toLowerCase()}/`)) {
    normalizedPath = normalizedPath.slice(normalizedProject.length + 1);
  }

  return normalizedPath.replace(/^[.]\//, '');
}

function isAbsoluteLikePath(filePath) {
  return /^[a-zA-Z]:\//.test(filePath) || filePath.startsWith('/');
}

/**
 * Calcula el hash SHA-256 del contenido de un archivo
 */
export async function calculateFileContentHash(filePath) {
  try {
    const content = await readFile(filePath, 'utf8');
    return createHash('sha256').update(content).digest('hex');
  } catch (error) {
    logger.warn(`[HashCache] Failed to calculate hash for ${filePath}: ${error.message}`);
    return null;
  }
}

/**
 * Calcula hash de forma síncrona (para contenido en memoria)
 */
export function calculateContentHash(content) {
  return createHash('sha256').update(content).digest('hex');
}

/**
 * Obtiene los hashes de archivos almacenados en SQLite
 */
export function getStoredHashes(projectPath) {
  try {
    const hr = getHashRepo(projectPath);
    const rows = hr.db.prepare('SELECT file_path, content_hash FROM file_hashes').all();
    const hashes = {};

    for (const row of rows) {
      hashes[row.file_path] = row.content_hash;
    }

    return hashes;
  } catch (error) {
    logger.warn(`[HashCache] Failed to get stored hashes: ${error.message}`);
    return {};
  }
}

/**
 * Guarda hashes de archivos en SQLite (bulk insert)
 */
export function saveHashes(projectPath, fileHashes) {
  try {
    const hr = getHashRepo(projectPath);
    const db = hr.db;

    const now = Date.now();
    const insert = db.prepare(`
      INSERT OR REPLACE INTO file_hashes (file_path, content_hash, last_updated)
      VALUES (?, ?, ?)
    `);

    // Bulk insert en transacción
    const transaction = db.transaction((hashes) => {
      for (const [filePath, hash] of hashes) {
        insert.run(filePath, hash, now);
      }
    });

    transaction(Object.entries(fileHashes));

    logger.debug(`[HashCache] Saved ${Object.keys(fileHashes).length} hashes`);
  } catch (error) {
    logger.warn(`[HashCache] Failed to save hashes: ${error.message}`);
  }
}

/**
 * Elimina hashes de archivos del cache
 */
export function deleteHashes(projectPath, filePaths) {
  try {
    if (!Array.isArray(filePaths) || filePaths.length === 0) return;

    const hr = getHashRepo(projectPath);
    const db = hr.db;

    const transaction = db.transaction((paths) => {
      for (const filePath of paths) {
        hr.delete('file_hashes', 'file_path', filePath);
      }
    });

    transaction(filePaths);
    logger.debug(`[HashCache] Removed ${filePaths.length} stale hashes`);
  } catch (error) {
    logger.warn(`[HashCache] Failed to delete hashes: ${error.message}`);
  }
}

function collectStoredHashState(projectPath) {
  const storedHashesRaw = getStoredHashes(projectPath);
  const storedHashes = {};
  const staleStoredKeys = [];

  for (const [storedPath, hash] of Object.entries(storedHashesRaw)) {
    const normalizedStoredPath = normalizeHashCachePath(storedPath, projectPath);
    if (!normalizedStoredPath) {
      staleStoredKeys.push(storedPath);
      continue;
    }

    if (isAbsoluteLikePath(normalizedStoredPath)) {
      staleStoredKeys.push(storedPath);
      continue;
    }

    if (normalizedStoredPath !== storedPath) {
      staleStoredKeys.push(storedPath);
    }

    if (!storedHashes[normalizedStoredPath]) {
      storedHashes[normalizedStoredPath] = hash;
    }
  }

  return { storedHashes, staleStoredKeys };
}

function buildInitialChangeSet(storedHashes, currentFiles, projectPath) {
  const normalizedCurrentFiles = currentFiles
    .map((filePath) => normalizeHashCachePath(filePath, projectPath))
    .filter(Boolean);

  const currentFileSet = new Set(normalizedCurrentFiles);
  const deletedFiles = Object.keys(storedHashes).filter((filePath) => !currentFileSet.has(filePath));

  return {
    changes: {
      newFiles: [],
      modifiedFiles: [],
      unchangedFiles: [],
      deletedFiles
    },
    deletedFiles
  };
}

async function collectCurrentHashes(projectPath, currentFiles, storedHashes, changes) {
  try {
    const newHashes = {};
    const batchSize = 50;

    for (let i = 0; i < currentFiles.length; i += batchSize) {
      const batch = currentFiles.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async (filePath) => {
          const currentHash = await calculateFileContentHash(filePath);
          if (!currentHash) return;

          const normalizedPath = normalizeHashCachePath(filePath, projectPath);
          if (!normalizedPath) return;

          newHashes[normalizedPath] = currentHash;

          if (!storedHashes[normalizedPath]) {
            changes.newFiles.push(normalizedPath);
          } else if (storedHashes[normalizedPath] !== currentHash) {
            changes.modifiedFiles.push(normalizedPath);
          } else {
            changes.unchangedFiles.push(normalizedPath);
          }
        })
      );
    }

    return newHashes;
  } catch (error) {
    logger.warn(`[HashCache] Failed to collect current hashes: ${error.message}`);
    return {};
  }
}

function cleanupStaleHashEntries(projectPath, staleStoredKeys, deletedFiles) {
  const staleKeysToDelete = [
    ...staleStoredKeys,
    ...deletedFiles
  ];

  if (staleKeysToDelete.length > 0) {
    deleteHashes(projectPath, [...new Set(staleKeysToDelete)]);
  }
}

/**
 * Detecta cambios reales comparando hashes
 */
export async function detectRealChanges(projectPath, currentFiles, verbose = false) {
  const timer = verbose ? Date.now() : 0;

  try {
    const { storedHashes, staleStoredKeys } = collectStoredHashState(projectPath);
    const { changes, deletedFiles } = buildInitialChangeSet(storedHashes, currentFiles, projectPath);
    const newHashes = await collectCurrentHashes(projectPath, currentFiles, storedHashes, changes);

    saveHashes(projectPath, newHashes);
    cleanupStaleHashEntries(projectPath, staleStoredKeys, deletedFiles);

    if (verbose) {
      const duration = Date.now() - timer;
      logger.info(`[HashCache] Change detection: ${changes.newFiles.length} new, ${changes.modifiedFiles.length} modified, ${changes.unchangedFiles.length} unchanged, ${changes.deletedFiles.length} deleted (${duration}ms)`);
    }

    return changes;
  } catch (error) {
    logger.warn(`[HashCache] Failed during change detection: ${error.message}`);
    return {
      newFiles: [],
      modifiedFiles: [],
      unchangedFiles: [],
      deletedFiles: []
    };
  }
}
