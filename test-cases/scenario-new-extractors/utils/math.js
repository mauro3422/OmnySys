/**
 * Math utilities
 */

export function sum(a, b) {
  return a + b;
}

export function multiply(a, b) {
  return a * b;
}

export function average(numbers) {
  return numbers.reduce((a, b) => a + b, 0) / numbers.length;
}
