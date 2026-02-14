/**
 * @fileoverview Validation Engine - Exporta todo el módulo de validación
 * 
 * Punto de entrada único para el sistema de validación modular.
 * 
 * @module validation-engine
 */

// Core
export { ValidationEngine } from './ValidationEngine.js';
export { ValidationContext } from './context.js';

// Strategies
export { 
  BaseValidationStrategy,
  SyntaxValidator, 
  SemanticValidator, 
  SchemaValidator 
} from './strategies/index.js';

// Runners
export { 
  BaseValidationRunner,
  SequentialRunner, 
  ParallelRunner 
} from './runners/index.js';

// Reports
export { ReportBuilder, ReportFormatter } from './reports/index.js';

// Re-exportar clases de resultados para conveniencia
export { ValidationReport, ValidationResult, ValidationSeverity } from '../core/validation-result.js';

// Función de conveniencia para validación rápida
import path from 'path';
import { ValidationEngine } from './ValidationEngine.js';

/**
 * Función de conveniencia para validación rápida
 * @param {string} projectPath - Ruta al proyecto
 * @param {object} options - Opciones de validación
 * @returns {Promise<ValidationReport>}
 */
export async function validate(projectPath, options = {}) {
  const engine = new ValidationEngine(options);
  const omnysysPath = options.omnysysPath || path.join(projectPath, '.omnysysdata');
  return engine.validate(projectPath, omnysysPath);
}

export default {
  ValidationEngine,
  validate,
  ValidationContext
};
