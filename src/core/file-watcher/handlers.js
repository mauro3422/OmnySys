/**
 * @fileoverview handlers.js (Barrel Export)
 * 
 * Handlers para eventos del file watcher.
 * Este archivo ahora re-exporta desde modulos especializados.
 * Mantiene compatibilidad hacia atras con el API anterior.
 * 
 * ⚠️ CRITICAL: Cuando se borra un archivo fisico, DEBEMOS borrar:
 * 1. Entrada del index.json
 * 2. Archivo .json en .omnysysdata/files/
 * 3. Atomos asociados en .omnysysdata/atoms/
 * 4. Referencias en molecules
 * 
 * @module file-watcher/handlers
 * @deprecated Usar imports especificos desde los submodulos
 */

// Re-exportar desde modulos especializados
export {
  handleFileCreated,
  enrichAtomsWithAncestry,
  saveAtom,
  handleFileModified,
  handleFileDeleted,
  createShadowsForFile,
  getAtomsForFile,
  getRecentCommits
} from './handlers/file-handlers.js';

export {
  removeFileMetadata,
  removeAtomMetadata,
  cleanupRelationships
} from './handlers/metadata-cleanup.js';

export {
  notifyDependents,
  getDependents
} from './handlers/relationships.js';
