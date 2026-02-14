/**
 * @fileoverview Functional Transforms
 * 
 * Transformaciones de programación funcional.
 * 
 * @module data-flow-v2/transform-registry/categories/functional
 * @version 1.0.0
 */

export const FunctionalTransforms = {
  FUNCTION_CALL: {
    type: 'FUNCTION_CALL',
    category: 'functional',
    operator: '()',
    purity: 'unknown', // Depende de la función
    typeSignature: { in: ['function', 'any[]'], out: 'any' },
    standardToken: 'FUNC_CALL',
    description: 'Llamada a función'
  },
  
  ARROW_FUNCTION: {
    type: 'ARROW_FUNCTION',
    category: 'functional',
    operator: '=>',
    purity: 'unknown', // Depende del cuerpo
    typeSignature: { in: [], out: 'function' },
    standardToken: 'FUNC_ARROW',
    description: 'Función flecha'
  },
  
  FUNCTION_DECLARATION: {
    type: 'FUNCTION_DECLARATION',
    category: 'functional',
    operator: 'function',
    purity: 'unknown',
    typeSignature: { in: [], out: 'function' },
    standardToken: 'FUNC_DECL',
    description: 'Declaración de función'
  },
  
  IIFE: {
    type: 'IIFE',
    category: 'functional',
    operator: '(function(){})()',
    purity: 'unknown',
    typeSignature: { in: [], out: 'any' },
    standardToken: 'FUNC_IIFE',
    description: 'Immediately Invoked Function Expression'
  },
  
  CURRY: {
    type: 'CURRY',
    category: 'functional',
    operator: 'curry',
    purity: true,
    typeSignature: { in: ['function'], out: 'function' },
    standardToken: 'FUNC_CURRY',
    description: 'Currificación de función'
  },
  
  COMPOSE: {
    type: 'COMPOSE',
    category: 'functional',
    operator: 'compose',
    purity: true,
    typeSignature: { in: ['function[]'], out: 'function' },
    standardToken: 'FUNC_COMPOSE',
    description: 'Composición de funciones'
  },
  
  PIPE: {
    type: 'PIPE',
    category: 'functional',
    operator: 'pipe',
    purity: true,
    typeSignature: { in: ['any', 'function[]'], out: 'any' },
    standardToken: 'FUNC_PIPE',
    description: 'Pipeline de funciones'
  }
};

export default FunctionalTransforms;
