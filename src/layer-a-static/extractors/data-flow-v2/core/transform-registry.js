/**
 * @fileoverview Transform Registry - Catalogo completo de transformaciones primitivas
 * 
 * Cada transformación define:
 * - type: Identificador único
 * - category: Clasificación (arithmetic, logical, structural, etc.)
 * - purity: Si es función pura (true) o tiene side effects (false)
 * - typePreservation: Cómo transforma tipos (input → output)
 * - standardToken: Token estandarizado para ML
 * 
 * @module data-flow-v2/core/transform-registry
 */

// ============================================================================
// ARITHMETIC TRANSFORMS
// ============================================================================

export const ArithmeticTransforms = {
  ADD: {
    type: 'ADD',
    category: 'arithmetic',
    operator: '+',
    purity: true,
    commutative: true,
    typeSignature: { in: ['number', 'number'], out: 'number' },
    standardToken: 'ARITH_ADD',
    description: 'Suma dos valores'
  },
  
  SUBTRACT: {
    type: 'SUBTRACT',
    category: 'arithmetic',
    operator: '-',
    purity: true,
    commutative: false,
    typeSignature: { in: ['number', 'number'], out: 'number' },
    standardToken: 'ARITH_SUB',
    description: 'Resta segundo valor del primero'
  },
  
  MULTIPLY: {
    type: 'MULTIPLY',
    category: 'arithmetic',
    operator: '*',
    purity: true,
    commutative: true,
    typeSignature: { in: ['number', 'number'], out: 'number' },
    standardToken: 'ARITH_MUL',
    description: 'Multiplica dos valores'
  },
  
  DIVIDE: {
    type: 'DIVIDE',
    category: 'arithmetic',
    operator: '/',
    purity: true,
    commutative: false,
    typeSignature: { in: ['number', 'number'], out: 'number' },
    standardToken: 'ARITH_DIV',
    description: 'Divide primer valor por segundo',
    potentialErrors: ['DIVISION_BY_ZERO']
  },
  
  MODULO: {
    type: 'MODULO',
    category: 'arithmetic',
    operator: '%',
    purity: true,
    commutative: false,
    typeSignature: { in: ['number', 'number'], out: 'number' },
    standardToken: 'ARITH_MOD',
    description: 'Resto de división'
  },
  
  POWER: {
    type: 'POWER',
    category: 'arithmetic',
    operator: '**',
    purity: true,
    commutative: false,
    typeSignature: { in: ['number', 'number'], out: 'number' },
    standardToken: 'ARITH_POW',
    description: 'Potencia (base ** exponente)'
  },
  
  UNARY_PLUS: {
    type: 'UNARY_PLUS',
    category: 'arithmetic',
    operator: '+',
    unary: true,
    purity: true,
    typeSignature: { in: ['number'], out: 'number' },
    standardToken: 'ARITH_UPLUS',
    description: 'Conversión a número positivo'
  },
  
  UNARY_MINUS: {
    type: 'UNARY_MINUS',
    category: 'arithmetic',
    operator: '-',
    unary: true,
    purity: true,
    typeSignature: { in: ['number'], out: 'number' },
    standardToken: 'ARITH_UMINUS',
    description: 'Negación aritmética'
  }
};

// ============================================================================
// LOGICAL TRANSFORMS
// ============================================================================

export const LogicalTransforms = {
  AND: {
    type: 'AND',
    category: 'logical',
    operator: '&&',
    purity: true,
    commutative: true,
    shortCircuit: true,
    typeSignature: { in: ['boolean', 'boolean'], out: 'boolean' },
    standardToken: 'LOGIC_AND',
    description: 'AND lógico con short-circuit'
  },
  
  OR: {
    type: 'OR',
    category: 'logical',
    operator: '||',
    purity: true,
    commutative: true,
    shortCircuit: true,
    typeSignature: { in: ['boolean', 'boolean'], out: 'boolean' },
    standardToken: 'LOGIC_OR',
    description: 'OR lógico con short-circuit'
  },
  
  NOT: {
    type: 'NOT',
    category: 'logical',
    operator: '!',
    unary: true,
    purity: true,
    typeSignature: { in: ['boolean'], out: 'boolean' },
    standardToken: 'LOGIC_NOT',
    description: 'Negación lógica'
  },
  
  EQUALS: {
    type: 'EQUALS',
    category: 'logical',
    operator: '===',
    purity: true,
    commutative: true,
    typeSignature: { in: ['any', 'any'], out: 'boolean' },
    standardToken: 'LOGIC_EQ',
    description: 'Igualdad estricta'
  },
  
  NOT_EQUALS: {
    type: 'NOT_EQUALS',
    category: 'logical',
    operator: '!==',
    purity: true,
    commutative: true,
    typeSignature: { in: ['any', 'any'], out: 'boolean' },
    standardToken: 'LOGIC_NEQ',
    description: 'Desigualdad estricta'
  },
  
  GREATER_THAN: {
    type: 'GREATER_THAN',
    category: 'logical',
    operator: '>',
    purity: true,
    commutative: false,
    typeSignature: { in: ['number', 'number'], out: 'boolean' },
    standardToken: 'LOGIC_GT',
    description: 'Mayor que'
  },
  
  LESS_THAN: {
    type: 'LESS_THAN',
    category: 'logical',
    operator: '<',
    purity: true,
    commutative: false,
    typeSignature: { in: ['number', 'number'], out: 'boolean' },
    standardToken: 'LOGIC_LT',
    description: 'Menor que'
  }
};

// ============================================================================
// STRUCTURAL TRANSFORMS
// ============================================================================

export const StructuralTransforms = {
  PROPERTY_ACCESS: {
    type: 'PROPERTY_ACCESS',
    category: 'structural',
    syntax: 'obj.prop',
    purity: true,
    typeSignature: { in: ['object', 'string'], out: 'any' },
    standardToken: 'STRUCT_PROP',
    description: 'Acceso a propiedad de objeto',
    potentialErrors: ['NULL_POINTER', 'UNDEFINED_PROPERTY']
  },
  
  ARRAY_INDEX: {
    type: 'ARRAY_INDEX',
    category: 'structural',
    syntax: 'arr[i]',
    purity: true,
    typeSignature: { in: ['array', 'number'], out: 'any' },
    standardToken: 'STRUCT_IDX',
    description: 'Acceso por índice a array',
    potentialErrors: ['INDEX_OUT_OF_BOUNDS']
  },
  
  OBJECT_CREATE: {
    type: 'OBJECT_CREATE',
    category: 'structural',
    syntax: '{ ... }',
    purity: true,
    typeSignature: { in: ['properties'], out: 'object' },
    standardToken: 'STRUCT_OBJ',
    description: 'Creación de objeto literal'
  },
  
  ARRAY_CREATE: {
    type: 'ARRAY_CREATE',
    category: 'structural',
    syntax: '[ ... ]',
    purity: true,
    typeSignature: { in: ['elements'], out: 'array' },
    standardToken: 'STRUCT_ARR',
    description: 'Creación de array literal'
  },
  
  SPREAD: {
    type: 'SPREAD',
    category: 'structural',
    syntax: '...obj',
    purity: true,
    typeSignature: { in: ['iterable'], out: 'elements' },
    standardToken: 'STRUCT_SPREAD',
    description: 'Expansión de iterable'
  },
  
  DESTRUCTURE_OBJECT: {
    type: 'DESTRUCTURE_OBJECT',
    category: 'structural',
    syntax: 'const { a, b } = obj',
    purity: true,
    typeSignature: { in: ['object'], out: 'properties' },
    standardToken: 'STRUCT_DESTR_OBJ',
    description: 'Desestructuración de objeto'
  },
  
  DESTRUCTURE_ARRAY: {
    type: 'DESTRUCTURE_ARRAY',
    category: 'structural',
    syntax: 'const [a, b] = arr',
    purity: true,
    typeSignature: { in: ['array'], out: 'elements' },
    standardToken: 'STRUCT_DESTR_ARR',
    description: 'Desestructuración de array'
  }
};

// ============================================================================
// FUNCTIONAL TRANSFORMS (Array Methods)
// ============================================================================

export const FunctionalTransforms = {
  MAP: {
    type: 'MAP',
    category: 'functional',
    method: 'map',
    purity: true, // Si el callback es puro
    typeSignature: { in: ['array', 'function'], out: 'array' },
    standardToken: 'FUNC_MAP',
    description: 'Transforma cada elemento del array'
  },
  
  FILTER: {
    type: 'FILTER',
    category: 'functional',
    method: 'filter',
    purity: true,
    typeSignature: { in: ['array', 'predicate'], out: 'array' },
    standardToken: 'FUNC_FILTER',
    description: 'Filtra elementos según predicado'
  },
  
  REDUCE: {
    type: 'REDUCE',
    category: 'functional',
    method: 'reduce',
    purity: true,
    typeSignature: { in: ['array', 'reducer', 'initial'], out: 'any' },
    standardToken: 'FUNC_REDUCE',
    description: 'Reduce array a valor acumulado'
  },
  
  FIND: {
    type: 'FIND',
    category: 'functional',
    method: 'find',
    purity: true,
    typeSignature: { in: ['array', 'predicate'], out: 'element' },
    standardToken: 'FUNC_FIND',
    description: 'Encuentra primer elemento que cumple'
  },
  
  SOME: {
    type: 'SOME',
    category: 'functional',
    method: 'some',
    purity: true,
    typeSignature: { in: ['array', 'predicate'], out: 'boolean' },
    standardToken: 'FUNC_SOME',
    description: 'Verifica si algún elemento cumple'
  },
  
  EVERY: {
    type: 'EVERY',
    category: 'functional',
    method: 'every',
    purity: true,
    typeSignature: { in: ['array', 'predicate'], out: 'boolean' },
    standardToken: 'FUNC_EVERY',
    description: 'Verifica si todos los elementos cumplen'
  }
};

// ============================================================================
// CONTROL FLOW TRANSFORMS
// ============================================================================

export const ControlTransforms = {
  CONDITIONAL: {
    type: 'CONDITIONAL',
    category: 'control',
    syntax: 'cond ? a : b',
    purity: true,
    typeSignature: { in: ['boolean', 'any', 'any'], out: 'any' },
    standardToken: 'CTRL_COND',
    description: 'Operador ternario condicional'
  },
  
  NULL_COALESCE: {
    type: 'NULL_COALESCE',
    category: 'control',
    syntax: 'a ?? b',
    purity: true,
    typeSignature: { in: ['nullable', 'default'], out: 'any' },
    standardToken: 'CTRL_NULLISH',
    description: 'Nullish coalescing (solo null/undefined)'
  },
  
  OPTIONAL_CHAIN: {
    type: 'OPTIONAL_CHAIN',
    category: 'control',
    syntax: 'obj?.prop',
    purity: true,
    typeSignature: { in: ['nullable', 'property'], out: 'any' },
    standardToken: 'CTRL_OPT_CHAIN',
    description: 'Optional chaining (evita null pointer)'
  },
  
  AWAIT: {
    type: 'AWAIT',
    category: 'control',
    syntax: 'await promise',
    purity: false, // Puede lanzar si promise rechaza
    async: true,
    typeSignature: { in: ['promise'], out: 'resolved' },
    standardToken: 'CTRL_AWAIT',
    description: 'Espera resolución de promise'
  }
};

// ============================================================================
// SIDE EFFECT TRANSFORMS
// ============================================================================

export const SideEffectTransforms = {
  NETWORK_CALL: {
    type: 'NETWORK_CALL',
    category: 'side_effect',
    functions: ['fetch', 'axios.get', 'axios.post', 'XMLHttpRequest'],
    purity: false,
    async: true,
    mutatesExternal: true,
    idempotent: false,
    standardToken: 'SE_NETWORK',
    description: 'Llamada HTTP de red'
  },
  
  DB_READ: {
    type: 'DB_READ',
    category: 'side_effect',
    functions: ['db.find', 'db.query', 'db.get', 'findOne', 'select'],
    purity: false,
    async: true,
    mutatesExternal: false,
    idempotent: true,
    standardToken: 'SE_DB_READ',
    description: 'Lectura de base de datos'
  },
  
  DB_WRITE: {
    type: 'DB_WRITE',
    category: 'side_effect',
    functions: ['db.insert', 'db.update', 'db.delete', 'save', 'create'],
    purity: false,
    async: true,
    mutatesExternal: true,
    idempotent: false,
    standardToken: 'SE_DB_WRITE',
    description: 'Escritura en base de datos'
  },
  
  STORAGE_READ: {
    type: 'STORAGE_READ',
    category: 'side_effect',
    functions: ['localStorage.getItem', 'sessionStorage.getItem'],
    purity: false,
    async: false,
    mutatesExternal: false,
    idempotent: true,
    standardToken: 'SE_STORAGE_READ',
    description: 'Lectura de localStorage'
  },
  
  STORAGE_WRITE: {
    type: 'STORAGE_WRITE',
    category: 'side_effect',
    functions: ['localStorage.setItem', 'sessionStorage.setItem', 'localStorage.removeItem'],
    purity: false,
    async: false,
    mutatesExternal: true,
    idempotent: false,
    standardToken: 'SE_STORAGE_WRITE',
    description: 'Escritura en localStorage'
  },
  
  EVENT_EMIT: {
    type: 'EVENT_EMIT',
    category: 'side_effect',
    functions: ['emit', 'dispatch', 'trigger', 'broadcast'],
    purity: false,
    async: false,
    mutatesExternal: true,
    idempotent: false,
    standardToken: 'SE_EVENT_EMIT',
    description: 'Emisión de evento'
  },
  
  LOG_WRITE: {
    type: 'LOG_WRITE',
    category: 'side_effect',
    functions: ['console.log', 'console.warn', 'console.error', 'console.info'],
    purity: false,
    async: false,
    mutatesExternal: true, // Escribe a stdout
    idempotent: true,
    standardToken: 'SE_LOG',
    description: 'Escritura a log'
  }
};

// ============================================================================
// REGISTRY API
// ============================================================================

const AllTransforms = {
  ...ArithmeticTransforms,
  ...LogicalTransforms,
  ...StructuralTransforms,
  ...FunctionalTransforms,
  ...ControlTransforms,
  ...SideEffectTransforms
};

/**
 * Busca una transformación por tipo
 */
export function getTransform(type) {
  return AllTransforms[type] || null;
}

/**
 * Busca transformación por operador
 */
export function getTransformByOperator(operator) {
  return Object.values(AllTransforms).find(t => t.operator === operator) || null;
}

/**
 * Detecta si una llamada de función es un side effect conocido
 */
export function detectSideEffectTransform(funcName) {
  for (const [type, transform] of Object.entries(SideEffectTransforms)) {
    if (transform.functions?.some(f => 
      funcName === f || funcName.endsWith('.' + f.split('.').pop())
    )) {
      return transform;
    }
  }
  return null;
}

/**
 * Detecta transformación funcional por método de array
 */
export function detectFunctionalTransform(methodName) {
  return Object.values(FunctionalTransforms).find(t => 
    t.method === methodName
  ) || null;
}

/**
 * Obtiene todos los transforms de una categoría
 */
export function getTransformsByCategory(category) {
  return Object.values(AllTransforms).filter(t => t.category === category);
}

/**
 * Obtiene todos los tokens estándar (para ML)
 */
export function getAllStandardTokens() {
  return Object.values(AllTransforms).map(t => t.standardToken);
}

export default AllTransforms;
