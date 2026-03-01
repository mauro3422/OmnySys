/**
 * @fileoverview incremental-atom-saver.js
 *
 * Sistema de guardado incremental de átomos con rate limiting.
 * Solo actualiza los campos que realmente cambiaron.
 * Usa WriteQueue para evitar EMFILE durante reindexados masivos.
 *
 * @module layer-c-memory/storage/atoms/incremental-atom-saver
 */

import { AtomVersionManager } from './atom-version-manager.js';
import { createLogger } from '#utils/logger.js';

const logger = createLogger('OmnySys:incremental-saver');

/**
 * Guarda un átomo de forma incremental
 * Wrapper para saveAtomsIncremental por compatibilidad.
 */
export async function saveAtomIncremental(rootPath, filePath, functionName, atomData, options = {}) {
  // Aseguramos que el atomData tenga el nombre correcto
  const atomWithMetadata = { ...atomData, name: functionName };
  const results = await saveAtomsIncremental(rootPath, filePath, [atomWithMetadata], options);

  if (results.success) {
    return {
      success: true,
      action: results.created > 0 ? 'created' : (results.updated > 0 ? 'updated' : 'unchanged'),
      atomId: `${filePath}::${functionName}`,
      duration: results.duration,
      fieldsChanged: results.totalFieldsChanged
    };
  }

  return results;
}

export async function saveAtomsIncremental(rootPath, filePath, atoms, options = {}) {
  const normalizedPath = filePath.replace(/\\/g, '/');
  const startTime = Date.now();
  const results = {
    created: 0,
    updated: 0,
    unchanged: 0,
    errors: 0,
    totalFieldsChanged: 0
  };

  try {
    const { getRepository } = await import('../repository/index.js');
    const repo = getRepository(rootPath);
    const versionManager = new AtomVersionManager(rootPath);

    const atomsToSave = [];

    for (const atom of atoms) {
      if (!atom.name) continue;

      const atomId = `${normalizedPath}::${atom.name}`;

      // Aseguramos que el objeto atom tenga los campos correctos para el repo
      atom.id = atomId;
      atom.file_path = normalizedPath;
      atom.filePath = normalizedPath;

      const changeDetection = await versionManager.detectChanges(atomId, atom);

      if (!changeDetection.hasChanges && !options.forceFull) {
        results.unchanged++;
        continue;
      }

      // Metadata update for record keeping
      const finalAtom = {
        ...atom,
        _meta: {
          ...(atom._meta || {}),
          rootPath,
          lastModified: Date.now(),
          version: (atom._meta?.version || 0) + 1,
          incrementalUpdate: true,
          source: options.source || 'unknown'
        }
      };

      atomsToSave.push(finalAtom);

      if (changeDetection.isNew) results.created++;
      else {
        results.updated++;
        results.totalFieldsChanged += changeDetection.fields.length;
      }

      // Update version tracking in DB
      await versionManager.trackAtomVersion(atomId, finalAtom);
    }

    if (atomsToSave.length > 0) {
      // Use the unified repository save (will handle atoms, files, and relations)
      await repo.saveMany(atomsToSave);
    }

    return {
      success: true,
      ...results,
      duration: Date.now() - startTime,
      atomsProcessed: atoms.length
    };

  } catch (error) {
    logger.error(`Failed incremental save for ${normalizedPath}:`, error);
    return { success: false, error: error.message };
  }
}

export function getSaverStats() {
  return {
    queue: getWriteQueue().status
  };
}
