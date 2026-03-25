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

async function runFileHandlerWithBoundary(operationName, runner) {
  try {
    return await runner();
  } catch (error) {
    logger.error(`File handler failed in ${operationName}`, error);
    throw error;
  }
}

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
  return await runFileHandlerWithBoundary('enrichAtomsWithAncestry', () => enrichAtomsWithAncestryHelper(this, filePath));
}

/**
 * Guarda un atomo enriquecido
 */
export async function saveAtom(atom, filePath) {
  return await runFileHandlerWithBoundary('saveAtom', () => saveAtomHelper(this, atom, filePath));
}

/**
 * Maneja modificacion de archivo
 */
export async function handleFileModified(filePath, fullPath, changeContext = {}) {
  return await runFileHandlerWithBoundary('handleFileModified', () => handleFileModifiedForWatcher(this, filePath, fullPath, changeContext));
}

export async function detectImpactWaveForFile(filePath, previousAtoms = [], options = {}) {
  return await runFileHandlerWithBoundary('detectImpactWaveForFile', () => detectImpactWaveForFileAction(this, filePath, previousAtoms, options));
}

export async function detectDuplicateRiskForFile(filePath, options = {}) {
  return await runFileHandlerWithBoundary('detectDuplicateRiskForFile', () => detectDuplicateRiskForFileAction(this, filePath, options));
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
  return await runFileHandlerWithBoundary('getAtomsForFile', () => getAtomsForFileHelper(this, filePath));
}

/**
 * Invoca el Guard dual de dependencias circulares y llamadas recursivas infinitas 
 * sobre el archivo modificado para alertar en tiempo real.
 */
export async function detectCircularDependencyForFile(filePath) {
  return await runFileHandlerWithBoundary('detectCircularDependencyForFile', () => detectCircularDependencyForFileHelper(this, filePath));
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
