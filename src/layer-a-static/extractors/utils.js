/**
 * @fileoverview utils.js
 * Utilidades compartidas para extractors
 * 
 * @module extractors/utils
 */

/**
 * Obtiene el número de línea para una posición en el código
 * @param {string} code - Código fuente
 * @param {number} position - Posición en el string
 * @returns {number} - Número de línea (1-based)
 */
export function getLineNumber(code, position) {
  const lines = code.substring(0, position).split('\n');
  return lines.length;
}

/**
 * Obtiene la siguiente línea de código después de una posición
 * @param {string} code - Código fuente  
 * @param {number} position - Posición en el string
 * @returns {string} - Primera línea no vacía después de position
 */
export function getNextLine(code, position) {
  const lines = code.substring(position).split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed) return trimmed;
  }
  return '';
}

/**
 * Busca todas las coincidencias de un patrón regex
 * @param {string} code - Código fuente
 * @param {RegExp} pattern - Patrón regex (debe tener flag 'g')
 * @returns {Array<{text: string, groups: string[], index: number, line: number}>}
 */
export function findAllMatches(code, pattern) {
  const matches = [];
  let match;
  while ((match = pattern.exec(code)) !== null) {
    matches.push({
      text: match[0],
      groups: match.slice(1),
      index: match.index,
      line: getLineNumber(code, match.index)
    });
  }
  return matches;
}

/**
 * Extrae el contenido de una función dada su posición
 * @param {string} code - Código fuente
 * @param {number} startIndex - Índice de inicio
 * @returns {string|null} - Contenido de la función o null
 */
export function extractFunctionBody(code, startIndex) {
  // Buscar el inicio del cuerpo {
  let braceStart = code.indexOf('{', startIndex);
  if (braceStart === -1) return null;
  
  let braceCount = 0;
  let inString = false;
  let stringChar = '';
  let i = braceStart;
  
  while (i < code.length) {
    const char = code[i];
    const prevChar = code[i - 1];
    
    // Manejar strings
    if (!inString && (char === '"' || char === "'" || char === '`')) {
      inString = true;
      stringChar = char;
    } else if (inString && char === stringChar && prevChar !== '\\') {
      inString = false;
    }
    
    // Contar braces solo fuera de strings
    if (!inString) {
      if (char === '{') braceCount++;
      else if (char === '}') {
        braceCount--;
        if (braceCount === 0) {
          return code.substring(braceStart, i + 1);
        }
      }
    }
    
    i++;
  }
  
  return null;
}
