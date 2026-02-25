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
 * Tablas de búsqueda para inferencia de tipos
 */
const TYPE_RULES = {
  function: [
    'callback', 'cb', 'handler', 'onclick', 'listener', 'next'
  ],
  object: [
    'data', 'payload', 'options', 'opts', 'config', 'settings', 'meta', 'context', 'state', 'manager'
  ],
  array: [
    'items', 'list', 'arr', 'results', 'rows'
  ],
  string: [
    'id', 'key', 'token', 'name', 'title', 'text', 'msg', 'message', 'url', 'uri', 'path', 'file', 'code', 'source'
  ],
  number: [
    'count', 'num', 'amount', 'total', 'limit', 'page', 'size', 'price', 'cost', 'rate', 'index', 'idx'
  ],
  boolean: [
    'is', 'has', 'can', 'should', 'enabled', 'active', 'visible', 'flag', 'debug'
  ],
  Error: ['error', 'err'],
  Promise: ['promise'],
  httpRequest: ['req', 'request'],
  httpResponse: ['res', 'response']
};

/**
 * Verifica si un nombre coincide con alguna palabra clave
 * @param {string} name - Nombre a verificar
 * @param {string[]} keywords - Palabras clave
 * @returns {boolean} True si coincide
 */
function matchesKeyword(name, keywords) {
  return keywords.some(keyword => 
    name === keyword || name.includes(keyword) || (keyword === 'async' && name.endsWith('async'))
  );
}

/**
 * Infiere tipo desde nombre de parámetro
 * @param {string} name - Nombre del parámetro
 * @returns {string} Tipo inferido
 */
export function inferTypeFromParamName(name) {
  const n = (name || '').toLowerCase();
  
  for (const [type, keywords] of Object.entries(TYPE_RULES)) {
    if (matchesKeyword(n, keywords)) {
      return type;
    }
  }
  
  return 'unknown';
}
