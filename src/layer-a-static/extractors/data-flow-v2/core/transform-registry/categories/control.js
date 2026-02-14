/**
 * @fileoverview Control Flow Transforms
 * 
 * Transformaciones de flujo de control.
 * 
 * @module data-flow-v2/transform-registry/categories/control
 * @version 1.0.0
 */

export const ControlTransforms = {
  CONDITIONAL: {
    type: 'CONDITIONAL',
    category: 'control',
    operator: '?:',
    purity: true,
    typeSignature: { in: ['boolean', 'any', 'any'], out: 'any' },
    standardToken: 'CTRL_TERNARY',
    description: 'Operador ternario condicional'
  },
  
  IF_ELSE: {
    type: 'IF_ELSE',
    category: 'control',
    operator: 'if-else',
    purity: 'unknown', // Depende de las ramas
    typeSignature: { in: ['boolean'], out: 'void' },
    standardToken: 'CTRL_IF',
    description: 'Estructura if-else'
  },
  
  SWITCH: {
    type: 'SWITCH',
    category: 'control',
    operator: 'switch',
    purity: 'unknown',
    typeSignature: { in: ['any'], out: 'any' },
    standardToken: 'CTRL_SWITCH',
    description: 'Estructura switch'
  },
  
  TRY_CATCH: {
    type: 'TRY_CATCH',
    category: 'control',
    operator: 'try-catch',
    purity: 'unknown',
    typeSignature: { in: [], out: 'any' },
    standardToken: 'CTRL_TRY',
    description: 'Manejo de excepciones'
  },
  
  LOOP_FOR: {
    type: 'LOOP_FOR',
    category: 'control',
    operator: 'for',
    purity: false, // Generalmente muta contador
    typeSignature: { in: [], out: 'void' },
    standardToken: 'CTRL_FOR',
    description: 'Bucle for'
  },
  
  LOOP_WHILE: {
    type: 'LOOP_WHILE',
    category: 'control',
    operator: 'while',
    purity: 'unknown',
    typeSignature: { in: [], out: 'void' },
    standardToken: 'CTRL_WHILE',
    description: 'Bucle while'
  },
  
  LOOP_FOREACH: {
    type: 'LOOP_FOREACH',
    category: 'control',
    operator: 'forEach',
    purity: 'unknown',
    typeSignature: { in: ['array', 'function'], out: 'void' },
    standardToken: 'CTRL_FOREACH',
    description: 'Iteración forEach'
  },
  
  LOOP_MAP: {
    type: 'LOOP_MAP',
    category: 'control',
    operator: 'map',
    purity: 'unknown', // Depende del callback
    typeSignature: { in: ['array', 'function'], out: 'array' },
    standardToken: 'CTRL_MAP',
    description: 'Transformación map'
  },
  
  LOOP_FILTER: {
    type: 'LOOP_FILTER',
    category: 'control',
    operator: 'filter',
    purity: 'unknown',
    typeSignature: { in: ['array', 'function'], out: 'array' },
    standardToken: 'CTRL_FILTER',
    description: 'Filtrado filter'
  },
  
  LOOP_REDUCE: {
    type: 'LOOP_REDUCE',
    category: 'control',
    operator: 'reduce',
    purity: 'unknown',
    typeSignature: { in: ['array', 'function', 'any'], out: 'any' },
    standardToken: 'CTRL_REDUCE',
    description: 'Reducción reduce'
  },
  
  AWAIT: {
    type: 'AWAIT',
    category: 'control',
    operator: 'await',
    purity: 'unknown',
    typeSignature: { in: ['Promise'], out: 'any' },
    standardToken: 'CTRL_AWAIT',
    description: 'Espera de promesa'
  },
  
  YIELD: {
    type: 'YIELD',
    category: 'control',
    operator: 'yield',
    purity: 'unknown',
    typeSignature: { in: ['any'], out: 'any' },
    standardToken: 'CTRL_YIELD',
    description: 'Pausa de generador'
  }
};

export default ControlTransforms;
