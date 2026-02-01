// fileA.js - Archivo de nivel superior (importa de B)

import { functionB, getConstant } from './fileB.js';

/**
 * Función principal que usa functionB
 */
export function functionA(value) {
  const result = functionB(value);
  return result * 2;
}

/**
 * Función que obtiene el valor constante a través de B
 */
export function displayConstant() {
  const constant = getConstant();
  console.log('The constant is:', constant);
  return constant;
}

// Punto de entrada ejemplo
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('Result:', functionA(5)); // (5 * 2 + 10) * 2 = 40
  displayConstant(); // 42
}
