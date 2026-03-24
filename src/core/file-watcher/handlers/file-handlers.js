import { createLogger } from '../../../utils/logger.js';
import { detectCircularDependencies } from '../guards/circular-guard.js';
import {
  detectDuplicateRiskForFile as detectDuplicateRiskForFileAction,
  detectImpactWaveForFile as detectImpactWaveForFileAction
} from './file-handlers-actions.js';
import { handleFileCreatedForWatcher } from './file-handlers-create.js';
import { handleDeletedFileLifecycle, createShadowsForDeletedFile } from './file-handlers-delete.js';
import { handleFileModifiedForWatcher } from './file-handlers-modified.js';

const logger = createLogger('OmnySys:file-watcher:handlers');

/**
 * Maneja creacion de archivo
 */
export async function handleFileCreated(filePath, fullPath, changeContext = {}) {
  return await handleFileCreatedForWatcher(this, filePath, fullPath, changeContext);
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
  logger.info(`[ATOM SAVED] ${filePath}::${atom.name}`);
}

/**
 * Maneja modificacion de archivo
 */
export async function handleFileModified(filePath, fullPath, changeContext = {}) {
  // Keep modified-file processing isolated in a dedicated helper.
  return await handleFileModifiedForWatcher(this, filePath, fullPath, changeContext);
}

export async function detectImpactWaveForFile(filePath, previousAtoms = [], options = {}) {
  return await detectImpactWaveForFileAction(this, filePath, previousAtoms, options);
}

export async function detectDuplicateRiskForFile(filePath, options = {}) {
  return await detectDuplicateRiskForFileAction(this, filePath, options);
}

/**
 * Maneja borrado de archivo
 */
export async function handleFileDeleted(filePath, changeContext = {}) {
  return await handleDeletedFileLifecycle(this, filePath, changeContext);
}

/**
 * Crea sombras de todos los atomos de un archivo
 */
export async function createShadowsForFile(filePath) {
  return await createShadowsForDeletedFile(this, filePath);
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
 * Invoca el Guard dual de dependencias circulares y llamadas recursivas infinitas 
 * sobre el archivo modificado para alertar en tiempo real.
 */
export async function detectCircularDependencyForFile(filePath) {
  try {
    const { getRepository } = await import('#layer-c/storage/repository/index.js');
    const repo = getRepository(this.rootPath);
    return await detectCircularDependencies(this.rootPath, filePath, repo);
  } catch (err) {
    logger.debug(`[CIRCULAR GUARD SKIP] ${filePath}: ${err.message}`);
    return null;
  }
}

export default {
  handleFileCreated,
  enrichAtomsWithAncestry,
  saveAtom,
  handleFileModified,
  detectImpactWaveForFile,
  detectDuplicateRiskForFile,
  detectCircularDependencyForFile,
  handleFileDeleted,
  createShadowsForFile,
  getAtomsForFile
};
