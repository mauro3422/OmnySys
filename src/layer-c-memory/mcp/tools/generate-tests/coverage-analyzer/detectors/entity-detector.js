/**
 * @fileoverview Entity Detector - Detecta entidades testeadas
 */

/**
 * Detecta qué entidades (funciones/clases) están siendo testeadas
 * @param {string} testContent - Contenido del test
 * @returns {Array} - Array de entidades detectadas
 */
export function detectTestedEntities(testContent) {
  const entities = [];
  
  // Detectar imports de funciones/clases
  const importRegex = /import\s+\{?\s*([^}]+)\}?\s+from\s+['"]([^'"]+)['"];?/g;
  let match;
  while ((match = importRegex.exec(testContent)) !== null) {
    const imports = match[1].split(',').map(s => s.trim());
    const source = match[2];
    
    imports.forEach(imp => {
      // Limpiar alias (as)
      const name = imp.replace(/\s+as\s+.+/, '').trim();
      entities.push({
        name,
        source,
        type: detectEntityType(testContent, name)
      });
    });
  }
  
  return entities;
}

/**
 * Detecta el tipo de entidad basado en el contexto del test
 * @param {string} testContent - Contenido del test
 * @param {string} name - Nombre de la entidad
 * @returns {string} - Tipo de entidad ('class' o 'function')
 */
export function detectEntityType(testContent, name) {
  // Buscar new Name() para detectar clases (sin regex dinámico)
  if (testContent.includes(`new ${name}(`)) {
    return 'class';
  }
  
  // Buscar Name.method() para detectar métodos estáticos (sin regex dinámico)
  if (testContent.includes(`${name}.`)) {
    return 'class';
  }
  
  return 'function';
}