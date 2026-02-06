/**
 * Limpia una respuesta de LLM para extraer JSON válido
 * Elimina markdown, comentarios y otros artefactos
 * Maneja casos edge: comillas simples, comillas escapadas, JSON incompleto
 * @param {string} response - Respuesta cruda del LLM
 * @returns {string} - JSON limpio
 */
export function cleanLLMResponse(response) {
  if (!response || typeof response !== 'string') {
    return response;
  }

  let cleaned = response;

  // 1. Eliminar bloques de código markdown (```json ... ```)
  cleaned = cleaned.replace(/```json\s*/gi, '');
  cleaned = cleaned.replace(/```\s*$/g, '');
  cleaned = cleaned.replace(/```/g, '');

  // 2. Eliminar comentarios de una línea
  cleaned = cleaned.replace(/\/\/.*$/gm, '');

  // 3. Eliminar comentarios multilínea
  cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, '');

  // 4. Eliminar trailing commas (comas al final de objetos/arrays)
  cleaned = cleaned.replace(/,\s*([}\]])/g, '$1');

  // 5. Normalizar comillas: reemplazar comillas simples por dobles
  // PERO preservar comillas dentro de strings ya existentes
  // Estrategia: primero encontrar todos los strings con comillas dobles
  const stringPattern = /"(?:[^"\\]|\\.)*"/g;
  const strings = [];
  let match;
  while ((match = stringPattern.exec(cleaned)) !== null) {
    strings.push({ text: match[0], index: match.index });
  }

  // Reemplazar comillas simples por dobles, excepto dentro de strings ya protegidos
  let result = '';
  let lastIndex = 0;
  for (const str of strings) {
    // Procesar texto antes del string
    const before = cleaned.slice(lastIndex, str.index);
    result += before.replace(/'/g, '"');
    // Agregar el string original sin cambios
    result += str.text;
    lastIndex = str.index + str.text.length;
  }
  // Procesar resto del texto
  result += cleaned.slice(lastIndex).replace(/'/g, '"');
  cleaned = result;

  // 6. Eliminar espacios en blanco al inicio y final
  cleaned = cleaned.trim();

  // 7. Si la respuesta empieza con texto antes del JSON, intentar encontrar el inicio del JSON
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

  // 8. Si hay texto después del JSON válido, eliminarlo
  // Encontrar el último } o ] balanceado
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

    // Si estamos balanceados, marcar esta posición como válida
    if (!inString && braceCount === 0 && bracketCount === 0 && (char === '}' || char === ']')) {
      lastValidIndex = i;
    }
  }

  if (lastValidIndex !== -1 && lastValidIndex < cleaned.length - 1) {
    cleaned = cleaned.substring(0, lastValidIndex + 1);
  }

  // 9. Última limpieza: eliminar caracteres no válidos al inicio/final
  cleaned = cleaned.trim();

  // 10. Verificar que empieza con { o [
  if (!cleaned.startsWith('{') && !cleaned.startsWith('[')) {
    // Intentar encontrar el primer { o [
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

  return cleaned.trim();
}

/**
 * Normaliza la respuesta del análisis para manejar diferentes estructuras
 * El LLM a veces devuelve orphan como boolean directo o como objeto anidado
 * @param {object} parsed - Respuesta parseada del LLM
 * @returns {object} - Respuesta normalizada con estructura consistente
 */
export function normalizeAnalysisResponse(parsed) {
  if (!parsed || typeof parsed !== 'object') {
    return parsed;
  }

  const normalized = { ...parsed };

  // Normalizar estructura de orphan
  // Caso 1: parsed.orphan es boolean directo (incorrecto)
  // Caso 2: parsed.analysis.orphan.isOrphan es boolean (correcto)
  if (typeof parsed.orphan === 'boolean') {
    // El LLM puso orphan: false/true directamente, mover a estructura anidada
    normalized.analysis = normalized.analysis || {};
    normalized.analysis.orphan = {
      isOrphan: parsed.orphan,
      dependentCount: parsed.analysis?.orphan?.dependentCount || 0,
      suggestions: parsed.analysis?.orphan?.suggestions || []
    };
    delete normalized.orphan; // Eliminar el campo plano
  }

  // Asegurar que analysis.orphan existe
  if (!normalized.analysis) {
    normalized.analysis = {};
  }
  if (!normalized.analysis.orphan) {
    normalized.analysis.orphan = {
      isOrphan: false,
      dependentCount: 0,
      suggestions: []
    };
  }

  // Normalizar estructura de semantic
  if (!normalized.analysis.semantic) {
    normalized.analysis.semantic = {
      sharedState: [],
      events: { emits: [], listens: [] },
      connections: []
    };
  }

  // Asegurar que semantic.sharedState es array
  if (!Array.isArray(normalized.analysis.semantic.sharedState)) {
    normalized.analysis.semantic.sharedState = [];
  }

  // Asegurar que semantic.events existe
  if (!normalized.analysis.semantic.events) {
    normalized.analysis.semantic.events = { emits: [], listens: [] };
  }

  // Normalizar estructura de patterns
  if (!normalized.analysis.patterns) {
    normalized.analysis.patterns = {
      isStateManager: false,
      isSingleton: false,
      isGodObject: false,
      hasSideEffects: false
    };
  }

  return normalized;
}
