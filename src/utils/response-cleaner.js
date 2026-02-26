import { createLogger } from './logger.js';

const logger = createLogger('OmnySys:response:cleaner');


/**
 * Utilidad para limpiar respuestas del LLM
 * Elimina markdown, comentarios y otros artefactos
 */

/**
 * Limpia una respuesta de LLM para extraer JSON válido
 * @param {string} response - Respuesta cruda del LLM
 * @returns {string} - JSON limpio
 */
/**
 * Elimina bloques de código markdown (```json ... ```)
 * @param {string} text 
 * @returns {string}
 */
function stripMarkdown(text) {
  let cleaned = text;
  cleaned = cleaned.replace(/```json\s*/g, '');
  cleaned = cleaned.replace(/```\s*$/g, '');
  cleaned = cleaned.replace(/```/g, '');
  return cleaned;
}

/**
 * Elimina comentarios de una línea y multilínea
 * @param {string} text 
 * @returns {string}
 */
function stripComments(text) {
  let cleaned = text;
  // Eliminar comentarios de una línea
  cleaned = cleaned.replace(/\/\/.*$/gm, '');
  // Eliminar comentarios multilínea
  cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, '');
  return cleaned;
}

/**
 * Elimina trailing commas (comas al final de objetos/arrays)
 * @param {string} text 
 * @returns {string}
 */
function fixTrailingCommas(text) {
  return text.replace(/,\s*([}\]])/g, '$1');
}

/**
 * Encuentra y extrae la parte balanceada que parece ser JSON ({...} o [...])
 * @param {string} text 
 * @returns {string}
 */
function findJsonBoundaries(text) {
  let cleaned = text.trim();
  
  // Encontrar el primer posible inicio
  const jsonStart = cleaned.indexOf('{');
  const jsonArrayStart = cleaned.indexOf('[');
  
  if (jsonStart === -1 && jsonArrayStart === -1) return cleaned;

  const startIndex = jsonStart !== -1 && jsonArrayStart !== -1 
    ? Math.min(jsonStart, jsonArrayStart)
    : Math.max(jsonStart, jsonArrayStart);
  
  if (startIndex > 0) {
    cleaned = cleaned.substring(startIndex);
  }

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

  return cleaned;
}

/**
 * Limpia una respuesta de LLM para extraer JSON válido
 * @param {string} response - Respuesta cruda del LLM
 * @returns {string} - JSON limpio
 */
export function cleanLLMResponse(response, maxLength = 10000) {
  if (!response || typeof response !== 'string') {
    return response;
  }

  let cleaned = response;

  cleaned = stripMarkdown(cleaned);
  cleaned = stripComments(cleaned);
  cleaned = fixTrailingCommas(cleaned);
  cleaned = findJsonBoundaries(cleaned);

  return cleaned.trim();
}

/**
 * Intenta parsear JSON de una respuesta de LLM
 * @param {string} response - Respuesta cruda del LLM
 * @returns {object} - Objeto parseado o null si falla
 */
export function parseLLMJSON(response) {
  try {
    const cleaned = cleanLLMResponse(response);
    return JSON.parse(cleaned);
  } catch (error) {
    logger.error('Failed to parse LLM response as JSON:', error.message);
    logger.error('Cleaned response preview:', cleanLLMResponse(response).substring(0, 200));
    return null;
  }
}

// Tests
if (import.meta.url === `file://${process.argv[1]}`) {
  logger.info('🧪 Testing response cleaner\n');

  const testCases = [
    {
      name: 'Markdown wrapped JSON',
      input: '```json\n{"key": "value"}\n```',
      expected: '{"key": "value"}'
    },
    {
      name: 'JSON with comments',
      input: '{\n  // This is a comment\n  "key": "value"\n}',
      expected: '{\n  \n  "key": "value"\n}'
    },
    {
      name: 'Text before JSON',
      input: 'Here is the result:\n{"key": "value"}',
      expected: '{"key": "value"}'
    },
    {
      name: 'Text after JSON',
      input: '{"key": "value"}\nHope this helps!',
      expected: '{"key": "value"}'
    },
    {
      name: 'Trailing comma',
      input: '{"key": "value",}',
      expected: '{"key": "value"}'
    }
  ];

  let passed = 0;
  let failed = 0;

  for (const test of testCases) {
    const result = cleanLLMResponse(test.input);
    const success = result === test.expected;
    
    logger.info(`${success ? '✅' : '❌'} ${test.name}`);
    if (!success) {
      logger.info(`   Expected: ${test.expected}`);
      logger.info(`   Got: ${result}`);
      failed++;
    } else {
      passed++;
    }
  }

  logger.info(`\n📊 Results: ${passed} passed, ${failed} failed`);
}
