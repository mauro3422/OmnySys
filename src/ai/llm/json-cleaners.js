/**
 * @fileoverview json-cleaners.js
 * 
 * Utilidades para limpiar y normalizar JSON
 * Extrae funciones especificas de limpieza de response-cleaner.js
 * 
 * @module ai/llm/json-cleaners
 */

/**
 * Elimina bloques de codigo markdown (```json ... ```)
 */
export function removeMarkdownBlocks(text) {
  return text
    .replace(/```json\s*/gi, '')
    .replace(/```\s*$/g, '')
    .replace(/```/g, '');
}

/**
 * Elimina comentarios de una y multiples lineas
 */
export function removeComments(text) {
  return text
    .replace(/\/\/.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '');
}

/**
 * Elimina trailing commas (comas al final de objetos/arrays)
 */
export function removeTrailingCommas(text) {
  return text.replace(/,\s*([}\]])/g, '$1');
}

/**
 * Normaliza comillas: reemplaza comillas simples por dobles
 * Preserva comillas dentro de strings ya existentes
 */
export function normalizeQuotes(text) {
  const stringPattern = /"(?:[^"\\]|\\.)*"/g;
  const strings = [];
  let match;
  
  while ((match = stringPattern.exec(text)) !== null) {
    strings.push({ text: match[0], index: match.index });
  }

  let result = '';
  let lastIndex = 0;
  
  for (const str of strings) {
    const before = text.slice(lastIndex, str.index);
    result += before.replace(/'/g, '"');
    result += str.text;
    lastIndex = str.index + str.text.length;
  }
  
  result += text.slice(lastIndex).replace(/'/g, '"');
  return result;
}

/**
 * Extrae JSON valido del texto
 * Encuentra el primer { o [ y el ultimo } o ] balanceado
 */
export function extractJSON(text) {
  let cleaned = text.trim();
  
  // Encontrar inicio del JSON
  const jsonStart = cleaned.indexOf('{');
  const jsonArrayStart = cleaned.indexOf('[');
  
  if (jsonStart !== -1 || jsonArrayStart !== -1) {
    const startIndex = jsonStart !== -1 && jsonArrayStart !== -1
      ? Math.min(jsonStart, jsonArrayStart)
      : Math.max(jsonStart, jsonArrayStart);
    
    if (startIndex > 0) {
      cleaned = cleaned.substring(startIndex);
    }
  }
  
  // Encontrar fin del JSON balanceado
  let braceCount = 0;
  let bracketCount = 0;
  let inString = false;
  let escapeNext = false;
  let lastValidIndex = -1;
  
  for (let i = 0; i < cleaned.length; i++) {
    const char = cleaned[i];
    
    if (escapeNext) {
      escapeNext = false;
      continue;
    }
    
    if (char === '\\') {
      escapeNext = true;
      continue;
    }
    
    if (char === '"' && !inString) {
      inString = true;
    } else if (char === '"' && inString) {
      inString = false;
    } else if (!inString) {
      if (char === '{') braceCount++;
      else if (char === '}') braceCount--;
      else if (char === '[') bracketCount++;
      else if (char === ']') bracketCount--;
    }
    
    if (!inString && braceCount === 0 && bracketCount === 0 && (char === '}' || char === ']')) {
      lastValidIndex = i;
    }
  }
  
  if (lastValidIndex !== -1 && lastValidIndex < cleaned.length - 1) {
    cleaned = cleaned.substring(0, lastValidIndex + 1);
  }
  
  // Verificar que empieza con { o [
  cleaned = cleaned.trim();
  if (!cleaned.startsWith('{') && !cleaned.startsWith('[')) {
    const firstBrace = cleaned.indexOf('{');
    const firstBracket = cleaned.indexOf('[');
    const firstValid = Math.min(
      firstBrace !== -1 ? firstBrace : Infinity,
      firstBracket !== -1 ? firstBracket : Infinity
    );
    if (firstValid !== Infinity) {
      cleaned = cleaned.substring(firstValid);
    }
  }
  
  return cleaned;
}

/**
 * Trim final de la respuesta
 */
export function trimResponse(text) {
  return text.trim();
}

export default {
  removeMarkdownBlocks,
  removeComments,
  removeTrailingCommas,
  normalizeQuotes,
  extractJSON,
  trimResponse
};
