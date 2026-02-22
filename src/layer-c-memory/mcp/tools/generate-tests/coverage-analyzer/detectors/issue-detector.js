/**
 * @fileoverview Issue Detector - Detecta tests obsoletos y duplicados
 */

/**
 * Detecta tests obsoletos (que referencian código que ya no existe)
 * @param {Array} existingTests - Tests existentes
 * @param {string} projectPath - Ruta del proyecto
 * @returns {Array} - Tests obsoletos detectados
 */
export function detectObsoleteTests(existingTests, projectPath) {
  const obsolete = [];
  
  // TODO: Implementar verificación contra el código fuente actual
  // Esto requeriría:
  // 1. Extraer qué funciones/clases se importan en el test
  // 2. Verificar que existan en el código fuente
  // 3. Marcar como obsoleto si no existen
  
  return obsolete;
}

/**
 * Detecta tests duplicados
 * @param {Array} existingTests - Tests existentes
 * @returns {Array} - Tests duplicados detectados
 */
export function detectDuplicateTests(existingTests) {
  const duplicates = [];
  const seen = new Map();
  
  existingTests.forEach(test => {
    if (test.type === 'test') {
      const normalized = test.name.toLowerCase().replace(/\s+/g, ' ').trim();
      
      if (seen.has(normalized)) {
        duplicates.push({
          name: test.name,
          firstOccurrence: seen.get(normalized),
          duplicate: test
        });
      } else {
        seen.set(normalized, test);
      }
    }
    
    // Revisar tests dentro de describes
    if (test.type === 'describe' && test.tests) {
      test.tests.forEach(t => {
        const normalized = t.name.toLowerCase().replace(/\s+/g, ' ').trim();
        
        if (seen.has(normalized)) {
          duplicates.push({
            name: t.name,
            firstOccurrence: seen.get(normalized),
            duplicate: t
          });
        } else {
          seen.set(normalized, t);
        }
      });
    }
  });
  
  return duplicates;
}