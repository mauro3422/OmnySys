/**
 * @fileoverview Test Comparator - Compara tests existentes con generados
 */

/**
 * Compara tests existentes con código generado para detectar divergencias
 * @param {Array} existingTests - Tests existentes
 * @param {Array} generatedTests - Tests generados
 * @returns {Object} - Resultado de la comparación
 */
export function compareWithGeneratedTests(existingTests, generatedTests) {
  const comparison = {
    matching: [],
    missingInExisting: [],
    extraInExisting: []
  };
  
  const existingNames = new Set(
    existingTests
      .filter(t => t.type === 'test')
      .map(t => t.name.toLowerCase())
  );
  
  const generatedNames = new Set(
    generatedTests.map(t => t.name.toLowerCase())
  );
  
  // Encontrar tests que coinciden
  existingNames.forEach(name => {
    if (generatedNames.has(name)) {
      comparison.matching.push(name);
    } else {
      comparison.extraInExisting.push(name);
    }
  });
  
  // Encontrar tests faltantes
  generatedNames.forEach(name => {
    if (!existingNames.has(name)) {
      comparison.missingInExisting.push(name);
    }
  });
  
  return comparison;
}