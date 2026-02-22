/**
 * @fileoverview Content Extractor - Extrae contenido de tests
 */

/**
 * Extrae el contenido de un test
 * @param {string} content - Contenido completo del archivo
 * @param {number} startIndex - Índice de inicio del test
 * @returns {string} - Contenido del test
 */
export function extractTestContent(content, startIndex) {
  let braceCount = 0;
  let inTest = false;
  let endIndex = startIndex;
  
  for (let i = startIndex; i < content.length; i++) {
    if (content[i] === '{') {
      braceCount++;
      inTest = true;
    } else if (content[i] === '}') {
      braceCount--;
      if (inTest && braceCount === 0) {
        endIndex = i + 1;
        break;
      }
    }
  }
  
  return content.substring(startIndex, endIndex);
}
