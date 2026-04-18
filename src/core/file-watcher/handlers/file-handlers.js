import {
  detectDuplicateRiskForFile,
  detectImpactWaveForFile
} from './file-handlers-actions.js';
import { handleFileCreatedForWatcher } from './file-handlers-create.js';
import { handleDeletedFileLifecycle, createShadowsForDeletedFile } from './file-handlers-delete/delete.js';
import { handleFileModifiedForWatcher } from './file-handlers-modified.js';
import {
  enrichAtomsWithAncestryCore,
  saveAtomToStorage,
  loadAtomsForFile,
  detectCircularDependencyForFileCore
} from './file-handlers-core-helpers.js';
import { runFileHandlerWithBoundary } from './file-handler-boundary.js';

export {
  detectImpactWaveForFile,
  detectDuplicateRiskForFile
};

/**
 * Maneja creacion de archivo
 */
export async function handleFileCreated(filePath, fullPath, changeContext = {}) {
  return await runFileHandlerWithBoundary('handleFileCreated', () => handleFileCreatedForWatcher(this, filePath, fullPath, changeContext));
}

/**
 * Enriquece atomos de un archivo con ancestry
 */
export async function enrichAtomsWithAncestry(filePath) {
  return await runFileHandlerWithBoundary('enrichAtomsWithAncestry', () => enrichAtomsWithAncestryCore(this, filePath));
}

/**
 * Guarda un atomo enriquecido
 */
export async function saveAtom(atom, filePath) {
  return await runFileHandlerWithBoundary('saveAtom', () => saveAtomToStorage(this, atom, filePath));
}

/**
 * Maneja modificacion de archivo
 */
export async function handleFileModified(filePath, fullPath, changeContext = {}) {
  return await runFileHandlerWithBoundary('handleFileModified', () => handleFileModifiedForWatcher(this, filePath, fullPath, changeContext));
}

/**
 * Maneja borrado de archivo
 */
export async function handleFileDeleted(filePath, changeContext = {}) {
  return await runFileHandlerWithBoundary('handleFileDeleted', () => handleDeletedFileLifecycle(this, filePath, changeContext));
}

/**
 * Crea sombras de todos los atomos de un archivo
 */
export async function createShadowsForFile(filePath) {
  return await runFileHandlerWithBoundary('createShadowsForFile', () => createShadowsForDeletedFile(this, filePath));
}

/**
 * Obtiene atomos de un archivo
 */
export async function getAtomsForFile(filePath) {
  return await runFileHandlerWithBoundary('getAtomsForFile', () => loadAtomsForFile(this, filePath));
}

/**
 * Invoca el Guard dual de dependencias circulares y llamadas recursivas infinitas 
 * sobre el archivo modificado para alertar en tiempo real.
 */
export async function detectCircularDependencyForFile(filePath) {
  return await runFileHandlerWithBoundary('detectCircularDependencyForFile', () => detectCircularDependencyForFileCore(this, filePath));
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
