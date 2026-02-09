/**
 * @fileoverview ast-utils.js
 *
 * Utilidades para manipulación de AST y código fuente
 * Funciones helper usadas por extractors y analyzers
 *
 * @module shared/utils/ast-utils
 */

/**
 * Extrae el código de una función específica desde el código completo del archivo
 *
 * @param {string} fullCode - Código completo del archivo
 * @param {Object} functionInfo - Información de la función (debe tener line y endLine)
 * @param {number} functionInfo.line - Línea inicial (1-indexed)
 * @param {number} functionInfo.endLine - Línea final (1-indexed)
 * @returns {string} - Código de la función
 * 
 * @example
 * const functionCode = extractFunctionCode(sourceCode, {
 *   line: 10,
 *   endLine: 25
 * });
 */
export function extractFunctionCode(fullCode, functionInfo) {
  if (!functionInfo || !functionInfo.line || !functionInfo.endLine) {
    return '';
  }

  const lines = fullCode.split('\n');
  const startLine = Math.max(0, functionInfo.line - 1);
  const endLine = Math.min(lines.length, functionInfo.endLine);
  
  return lines.slice(startLine, endLine).join('\n');
}

/**
 * Obtiene el número de línea para una posición en el código
 *
 * @param {string} code - Código fuente
 * @param {number} index - Índice de carácter
 * @returns {number} - Número de línea (1-indexed)
 */
export function getLineNumber(code, index) {
  if (index < 0 || index > code.length) {
    return 1;
  }
  
  const lines = code.substring(0, index).split('\n');
  return lines.length;
}

/**
 * Encuentra la posición de inicio de una línea específica
 *
 * @param {string} code - Código fuente
 * @param {number} lineNumber - Número de línea (1-indexed)
 * @returns {number} - Índice de inicio de la línea
 */
export function getLineStart(code, lineNumber) {
  const lines = code.split('\n');
  let index = 0;
  
  for (let i = 0; i < lineNumber - 1 && i < lines.length; i++) {
    index += lines[i].length + 1; // +1 for newline
  }
  
  return index;
}

/**
 * Extrae comentarios JSDoc de una función
 *
 * @param {string} code - Código fuente completo
 * @param {Object} functionInfo - Información de la función
 * @returns {string|null} - Texto del comentario JSDoc o null
 */
export function extractJSDocComment(code, functionInfo) {
  const lines = code.split('\n');
  const funcLineIndex = Math.max(0, (functionInfo.line || 1) - 1);
  
  const jsdocLines = [];
  
  // Buscar hacia atrás desde la función
  for (let i = funcLineIndex - 1; i >= Math.max(0, funcLineIndex - 20); i--) {
    const line = lines[i]?.trim() || '';
    
    if (line.startsWith('/**')) {
      jsdocLines.unshift(line);
      break;
    } else if (line.startsWith('*') || line.startsWith('*/')) {
      jsdocLines.unshift(line);
    } else if (line === '') {
      continue;
    } else {
      break; // Llegamos a código, no hay JSDoc
    }
  }
  
  if (jsdocLines.length === 0) {
    return null;
  }
  
  return jsdocLines.join('\n');
}

/**
 * Verifica si un string parece ser código JavaScript/TypeScript válido
 *
 * @param {string} code - Código a verificar
 * @returns {boolean} - true si parece válido
 */
export function isValidCode(code) {
  if (!code || typeof code !== 'string') {
    return false;
  }
  
  // Heurísticas básicas
  const hasInvalidPatterns = [
    /\{[^}]*$/,           // Llave abierta sin cerrar
    /\([^)]*$/,           // Paréntesis abierto sin cerrar
    /\[[^\]]*$/,          // Bracket abierto sin cerrar
  ].some(pattern => pattern.test(code));
  
  return !hasInvalidPatterns && code.length > 0;
}

/**
 * Normaliza espacios en blanco en código
 *
 * @param {string} code - Código fuente
 * @returns {string} - Código con indentación normalizada
 */
export function normalizeIndentation(code) {
  const lines = code.split('\n');
  
  // Encontrar la indentación mínima (excluyendo líneas vacías)
  const nonEmptyLines = lines.filter(line => line.trim().length > 0);
  if (nonEmptyLines.length === 0) return code;
  
  const minIndent = Math.min(
    ...nonEmptyLines.map(line => {
      const match = line.match(/^(\s*)/);
      return match ? match[1].length : 0;
    })
  );
  
  // Remover indentación común
  return lines
    .map(line => line.slice(minIndent))
    .join('\n');
}

/**
 * Encuentra todas las funciones declaradas en el código
 * Versión simple basada en regex (no requiere parser completo)
 *
 * @param {string} code - Código fuente
 * @returns {Array<Object>} - Array de funciones encontradas
 */
export function findFunctionDeclarations(code) {
  const functions = [];
  
  // Patrones para diferentes tipos de funciones
  const patterns = [
    // function name() {}
    { regex: /function\s+(\w+)\s*\(/g, type: 'function' },
    // const name = () => {}
    { regex: /(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>/g, type: 'arrow' },
    // const name = function() {}
    { regex: /(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?function\s*\(/g, type: 'function-expression' },
    // method() {}
    { regex: /^(\w+)\s*\([^)]*\)\s*\{/gm, type: 'method' }
  ];
  
  for (const { regex, type } of patterns) {
    let match;
    while ((match = regex.exec(code)) !== null) {
      const line = getLineNumber(code, match.index);
      functions.push({
        name: match[1],
        type,
        line,
        index: match.index
      });
    }
  }
  
  return functions;
}

export default {
  extractFunctionCode,
  getLineNumber,
  getLineStart,
  extractJSDocComment,
  isValidCode,
  normalizeIndentation,
  findFunctionDeclarations
};
