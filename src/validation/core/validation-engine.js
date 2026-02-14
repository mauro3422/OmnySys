/**
 * @fileoverview Validation Engine - Motor de validación Meta-Validator (LEGACY)
 * 
 * ⚠️ DEPRECATED: Este archivo se mantiene por compatibilidad.
 * Use directamente 'validation-engine' para nuevas implementaciones.
 * 
 * Orquesta la validación de todas las capas siguiendo el flujo:
 * 1. Source Validation (Ground Truth)
 * 2. Derivation Validation (Fractal)
 * 3. Semantic Validation (Data Flow)
 * 4. Cross-Metadata Validation (Insights)
 * 
 * Soporta:
 * - Validación incremental (solo entidades modificadas)
 * - Auto-fix de problemas simples
 * - Caching de resultados
 * - Paralelización de validaciones
 * 
 * @module validation/core/validation-engine
 * @deprecated Use 'src/validation/validation-engine/index.js' instead
 */

// Re-exportar todo desde el nuevo módulo modular para 100% compatibilidad
export { 
  ValidationEngine,
  ValidationContext,
  validate 
} from '../validation-engine/index.js';

// Mantener compatibilidad con default export
import { ValidationEngine, ValidationContext, validate } from '../validation-engine/index.js';
export default { ValidationEngine, ValidationContext, validate };
