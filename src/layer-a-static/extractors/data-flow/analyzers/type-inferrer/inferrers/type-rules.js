/**
 * @fileoverview Type Rules
 * 
 * Defines type inference rules for operations.
 * 
 * @module data-flow-v2/analyzers/type-inferrer/inferrers/type-rules
 */

/**
 * Inicializa reglas de tipos para cada operación
 * @returns {Object} Type rules map
 */
export function initializeTypeRules() {
  return {
    // Aritmética
    ADD: { in: ['number', 'number'], out: 'number' },
    SUBTRACT: { in: ['number', 'number'], out: 'number' },
    MULTIPLY: { in: ['number', 'number'], out: 'number' },
    DIVIDE: { in: ['number', 'number'], out: 'number' },
    MODULO: { in: ['number', 'number'], out: 'number' },
    POWER: { in: ['number', 'number'], out: 'number' },
    
    // Lógica
    AND: { in: ['boolean', 'boolean'], out: 'boolean' },
    OR: { in: ['boolean', 'boolean'], out: 'boolean' },
    NOT: { in: ['boolean'], out: 'boolean' },
    EQUALS: { in: ['any', 'any'], out: 'boolean' },
    GREATER_THAN: { in: ['number', 'number'], out: 'boolean' },
    LESS_THAN: { in: ['number', 'number'], out: 'boolean' },
    
    // Estructural
    PROPERTY_ACCESS: { in: ['object', 'string'], out: 'any' },
    ARRAY_INDEX: { in: ['array', 'number'], out: 'any' },
    OBJECT_CREATE: { in: ['properties'], out: 'object' },
    ARRAY_CREATE: { in: ['elements'], out: 'array' },
    
    // Funcional
    MAP: { in: ['array', 'function'], out: 'array' },
    FILTER: { in: ['array', 'predicate'], out: 'array' },
    REDUCE: { in: ['array', 'reducer', 'any'], out: 'any' },
    FIND: { in: ['array', 'predicate'], out: 'element|null' },
    SOME: { in: ['array', 'predicate'], out: 'boolean' },
    EVERY: { in: ['array', 'predicate'], out: 'boolean' },
    
    // Control
    CONDITIONAL_BRANCH: { in: ['boolean'], out: 'void' },
    TERNARY: { in: ['boolean', 'any', 'any'], out: 'union' },
    
    // String operations (implícitos)
    CONCAT: { in: ['string', 'string'], out: 'string' },
    
    // Defaults
    FUNCTION_CALL: { in: ['arguments'], out: 'unknown' },
    ASSIGN: { in: ['any'], out: 'any' }
  };
}
