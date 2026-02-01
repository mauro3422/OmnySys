// fileB.js - Archivo intermedio (importa de C, exporta para A)

import { functionC, CONSTANT_C } from './fileC.js';

/**
 * Función que usa functionC y añade 10
 */
export function functionB(value) {
  const doubled = functionC(value);
  return doubled + 10;
}

/**
 * Función que usa la constante de C
 */
export function getConstant() {
  return CONSTANT_C;
}
