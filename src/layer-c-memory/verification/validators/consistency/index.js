/**
 * @fileoverview Consistency Validator - Module Index
 * 
 * Módulo de validación de consistencia entre sistemas.
 * Exporta componentes individuales y el validador principal.
 * 
 * @module consistency
 * @version 2.0.0
 */

// Validador principal
export { ConsistencyValidator } from './consistency-validator.js';

// Componentes individuales
export { DataLoader } from './data-loader/index.js';
export { IssueManager } from './issue-manager/index.js';
export {
  AtomsFilesValidator,
  FilesConnectionsValidator,
  PathValidator,
  DuplicationDetector,
  VALIDATOR_REGISTRY,
  DEFAULT_VALIDATION_ORDER
} from './validators/index.js';

// Utilidades
export {
  detectPathFormat,
  isHistoricalOrTestFile,
  findFileByPath,
  checkPathFormatConsistency
} from './utils/index.js';

// Versión
export const VERSION = '2.0.0';
