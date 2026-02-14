/**
 * @fileoverview Type Definitions
 * 
 * Definiciones de tipos para el sistema de contratos de tipo.
 * 
 * @module type-contracts/types
 * @version 1.0.0
 */

/**
 * @typedef {Object} TypeContract
 * @property {ParameterContract[]} params - Parámetros de la función
 * @property {ReturnContract|null} returns - Tipo de retorno
 * @property {ThrowContract[]} throws - Errores que puede lanzar
 * @property {GenericContract[]} generics - Type parameters
 * @property {string|null} signature - Firma completa como string
 * @property {number} confidence - Confianza del contrato (0-1)
 */

/**
 * @typedef {Object} ParameterContract
 * @property {string} name - Nombre del parámetro
 * @property {string} type - Tipo
 * @property {boolean} optional - Si es opcional
 * @property {string} [defaultValue] - Valor por defecto
 * @property {string} [description] - Descripción
 * @property {boolean} [inferred] - Si fue inferido vs explícito
 */

/**
 * @typedef {Object} ReturnContract
 * @property {string} type - Tipo de retorno
 * @property {string} [description] - Descripción
 * @property {boolean} nullable - Si puede ser null/undefined
 * @property {boolean} [inferred] - Si fue inferido
 */

/**
 * @typedef {Object} ThrowContract
 * @property {string} type - Tipo de error
 * @property {string} [description] - Descripción
 * @property {string} condition - Condición que causa el error
 */

/**
 * @typedef {Object} GenericContract
 * @property {string} name - Nombre del parámetro de tipo
 * @property {string} [constraint] - Restricción (ej: extends T)
 * @property {string} [default] - Valor por defecto
 */

/**
 * @typedef {Object} CompatibilityResult
 * @property {boolean} compatible - Si son compatibles
 * @property {number} confidence - Confianza (0-1)
 * @property {'none'|'implicit'|'explicit'} coercion - Tipo de coerción necesaria
 * @property {boolean} nullable - Si acepta null
 * @property {string} [reason] - Razón de incompatibilidad
 */

/**
 * @typedef {Object} TypeConnection
 * @property {string} type - 'type-contract'
 * @property {string} from - ID átomo origen
 * @property {string} to - ID átomo destino
 * @property {string} param - Nombre del parámetro
 * @property {string} outputType - Tipo de salida
 * @property {string} inputType - Tipo de entrada
 * @property {boolean} compatible - Si son compatibles
 * @property {number} confidence - Confianza
 * @property {string} coercion - Tipo de coerción
 * @property {Object} signature - Firmas de origen y destino
 */

/**
 * @typedef {Object} ExtractionContext
 * @property {string} code - Código fuente
 * @property {Object} [jsdoc] - JSDoc parseado
 * @property {Object} [ast] - AST de la función
 * @property {string} [language] - 'javascript' | 'typescript'
 */

// Constantes
export const TYPE_KINDS = {
  PRIMITIVE: 'primitive',
  OBJECT: 'object',
  ARRAY: 'array',
  FUNCTION: 'function',
  UNION: 'union',
  GENERIC: 'generic',
  PROMISE: 'promise',
  UNKNOWN: 'unknown'
};

export const PRIMITIVE_TYPES = new Set([
  'string', 'number', 'boolean', 'null', 'undefined', 
  'symbol', 'bigint', 'any', 'unknown', 'never', 'void'
]);

export const COERCION_TYPES = {
  NONE: 'none',
  IMPLICIT: 'implicit',
  EXPLICIT: 'explicit'
};

export default {
  TYPE_KINDS,
  PRIMITIVE_TYPES,
  COERCION_TYPES
};
