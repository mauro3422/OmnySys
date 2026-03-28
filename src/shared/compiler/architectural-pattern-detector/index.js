/**
 * @fileoverview architectural-pattern-detector.js
 *
 * Detecta patrones arquitectónicos en archivos y sugiere estructura de carpetas.
 * Combina:
 * - architecture-utils.js (God Object, Orphan Module)
 * - directory-structure-analyzer.js (convenciones de directorios)
 * - architectural-recommendations.js (sugerencias de acción)
 *
 * @module shared/compiler/architectural-pattern-detector
 */

export {
  ARCHITECTURAL_PATTERNS,
  detectArchitecturalPattern,
  detectAllArchitecturalPatterns,
  summarizeArchitecturalPatterns
} from './analysis.js';

export {
  detectHelperUtilityPattern,
  detectPolicyModulePattern,
  detectServiceLayerPattern,
} from './patterns.js';
