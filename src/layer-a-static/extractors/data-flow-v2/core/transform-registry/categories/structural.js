/**
 * @fileoverview Structural Transforms
 * 
 * Transformaciones de estructuras de datos.
 * 
 * @module data-flow-v2/transform-registry/categories/structural
 * @version 1.0.0
 */

export const StructuralTransforms = {
  OBJECT_CREATE: {
    type: 'OBJECT_CREATE',
    category: 'structural',
    operator: '{}',
    purity: true,
    typeSignature: { in: [], out: 'object' },
    standardToken: 'STRUCT_OBJ_NEW',
    description: 'Creación de objeto literal'
  },
  
  OBJECT_ACCESS: {
    type: 'OBJECT_ACCESS',
    category: 'structural',
    operator: '.',
    purity: true,
    typeSignature: { in: ['object', 'string'], out: 'any' },
    standardToken: 'STRUCT_OBJ_GET',
    description: 'Acceso a propiedad de objeto'
  },
  
  OBJECT_SPREAD: {
    type: 'OBJECT_SPREAD',
    category: 'structural',
    operator: '...',
    purity: true,
    typeSignature: { in: ['object'], out: 'object' },
    standardToken: 'STRUCT_OBJ_SPREAD',
    description: 'Spread de objeto'
  },
  
  ARRAY_CREATE: {
    type: 'ARRAY_CREATE',
    category: 'structural',
    operator: '[]',
    purity: true,
    typeSignature: { in: [], out: 'array' },
    standardToken: 'STRUCT_ARR_NEW',
    description: 'Creación de array literal'
  },
  
  ARRAY_ACCESS: {
    type: 'ARRAY_ACCESS',
    category: 'structural',
    operator: '[]',
    purity: true,
    typeSignature: { in: ['array', 'number'], out: 'any' },
    standardToken: 'STRUCT_ARR_GET',
    description: 'Acceso por índice'
  },
  
  ARRAY_SPREAD: {
    type: 'ARRAY_SPREAD',
    category: 'structural',
    operator: '...',
    purity: true,
    typeSignature: { in: ['array'], out: 'array' },
    standardToken: 'STRUCT_ARR_SPREAD',
    description: 'Spread de array'
  },
  
  TEMPLATE_LITERAL: {
    type: 'TEMPLATE_LITERAL',
    category: 'structural',
    operator: '`${}`',
    purity: true,
    typeSignature: { in: ['string[]'], out: 'string' },
    standardToken: 'STRUCT_TEMPLATE',
    description: 'Template literal con interpolación'
  }
};

export default StructuralTransforms;
