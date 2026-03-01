/**
 * @fileoverview incremental-atom-saver.js
 *
 * Sistema de guardado incremental de átomos con rate limiting.
 * Solo actualiza los campos que realmente cambiaron.
 * Usa WriteQueue para evitar EMFILE durante reindexados masivos.
 *
 * @module layer-c-memory/storage/atoms/incremental-atom-saver
 */

import path from 'path';
import { loadAtoms, saveAtom } from './atom.js';
import { AtomVersionManager } from './atom-version-manager.js';
import { getWriteQueue } from './write-queue.js';
import { writeJSON, gracefulMkdir, gracefulReadFile } from './graceful-write.js';
import { createLogger } from '#utils/logger.js';

const logger = createLogger('OmnySys:incremental-saver');
const DATA_DIR = '.omnysysdata';

async function loadAtomById(rootPath, atomId) {
  const parts = atomId.split('::');
  if (parts.length !== 2) return null;

  const [filePath, functionName] = parts;
  const atoms = await loadAtoms(rootPath, filePath);
  return atoms.find(a => a.name === functionName) || null;
}

function mergeAtoms(existingAtom, newData, changedFields, source = 'unknown') {
  const merged = { ...existingAtom };

  for (const field of changedFields) {
    merged[field] = newData[field];
  }

  merged._meta = {
    ...merged._meta,
    lastModified: Date.now(),
    modifiedFields: changedFields,
    version: (merged._meta?.version || 0) + 1,
    incrementalUpdate: true,
    source
  };

  return merged;
}

function getAtomPath(rootPath, filePath, functionName) {
  const atomsDir = path.join(rootPath, DATA_DIR, 'atoms');
  const fileDir = path.dirname(filePath);
  const fileName = path.basename(filePath, path.extname(filePath));
  const safeName = functionName
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_{2,}/g, '_')
    .substring(0, 200);
  return path.join(atomsDir, fileDir, fileName, `${safeName}.json`);
}

export async function saveAtomIncremental(rootPath, filePath, functionName, atomData, options = {}) {
  const startTime = Date.now();
  const atomId = `${filePath}::${functionName}`;
  const queue = getWriteQueue();

  try {
    const versionManager = new AtomVersionManager(rootPath);
    const changeDetection = await versionManager.detectChanges(atomId, atomData);
    console.log(`[DEBUG-SAVE-INC] Atom: ${atomId}, isNew: ${changeDetection.isNew}, hasChanges: ${changeDetection.hasChanges}`);

    if (!changeDetection.hasChanges && !options.forceFull) {
      console.log(`[DEBUG-SAVE-INC] Skipping ${atomId} - no changes`);
      return {
        success: true,
        action: 'unchanged',
        atomId,
        duration: Date.now() - startTime,
        fieldsChanged: 0
      };
    }

    const targetPath = getAtomPath(rootPath, filePath, functionName);
    console.log(`[DEBUG-SAVE-INC] Target path: ${targetPath}`);

    if (changeDetection.isNew) {
      const dataToSave = {
        ...atomData,
        _meta: {
          createdAt: Date.now(),
          version: 1,
          incrementalUpdate: false,
          source: options.source || 'unknown'
        }
      };

      await queue.add(async () => {
        await gracefulMkdir(path.dirname(targetPath), { recursive: true });
        await writeJSON(targetPath, dataToSave);
      }, { id: `atom-new-${atomId}`, priority: 1 });

      await versionManager.trackAtomVersion(atomId, atomData);
      await versionManager.flush();

      return {
        success: true,
        action: 'created',
        atomId,
        duration: Date.now() - startTime,
        fieldsChanged: changeDetection.fields.length
      };
    }

    const existingAtom = await loadAtomById(rootPath, atomId);
    if (!existingAtom) {
      logger.warn(`Atom ${atomId} not found for incremental update, creating new`);

      await queue.add(async () => {
        await gracefulMkdir(path.dirname(targetPath), { recursive: true });
        await writeJSON(targetPath, atomData);
      }, { id: `atom-fallback-${atomId}` });

      return {
        success: true,
        action: 'created',
        atomId,
        duration: Date.now() - startTime
      };
    }

    const mergedAtom = mergeAtoms(existingAtom, atomData, changeDetection.fields, options.source || 'unknown');

    await queue.add(async () => {
      await writeJSON(targetPath, mergedAtom);
    }, { id: `atom-update-${atomId}`, priority: 2 });

    await versionManager.trackAtomVersion(atomId, atomData);
    await versionManager.flush();

    const duration = Date.now() - startTime;

    if (duration > 100) {
      logger.debug(`⚡ Incremental save: ${atomId} (${changeDetection.fields.length} fields, ${duration}ms)`);
    }

    return {
      success: true,
      action: 'updated',
      atomId,
      duration,
      fieldsChanged: changeDetection.fields.length,
      fields: changeDetection.fields
    };

  } catch (error) {
    logger.error(`Failed to save atom ${atomId} incrementally:`, error);

    try {
      await saveAtom(rootPath, filePath, functionName, atomData);
      return {
        success: true,
        action: 'fallback_full',
        atomId,
        duration: Date.now() - startTime
      };
    } catch (fallbackError) {
      return {
        success: false,
        action: 'error',
        atomId,
        error: fallbackError.message
      };
    }
  }
}

export async function saveAtomsIncremental(rootPath, filePath, atoms, options = {}) {
  const startTime = Date.now();
  const results = {
    created: 0,
    updated: 0,
    unchanged: 0,
    errors: 0,
    totalFieldsChanged: 0
  };

  const queue = getWriteQueue();
  const versionManager = new AtomVersionManager(rootPath);

  const tasks = atoms
    .filter(atom => {
      if (!atom.name) console.log(`[DEBUG-SAVE] Atom missing name:`, atom.type);
      return atom.name;
    })
    .map(atom => async () => {
      console.log(`[DEBUG-SAVE] Processing atom: ${atom.name} (${atom.type})`);
      const result = await saveAtomIncremental(rootPath, filePath, atom.name, atom, options);

      switch (result.action) {
        case 'created': results.created++; break;
        case 'updated':
          results.updated++;
          results.totalFieldsChanged += result.fieldsChanged || 0;
          break;
        case 'unchanged': results.unchanged++; break;
        default: results.errors++;
      }

      return result;
    });

  if (tasks.length > 0) {
    await queue.addAll(tasks, { id: `batch-${filePath}` });
  }

  await versionManager.flush();

  return {
    ...results,
    duration: Date.now() - startTime,
    atomsProcessed: atoms.length,
    queueStatus: queue.status
  };
}

export function getSaverStats() {
  return {
    queue: getWriteQueue().status
  };
}
