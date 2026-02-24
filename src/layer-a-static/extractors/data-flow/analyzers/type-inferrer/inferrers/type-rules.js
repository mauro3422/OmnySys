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
    // INPUT: reglas para parámetros de funciones
    INPUT: { in: [], out: 'infer_from_name' },
    
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

/**
 * Infiere tipo desde nombre de parámetro
 * @param {string} name - Nombre del parámetro
 * @returns {string} Tipo inferido
 */
export function inferTypeFromParamName(name) {
  const n = (name || '').toLowerCase();
  
  // HTTP/Express
  if (n === 'req' || n === 'request') return 'httpRequest';
  if (n === 'res' || n === 'response') return 'httpResponse';
  if (n === 'next') return 'function';
  
  // Callbacks/Handlers
  if (n.includes('callback') || n.includes('cb')) return 'function';
  if (n.includes('handler') || n.includes('handler')) return 'function';
  if (n.includes('onclick') || n.includes('listener')) return 'function';
  
  // Data types
  if (n.includes('data') || n.includes('payload')) return 'object';
  if (n.includes('items') || n.includes('list') || n.includes('arr')) return 'array';
  if (n.includes('results') || n.includes('rows')) return 'array';
  
  // Primitivos
  if (n.includes('id') || n.includes('key') || n.includes('token')) return 'string';
  if (n.includes('name') || n.includes('title') || n.includes('text') || n.includes('msg') || n.includes('message')) return 'string';
  if (n.includes('url') || n.includes('uri') || n.includes('path') || n.includes('file')) return 'string';
  if (n.includes('code') || n.includes('source')) return 'string';
  
  if (n.includes('count') || n.includes('num') || n.includes('amount') || n.includes('total') || n.includes('limit') || n.includes('page') || n.includes('size')) return 'number';
  if (n.includes('price') || n.includes('cost') || n.includes('rate')) return 'number';
  if (n.includes('index') || n.includes('idx')) return 'number';
  
  if (n.includes('is') || n.includes('has') || n.includes('can') || n.includes('should') || n.includes('enabled') || n.includes('active') || n.includes('visible')) return 'boolean';
  if (n.includes('flag') || n.includes('debug')) return 'boolean';
  
  // Config/Options
  if (n.includes('options') || n.includes('opts') || n.includes('config') || n.includes('settings')) return 'object';
  if (n.includes('meta') || n.includes('context')) return 'object';
  
  // State
  if (n.includes('state') || n.includes('manager')) return 'object';
  
  // Error
  if (n.includes('error') || n.includes('err')) return 'Error';
  
  // Promise/Async
  if (n.includes('promise') || n.endsWith('async')) return 'Promise';
  
  return 'unknown';
}
