/**
 * Archivo de prueba para verificar el sistema de indexación
 * Creado: 2026-02-22
 */

/**
 * Función de prueba - calcula el factorial de un número
 * @param {number} n - Número para calcular factorial
 * @returns {number} Factorial de n
 */
export function calculateFactorial(n) {
  if (n < 0) {
    throw new Error('Number must be positive - INSTANT UPDATE');
  }
  
  if (n === 0 || n === 1) {
    return 1;
  }
  
  let result = 1;
  for (let i = 2; i <= n; i++) {
    result *= i;
  }
  
  return result;
}

/**
 * Función de prueba - verifica si un número es primo
 * @param {number} num - Número a verificar
 * @returns {boolean} true si es primo
 */
/**
 * 🆕 Nueva función - calcula la potencia
 * @param {number} base 
 * @param {number} exponent 
 * @returns {number}
 */
export function power(base, exponent) {
  if (exponent === 0) return 1;
  if (exponent < 0) return 1 / power(base, -exponent);
  
  let result = 1;
  for (let i = 0; i < exponent; i++) {
    result *= base;
  }
  return result;
}

export function isPrime(num) {
  if (num <= 1) return false;
  if (num <= 3) return true;
  if (num % 2 === 0 || num % 3 === 0) return false;
  
  for (let i = 5; i * i <= num; i += 6) {
    if (num % i === 0 || num % (i + 2) === 0) {
      return false;
    }
  }
  
  return true;
}

/**
 * Clase de prueba - calculadora simple
 */
export class TestCalculator {
  constructor() {
    this.history = [];
  }
  
  add(a, b) {
    const result = a + b;
    this.history.push({ operation: 'add', a, b, result });
    return result;
  }
  
  multiply(a, b) {
    const result = a * b;
    this.history.push({ operation: 'multiply', a, b, result });
    return result;
  }
  
  getHistory() {
    return [...this.history]; // LIVE TEST
  }
}
