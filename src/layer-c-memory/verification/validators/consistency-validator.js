/**
 * @fileoverview consistency-validator.js
 * 
 * ⚠️  DEPRECATED: Este archivo se mantiene para backwards compatibility.
 * 
 * El validador de consistencia ha sido refactorizado en el módulo:
 *   src/layer-c-memory/verification/validators/consistency/
 * 
 * Por favor usa la nueva ubicación:
 *   import { ConsistencyValidator } from './consistency/index.js';
 * 
 * @deprecated Use consistency/index.js instead
 * @module verification/validators/consistency
 */

// Re-export desde el nuevo módulo
export {
  ConsistencyValidator,
  DataLoader,
  IssueManager,
  AtomsFilesValidator,
  FilesConnectionsValidator,
  PathValidator,
  DuplicationDetector,
  detectPathFormat,
  isHistoricalOrTestFile,
  findFileByPath,
  VERSION
} from './consistency/index.js';

// Export default para compatibilidad
import { ConsistencyValidator } from './consistency/index.js';
export default ConsistencyValidator;
