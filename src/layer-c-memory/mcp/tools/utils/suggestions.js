/**
 * @fileoverview suggestions.js
 * Genera sugerencias para imports que no existen
 */

/**
 * Sugiere alternativas para un import que no existe
 * @param {string} importSource - Path del import
 * @param {Array} attemptedPaths - Paths intentados
 * @returns {string} Sugerencia
 */
export function getImportSuggestion(importSource, attemptedPaths) {
  // Sugerencias comunes basadas en patrones
  
  // Si es un import de #utils, sugerir alternativas comunes
  if (importSource.startsWith('#utils/')) {
    return 'Use "fs/promises" para operaciones de archivo nativas de Node.js';
  }
  
  // Si termina en .js, sugerir probar sin extensión o con /index.js
  if (importSource.endsWith('.js')) {
    const withoutExt = importSource.slice(0, -3);
    return `Try "${withoutExt}" or "${withoutExt}/index.js"`;
  }
  
  // Si es un módulo interno, verificar typos
  const parts = importSource.split('/');
  if (parts.length > 1) {
    return `Verificar que "${parts[parts.length - 1]}" exista en ${parts.slice(0, -1).join('/')}`;
  }
  
  return 'Verificar el path del import';
}
