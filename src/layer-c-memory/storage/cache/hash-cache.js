/**
 * @fileoverview Content Hash Cache - Sistema de cache de hashes persistente
 * 
 * Almacena hashes de contenido de archivos en SQLite para detectar
 * cambios reales vs modificaciones de timestamp.
 */

import { createHash } from 'crypto';
import { readFile } from 'fs/promises';
import { getRepository } from '../repository/index.js';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('OmnySys:HashCache');

/**
 * Calcula el hash SHA-256 del contenido de un archivo
 */
export async function calculateFileHash(filePath) {
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
    const repo = getRepository(projectPath);
    const db = repo.db;
    
    // Crear tabla si no existe
    db.exec(`
      CREATE TABLE IF NOT EXISTS file_hashes (
        file_path TEXT PRIMARY KEY,
        content_hash TEXT NOT NULL,
        last_updated INTEGER NOT NULL
      )
    `);
    
    const rows = db.prepare('SELECT file_path, content_hash FROM file_hashes').all();
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
    const repo = getRepository(projectPath);
    const db = repo.db;
    
    // Crear tabla si no existe
    db.exec(`
      CREATE TABLE IF NOT EXISTS file_hashes (
        file_path TEXT PRIMARY KEY,
        content_hash TEXT NOT NULL,
        last_updated INTEGER NOT NULL
      )
    `);
    
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
 * Detecta cambios reales comparando hashes
 */
export async function detectRealChanges(projectPath, currentFiles, verbose = false) {
  const timer = verbose ? Date.now() : 0;
  
  const storedHashes = getStoredHashes(projectPath);
  const changes = {
    newFiles: [],
    modifiedFiles: [],
    unchangedFiles: [],
    deletedFiles: Object.keys(storedHashes).filter(f => !currentFiles.includes(f))
  };
  
  const newHashes = {};
  
  // Calcular hashes de archivos actuales
  const BATCH_SIZE = 50;
  for (let i = 0; i < currentFiles.length; i += BATCH_SIZE) {
    const batch = currentFiles.slice(i, i + BATCH_SIZE);
    
    await Promise.all(
      batch.map(async (filePath) => {
        const currentHash = await calculateFileHash(filePath);
        if (!currentHash) return;
        
        newHashes[filePath] = currentHash;
        
        if (!storedHashes[filePath]) {
          changes.newFiles.push(filePath);
        } else if (storedHashes[filePath] !== currentHash) {
          changes.modifiedFiles.push(filePath);
        } else {
          changes.unchangedFiles.push(filePath);
        }
      })
    );
  }
  
  // Guardar nuevos hashes
  saveHashes(projectPath, newHashes);
  
  if (verbose) {
    const duration = Date.now() - timer;
    logger.info(`[HashCache] Change detection: ${changes.newFiles.length} new, ${changes.modifiedFiles.length} modified, ${changes.unchangedFiles.length} unchanged, ${changes.deletedFiles.length} deleted (${duration}ms)`);
  }
  
  return changes;
}
