/**
 * @fileoverview FunctionalTestFactory - Tests que ejecutan código real
 * 
 * Genera automáticamente tests funcionales agrupados por patrones de retorno.
 * Extiende el Meta-Factory para tests que invocan la lógica real.
 * 
 * @module tests/factories/functional/functional-test.factory
 * @version 1.0.0
 */

// Re-exportar todo desde los módulos separados
export { createFunctionalTestSuite } from './create-functional-test-suite.js';
export { 
  validatePatternStructure, 
  expectNoCrash, 
  expectEmptyStructure 
} from './pattern-validators.js';
export { runPatternValidations } from './test-runners.js';
export { fixtureHelpers, mockHelpers } from './test-helpers.js';
