/**
 * @fileoverview Side Effect Transforms
 * 
 * Transformaciones con efectos secundarios.
 * 
 * @module data-flow-v2/transform-registry/categories/side-effects
 * @version 1.0.0
 */

export const SideEffectTransforms = {
  ASSIGNMENT: {
    type: 'ASSIGNMENT',
    category: 'side-effect',
    operator: '=',
    purity: false,
    typeSignature: { in: ['any'], out: 'any' },
    standardToken: 'SE_ASSIGN',
    description: 'Asignación simple'
  },
  
  COMPOUND_ASSIGNMENT: {
    type: 'COMPOUND_ASSIGNMENT',
    category: 'side-effect',
    operator: '+=, -=, *=, /=',
    purity: false,
    typeSignature: { in: ['number'], out: 'number' },
    standardToken: 'SE_COMPOUND',
    description: 'Asignación compuesta'
  },
  
  DELETE: {
    type: 'DELETE',
    category: 'side-effect',
    operator: 'delete',
    purity: false,
    typeSignature: { in: ['object', 'string'], out: 'boolean' },
    standardToken: 'SE_DELETE',
    description: 'Eliminación de propiedad'
  },
  
  DOM_MANIPULATION: {
    type: 'DOM_MANIPULATION',
    category: 'side-effect',
    operator: 'dom',
    purity: false,
    typeSignature: { in: [], out: 'void' },
    standardToken: 'SE_DOM',
    description: 'Manipulación del DOM'
  },
  
  NETWORK_CALL: {
    type: 'NETWORK_CALL',
    category: 'side-effect',
    operator: 'fetch',
    purity: false,
    typeSignature: { in: ['string'], out: 'Promise' },
    standardToken: 'SE_NETWORK',
    description: 'Llamada de red'
  },
  
  STORAGE_READ: {
    type: 'STORAGE_READ',
    category: 'side-effect',
    operator: 'getItem',
    purity: false,
    typeSignature: { in: ['string'], out: 'string|null' },
    standardToken: 'SE_STORAGE_GET',
    description: 'Lectura de almacenamiento'
  },
  
  STORAGE_WRITE: {
    type: 'STORAGE_WRITE',
    category: 'side-effect',
    operator: 'setItem',
    purity: false,
    typeSignature: { in: ['string', 'string'], out: 'void' },
    standardToken: 'SE_STORAGE_SET',
    description: 'Escritura de almacenamiento'
  },
  
  CONSOLE_LOG: {
    type: 'CONSOLE_LOG',
    category: 'side-effect',
    operator: 'console.log',
    purity: false,
    typeSignature: { in: ['any[]'], out: 'void' },
    standardToken: 'SE_CONSOLE',
    description: 'Salida por consola'
  },
  
  THROW: {
    type: 'THROW',
    category: 'side-effect',
    operator: 'throw',
    purity: false,
    typeSignature: { in: ['Error'], out: 'never' },
    standardToken: 'SE_THROW',
    description: 'Lanzamiento de excepción'
  },
  
  RETURN: {
    type: 'RETURN',
    category: 'control',
    operator: 'return',
    purity: true,
    typeSignature: { in: ['any'], out: 'any' },
    standardToken: 'CTRL_RETURN',
    description: 'Retorno de función'
  },
  
  IMPORT: {
    type: 'IMPORT',
    category: 'side-effect',
    operator: 'import',
    purity: 'unknown',
    typeSignature: { in: ['string'], out: 'module' },
    standardToken: 'SE_IMPORT',
    description: 'Importación de módulo'
  },
  
  EXPORT: {
    type: 'EXPORT',
    category: 'side-effect',
    operator: 'export',
    purity: true,
    typeSignature: { in: ['any'], out: 'any' },
    standardToken: 'SE_EXPORT',
    description: 'Exportación de módulo'
  }
};

export default SideEffectTransforms;
