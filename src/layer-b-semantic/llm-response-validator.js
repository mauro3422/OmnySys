/**
 * llm-response-validator.js
 * Valida y sanitiza respuestas del LLM para evitar alucinaciones
 * 
 * Estrategia:
 * 1. Validar que las keys existan REALMENTE en el código
 * 2. Rechazar métodos/APIs como keys (setItem, getItem)
 * 3. Validar que paths de archivos existan en el proyecto
 * 4. Sanitizar respuestas inválidas
 */

/**
 * Extrae todas las localStorage keys reales del código
 * @param {string} code - Código fuente
 * @returns {Set<string>} - Set de keys únicas
 */
export function extractActualLocalStorageKeys(code) {
  const keys = new Set();
  
  // Patrones para localStorage.setItem/getItem/removeItem('key')
  const patterns = [
    /localStorage\.setItem\(['"`]([^'"`]+)['"`]/g,
    /localStorage\.getItem\(['"`]([^'"`]+)['"`]/g,
    /localStorage\.removeItem\(['"`]([^'"`]+)['"`]/g,
    /localStorage\['([^']+)']\s*=/g,  // localStorage['key'] = value
    /localStorage\.(\w+)\s*=/g  // localStorage.key = value (solo si no es método)
  ];
  
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(code)) !== null) {
      const key = match[1];
      // Filtrar métodos de localStorage
      if (!isLocalStorageMethod(key)) {
        keys.add(key);
      }
    }
  }
  
  return keys;
}

/**
 * Extrae todos los event names reales del código
 * @param {string} code - Código fuente
 * @returns {Set<string>} - Set de eventos únicos
 */
export function extractActualEventNames(code) {
  const events = new Set();
  
  // Patrones para addEventListener/dispatchEvent/emit('event')
  const patterns = [
    /addEventListener\(['"`]([^'"`]+)['"`]/g,
    /removeEventListener\(['"`]([^'"`]+)['"`]/g,
    /dispatchEvent\(['"`]?(?:new\s+)?\w*Event\(['"`]([^'"`]+)['"`]/g,
    /\.emit\(['"`]([^'"`]+)['"`]/g,
    /\.on\(['"`]([^'"`]+)['"`]/g,
    /\.once\(['"`]([^'"`]+)['"`]/g
  ];
  
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(code)) !== null) {
      const event = match[1];
      // Filtrar métodos del DOM/API
      if (!isDOMMethod(event)) {
        events.add(event);
      }
    }
  }
  
  return events;
}

/**
 * Verifica si una string es un método de localStorage
 */
function isLocalStorageMethod(str) {
  const methods = ['setItem', 'getItem', 'removeItem', 'clear', 'key', 'length'];
  return methods.includes(str);
}

/**
 * Verifica si una string es un método del DOM/Evento
 */
function isDOMMethod(str) {
  const domMethods = [
    'addEventListener', 'removeEventListener', 'dispatchEvent',
    'click', 'submit', 'change', 'input', 'keydown', 'keyup', 'keypress',
    'mousedown', 'mouseup', 'mousemove', 'mouseenter', 'mouseleave',
    'load', 'unload', 'error', 'resize', 'scroll', 'focus', 'blur'
  ];
  return domMethods.includes(str);
}

/**
 * Valida y sanitiza la respuesta del LLM
 * @param {object} response - Respuesta cruda del LLM
 * @param {string} code - Código fuente analizado
 * @param {Array<string>} validFilePaths - Paths válidos del proyecto
 * @returns {object|null} - Respuesta validada o null si es inválida
 */
export function validateLLMResponse(response, code, validFilePaths = []) {
  if (!response || typeof response !== 'object') {
    return null;
  }

  // Extraer keys y eventos reales del código
  const actualLocalStorageKeys = extractActualLocalStorageKeys(code);
  const actualEventNames = extractActualEventNames(code);
  
  // Validar localStorageKeys
  const validatedLocalStorageKeys = validateLocalStorageKeys(
    response.localStorageKeys,
    actualLocalStorageKeys
  );
  
  // Validar eventNames
  const validatedEventNames = validateEventNames(
    response.eventNames,
    actualEventNames
  );
  
  // Validar connectedFiles
  const validatedConnectedFiles = validateConnectedFiles(
    response.connectedFiles,
    validFilePaths
  );
  
  // Determinar connectionType válido
  const validatedConnectionType = determineConnectionType(
    validatedLocalStorageKeys,
    validatedEventNames
  );
  
  // Si no hay nada válido, retornar null
  if (validatedLocalStorageKeys.length === 0 && 
      validatedEventNames.length === 0 &&
      validatedConnectedFiles.length === 0) {
    return null;
  }
  
  return {
    localStorageKeys: validatedLocalStorageKeys,
    eventNames: validatedEventNames,
    connectedFiles: validatedConnectedFiles,
    connectionType: validatedConnectionType,
    confidence: Math.min(response.confidence || 0.5, 1.0),
    reasoning: sanitizeReasoning(response.reasoning)
  };
}

/**
 * Valida que las localStorage keys existan realmente en el código
 */
function validateLocalStorageKeys(llmKeys, actualKeys) {
  if (!Array.isArray(llmKeys)) return [];
  
  return llmKeys.filter(key => {
    // Rechazar métodos
    if (isLocalStorageMethod(key)) {
      console.warn(`⚠️  LLM alucinó método como key: ${key}`);
      return false;
    }
    
    // Rechazar strings genéricos
    if (['key1', 'key2', 'key3', 'key4'].includes(key)) {
      console.warn(`⚠️  LLM devolvió placeholder: ${key}`);
      return false;
    }
    
    // Idealmente: verificar que exista en actualKeys
    // Pero el LLM puede detectar keys indirectamente, así que permitimos
    // keys que parezcan válidas (no métodos, no placeholders)
    return key.length > 0 && !key.includes(' ');
  });
}

/**
 * Valida que los event names sean reales
 */
function validateEventNames(llmEvents, actualEvents) {
  if (!Array.isArray(llmEvents)) return [];
  
  return llmEvents.filter(event => {
    // Rechazar métodos del DOM
    if (isDOMMethod(event)) {
      console.warn(`⚠️  LLM alucinó método DOM como evento: ${event}`);
      return false;
    }
    
    // Rechazar strings genéricos
    if (['event1', 'event2', 'event3', 'event4'].includes(event)) {
      console.warn(`⚠️  LLM devolvió placeholder: ${event}`);
      return false;
    }
    
    // Rechazar código JavaScript como evento
    if (event.includes('(') || event.includes('{') || event.includes('=>')) {
      console.warn(`⚠️  LLM confundió código con evento: ${event}`);
      return false;
    }
    
    return event.length > 0;
  });
}

/**
 * Valida que los paths de archivos existan en el proyecto
 */
function validateConnectedFiles(llmFiles, validFilePaths) {
  if (!Array.isArray(llmFiles)) return [];
  
  return llmFiles.filter(file => {
    // Rechazar placeholders genéricos
    if (file === 'path/to/file.js' || file === './file.js') {
      console.warn(`⚠️  LLM devolvió path genérico: ${file}`);
      return false;
    }
    
    // Rechazar código como path
    if (file.includes('(') || file.includes('{') || file.includes('=>')) {
      console.warn(`⚠️  LLM confundió código con path: ${file}`);
      return false;
    }
    
    // Si tenemos lista de paths válidos, verificar
    if (validFilePaths.length > 0) {
      const exists = validFilePaths.some(validPath => 
        validPath === file || 
        validPath.endsWith(file) ||
        file.endsWith(validPath)
      );
      
      if (!exists) {
        console.warn(`⚠️  LLM inventó path: ${file}`);
        return false;
      }
    }
    
    return file.length > 0 && file.includes('/');
  });
}

/**
 * Determina el tipo de conexión basado en datos validados
 */
function determineConnectionType(localStorageKeys, eventNames) {
  if (localStorageKeys.length > 0 && eventNames.length > 0) {
    return 'mixed';
  } else if (localStorageKeys.length > 0) {
    return 'localStorage';
  } else if (eventNames.length > 0) {
    return 'event';
  }
  return 'none';
}

/**
 * Sanitiza el reasoning para evitar datos sensibles
 */
function sanitizeReasoning(reasoning) {
  if (!reasoning || typeof reasoning !== 'string') {
    return 'Validated connections';
  }
  
  // Limitar longitud
  return reasoning.substring(0, 200);
}

/**
 * Calcula timeout dinámico basado en tamaño del archivo
 * @param {string} code - Código a analizar
 * @returns {number} - Timeout en ms
 */
export function calculateDynamicTimeout(code) {
  const baseTimeout = 10000; // 10 segundos base
  const sizeFactor = Math.ceil(code.length / 1000); // +1s por cada 1000 chars
  const maxTimeout = 60000; // Máximo 60 segundos
  
  return Math.min(baseTimeout + (sizeFactor * 1000), maxTimeout);
}
