/**
 * @fileoverview Consistency Validators - Index
 * 
 * Validadores específicos para diferentes aspectos de consistencia.
 * 
 * @module consistency/validators
 * @version 1.0.0
 */

export { AtomsFilesValidator } from './atoms-files-validator.js';
export { FilesConnectionsValidator } from './files-connections-validator.js';
export { PathValidator } from './path-validator.js';
export { DuplicationDetector } from './duplication-detector.js';

// Registry de validadores disponibles
export const VALIDATOR_REGISTRY = {
  ATOMS_FILES: 'atoms-files',
  FILES_CONNECTIONS: 'files-connections',
  PATH: 'path',
  DUPLICATION: 'duplication'
};

// Orden por defecto de validación
export const DEFAULT_VALIDATION_ORDER = [
  VALIDATOR_REGISTRY.PATH,
  VALIDATOR_REGISTRY.ATOMS_FILES,
  VALIDATOR_REGISTRY.FILES_CONNECTIONS,
  VALIDATOR_REGISTRY.DUPLICATION
];
