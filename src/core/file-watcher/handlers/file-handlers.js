import { createLogger } from '../../../utils/logger.js';
import {
  detectDuplicateRiskForFile as detectDuplicateRiskForFileAction,
  detectImpactWaveForFile as detectImpactWaveForFileAction
} from './file-handlers-actions.js';
import { handleFileCreatedForWatcher } from './file-handlers-create.js';
import { handleDeletedFileLifecycle, createShadowsForDeletedFile } from './file-handlers-delete.js';
import { handleFileModifiedForWatcher } from './file-handlers-modified.js';
import {
  enrichAtomsWithAncestry as enrichAtomsWithAncestryHelper,
  saveAtom as saveAtomHelper,
  getAtomsForFile as getAtomsForFileHelper,
  detectCircularDependencyForFile as detectCircularDependencyForFileHelper
} from './file-handlers-core-helpers.js';

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
  return await enrichAtomsWithAncestryHelper(this, filePath);
}

/**
 * Guarda un atomo enriquecido
 */
export async function saveAtom(atom, filePath) {
  return await saveAtomHelper(this, atom, filePath);
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
  return await getAtomsForFileHelper(this, filePath);
}

/**
 * Invoca el Guard dual de dependencias circulares y llamadas recursivas infinitas 
 * sobre el archivo modificado para alertar en tiempo real.
 */
export async function detectCircularDependencyForFile(filePath) {
  return await detectCircularDependencyForFileHelper(this, filePath);
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
