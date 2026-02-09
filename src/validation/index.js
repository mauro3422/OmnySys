/**
 * @fileoverview Validation System - Meta-Validator para OmnySys
 * 
 * Sistema de validación de 4 capas que verifica:
 * 1. Source: Los datos extraídos coinciden con el código fuente
 * 2. Derivation: Las derivaciones fractales son correctas
 * 3. Semantic: El data flow tiene sentido semántico
 * 4. Cross-Metadata: Las combinaciones de metadata son consistentes
 * 
 * Uso:
 *   import { ValidationEngine, validate } from './validation/index.js';
 *   
 *   const engine = new ValidationEngine();
 *   const report = await engine.validate('./my-project');
 *   console.log(report.toString());
 * 
 * @module validation
 * @version 1.0.0
 */

// Core
export { 
  ValidationResult, 
  ValidationReport, 
  ValidationSeverity, 
  ValidationType,
  createReport 
} from './core/validation-result.js';

export { 
  RuleRegistry, 
  ValidationRule, 
  getGlobalRegistry, 
  createRule 
} from './core/rule-registry.js';

export { 
  ValidationEngine, 
  ValidationContext, 
  validate 
} from './core/validation-engine.js';

// Source Validation Rules
export { FileExistenceRule } from './rules/source/file-existence.js';
export { ExportConsistencyRule } from './rules/source/export-consistency.js';
export { ImportResolutionRule } from './rules/source/import-resolution.js';
export { SourceRules, registerSourceRules } from './rules/source/index.js';

// Derivation Validation Rules
export { ComplexityCalculationRule } from './rules/derivation/complexity-calculation.js';

// System Invariants
export { 
  SystemInvariants, 
  registerInvariants,
  UniqueIdsInvariant,
  ValidReferencesInvariant,
  BidirectionalGraphInvariant
} from './invariants/system-invariants.js';

/**
 * Versión del sistema de validación
 */
export const VERSION = '1.0.0';

/**
 * Descripción de las capas de validación
 */
export const LAYERS = {
  source: {
    name: 'Source Validation',
    description: 'Verifica que los datos extraídos coinciden con el código fuente real',
    examples: ['Función existe en línea indicada', 'Export status es correcto', 'Call graph es consistente']
  },
  derivation: {
    name: 'Derivation Validation',
    description: 'Verifica que las derivaciones fractales sean matemáticamente correctas',
    examples: ['Complejidad total = suma de complejidades', 'Risk score = máximo de severidades', 'Archetype inferido correctamente']
  },
  semantic: {
    name: 'Semantic Validation',
    description: 'Verifica que el data flow tenga sentido semántico',
    examples: ['Inputs son usados o retornados', 'Transformaciones tienen sentido', 'No hay variables perdidas']
  },
  'cross-metadata': {
    name: 'Cross-Metadata Validation',
    description: 'Verifica que las combinaciones de metadata sean consistentes',
    examples: ['Confidence scores tienen sentido', 'Patrones detectados son reproducibles', 'Arquetipos son estables']
  }
};

/**
 * Registra todas las reglas built-in
 * Esta función se llama automáticamente al importar el módulo
 */
export async function registerBuiltinRules(registry = getGlobalRegistry()) {
  // TODO: Importar y registrar todas las reglas built-in
  // Esto se hará a medida que implementemos cada capa
  
  logger.info('Builtin rules registered');
  return registry;
}

import { createLogger } from '../utils/logger.js';
const logger = createLogger('OmnySys:validation');
