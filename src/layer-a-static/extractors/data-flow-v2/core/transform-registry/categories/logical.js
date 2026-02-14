/**
 * @fileoverview Logical Transforms
 * 
 * Transformaciones lógicas y de comparación.
 * 
 * @module data-flow-v2/transform-registry/categories/logical
 * @version 1.0.0
 */

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
  
  NULLISH_COALESCING: {
    type: 'NULLISH_COALESCING',
    category: 'logical',
    operator: '??',
    purity: true,
    commutative: false,
    shortCircuit: true,
    typeSignature: { in: ['any', 'any'], out: 'any' },
    standardToken: 'LOGIC_NULLISH',
    description: 'Operador nullish coalescing'
  },
  
  OPTIONAL_CHAINING: {
    type: 'OPTIONAL_CHAINING',
    category: 'logical',
    operator: '?.',
    purity: true,
    shortCircuit: true,
    typeSignature: { in: ['object', 'string'], out: 'any' },
    standardToken: 'LOGIC_OPT_CHAIN',
    description: 'Encadenamiento opcional'
  }
};

export const ComparisonTransforms = {
  EQUAL: {
    type: 'EQUAL',
    category: 'comparison',
    operator: '===',
    purity: true,
    commutative: true,
    typeSignature: { in: ['any', 'any'], out: 'boolean' },
    standardToken: 'COMP_EQ_STRICT',
    description: 'Igualdad estricta'
  },
  
  NOT_EQUAL: {
    type: 'NOT_EQUAL',
    category: 'comparison',
    operator: '!==',
    purity: true,
    commutative: true,
    typeSignature: { in: ['any', 'any'], out: 'boolean' },
    standardToken: 'COMP_NEQ_STRICT',
    description: 'Desigualdad estricta'
  },
  
  GREATER: {
    type: 'GREATER',
    category: 'comparison',
    operator: '>',
    purity: true,
    commutative: false,
    typeSignature: { in: ['number', 'number'], out: 'boolean' },
    standardToken: 'COMP_GT',
    description: 'Mayor que'
  },
  
  GREATER_EQUAL: {
    type: 'GREATER_EQUAL',
    category: 'comparison',
    operator: '>=',
    purity: true,
    commutative: false,
    typeSignature: { in: ['number', 'number'], out: 'boolean' },
    standardToken: 'COMP_GTE',
    description: 'Mayor o igual que'
  },
  
  LESS: {
    type: 'LESS',
    category: 'comparison',
    operator: '<',
    purity: true,
    commutative: false,
    typeSignature: { in: ['number', 'number'], out: 'boolean' },
    standardToken: 'COMP_LT',
    description: 'Menor que'
  },
  
  LESS_EQUAL: {
    type: 'LESS_EQUAL',
    category: 'comparison',
    operator: '<=',
    purity: true,
    commutative: false,
    typeSignature: { in: ['number', 'number'], out: 'boolean' },
    standardToken: 'COMP_LTE',
    description: 'Menor o igual que'
  }
};

export default { LogicalTransforms, ComparisonTransforms };
