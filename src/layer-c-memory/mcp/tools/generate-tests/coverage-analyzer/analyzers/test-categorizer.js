/**
 * @fileoverview Test Categorizer - Categoriza tests basado en su nombre
 */

/**
 * Categoriza un test basado en su nombre
 * @param {string} testName - Nombre del test
 * @param {Set} testedCases - Set de casos ya testeados
 */
export function categorizeTest(testName, testedCases) {
  const lower = testName.toLowerCase();
  
  if (lower.includes('should return') || lower.includes('should create') || lower.includes('happy')) {
    testedCases.add('happy-path');
  }
  
  if (lower.includes('error') || lower.includes('throw') || lower.includes('exception') || lower.includes('fail')) {
    testedCases.add('error');
  }
  
  if (lower.includes('edge') || lower.includes('boundary') || lower.includes('limit')) {
    testedCases.add('edge-case');
  }
  
  if (lower.includes('null') || lower.includes('undefined')) {
    testedCases.add('null');
  }
  
  if (lower.includes('async') || lower.includes('await') || lower.includes('promise')) {
    testedCases.add('async');
  }
}