/**
 * @fileoverview Arithmetic Transforms
 * 
 * Transformaciones aritméticas primitivas.
 * 
 * @module data-flow-v2/transform-registry/categories/arithmetic
 * @version 1.0.0
 */

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
  },
  
  INCREMENT: {
    type: 'INCREMENT',
    category: 'arithmetic',
    operator: '++',
    unary: true,
    purity: false, // Modifica el valor
    typeSignature: { in: ['number'], out: 'number' },
    standardToken: 'ARITH_INC',
    description: 'Incremento (mutación)'
  },
  
  DECREMENT: {
    type: 'DECREMENT',
    category: 'arithmetic',
    operator: '--',
    unary: true,
    purity: false, // Modifica el valor
    typeSignature: { in: ['number'], out: 'number' },
    standardToken: 'ARITH_DEC',
    description: 'Decremento (mutación)'
  }
};

export default ArithmeticTransforms;
