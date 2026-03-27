/**
 * @fileoverview directory-structure-analyzer.js
 *
 * Analiza la estructura de directorios del proyecto para:
 * - Detectar convenciones arquitectónicas
 * - Sugerir ubicación óptima para archivos nuevos
 * - Detectar "architectural drift" (archivos en lugar incorrecto)
 *
 * Complementa a:
 * - architecture-utils.js: Detecta patrones (God Object, Orphan)
 * - architectural-recommendations.js: Sugiere acciones arquitectónicas
 * - helper-reuse-detector.js: Sugiere reutilizar helpers existentes
 *
 * @module shared/compiler/directory-structure-analyzer
 */

export {
  DIRECTORY_PATTERNS,
  FILE_TYPE_TO_DIRECTORY,
  analyzeDirectoryStructure,
  detectFileType,
  suggestDirectoryForFile,
  getDirectoryStructureDefaults
} from './directory-structure-analyzer-conventions.js';

export {
  validateFileLocation,
  detectArchitecturalDrift,
  calculateArchitectureOrganizationScore
} from './directory-structure-analyzer-validation.js';
