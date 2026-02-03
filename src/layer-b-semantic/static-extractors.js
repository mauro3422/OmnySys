/**
 * static-extractors.js
 * Extrae conexiones semánticas usando regex/pattern matching (sin LLM)
 * 
 * ESTRATEGIA: Extraer primero con regex, luego el LLM valida/confirma
 * Esto es más confiable que depender 100% del LLM para descubrir
 */

/**
 * Extrae todas las keys de localStorage/sessionStorage usadas en el código
 * @param {string} code - Código fuente
 * @returns {Object} - {reads: [], writes: [], all: []}
 */
export function extractLocalStorageKeys(code) {
  const reads = [];
  const writes = [];
  
  // Patrón para localStorage.setItem('key', value) o localStorage['key'] = value
  const writePatterns = [
    /localStorage\.setItem\s*\(\s*['"]([^'"]+)['"]/g,
    /localStorage\s*\[\s*['"]([^'"]+)['"]\s*\]\s*=/g,
    /sessionStorage\.setItem\s*\(\s*['"]([^'"]+)['"]/g,
    /sessionStorage\s*\[\s*['"]([^'"]+)['"]\s*\]\s*=/g
  ];
  
  // Patrón para localStorage.getItem('key') o localStorage['key']
  const readPatterns = [
    /localStorage\.getItem\s*\(\s*['"]([^'"]+)['"]/g,
    /localStorage\s*\[\s*['"]([^'"]+)['"]\s*\]/g,
    /sessionStorage\.getItem\s*\(\s*['"]([^'"]+)['"]/g,
    /sessionStorage\s*\[\s*['"]([^'"]+)['"]\s*\]/g
  ];
  
  // Extraer writes
  for (const pattern of writePatterns) {
    let match;
    while ((match = pattern.exec(code)) !== null) {
      writes.push({
        key: match[1],
        line: getLineNumber(code, match.index),
        type: 'write'
      });
    }
  }
  
  // Extraer reads
  for (const pattern of readPatterns) {
    let match;
    while ((match = pattern.exec(code)) !== null) {
      reads.push({
        key: match[1],
        line: getLineNumber(code, match.index),
        type: 'read'
      });
    }
  }
  
  return {
    reads,
    writes,
    all: [...reads, ...writes]
  };
}

/**
 * Extrae nombres de eventos del código
 * @param {string} code - Código fuente
 * @returns {Object} - {listeners: [], emitters: [], all: []}
 */
export function extractEventNames(code) {
  const listeners = [];
  const emitters = [];
  
  // Patrones para addEventListener
  const listenerPatterns = [
    /\.addEventListener\s*\(\s*['"]([^'"]+)['"]/g,
    /\.on\s*\(\s*['"]([^'"]+)['"]/g,  // EventEmitter style
    /\.once\s*\(\s*['"]([^'"]+)['"]/g
  ];
  
  // Patrones para emit/dispatchEvent
  const emitterPatterns = [
    /\.dispatchEvent\s*\(/g,  // Detectar dispatch, buscar CustomEvent
    /\.emit\s*\(\s*['"]([^'"]+)['"]/g,  // EventEmitter style
    /new\s+CustomEvent\s*\(\s*['"]([^'"]+)['"]/g,
    /new\s+Event\s*\(\s*['"]([^'"]+)['"]/g
  ];
  
  // Extraer listeners
  for (const pattern of listenerPatterns) {
    let match;
    while ((match = pattern.exec(code)) !== null) {
      listeners.push({
        event: match[1],
        line: getLineNumber(code, match.index),
        type: 'listener'
      });
    }
  }
  
  // Extraer emitters (con lógica especial para dispatchEvent)
  for (const pattern of emitterPatterns) {
    let match;
    while ((match = pattern.exec(code)) !== null) {
      let eventName = match[1];
      
      // Si es dispatchEvent, buscar el tipo de evento en los parámetros
      if (match[0].includes('dispatchEvent')) {
        // Buscar hacia atrás y adelante para encontrar el CustomEvent/Event
        const contextStart = Math.max(0, match.index - 200);
        const contextEnd = Math.min(code.length, match.index + 200);
        const context = code.slice(contextStart, contextEnd);
        
        const customEventMatch = context.match(/new\s+(?:Custom)?Event\s*\(\s*['"]([^'"]+)['"]/);
        if (customEventMatch) {
          eventName = customEventMatch[1];
        } else {
          continue; // No encontramos el tipo de evento
        }
      }
      
      emitters.push({
        event: eventName,
        line: getLineNumber(code, match.index),
        type: 'emitter'
      });
    }
  }
  
  return {
    listeners,
    emitters,
    all: [...listeners, ...emitters]
  };
}

/**
 * Extrae accesos a propiedades globales (window, global, globalThis)
 * @param {string} code - Código fuente
 * @returns {Object} - {reads: [], writes: [], all: []}
 */
export function extractGlobalAccess(code) {
  const reads = [];
  const writes = [];
  
  // Patrones para lectura de globales
  const readPatterns = [
    /window\.([a-zA-Z_$][a-zA-Z0-9_$]*)/g,
    /global\.([a-zA-Z_$][a-zA-Z0-9_$]*)/g,
    /globalThis\.([a-zA-Z_$][a-zA-Z0-9_$]*)/g
  ];
  
  // Patrones para escritura en globales
  const writePatterns = [
    /window\.([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=/g,
    /global\.([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=/g,
    /globalThis\.([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=/g
  ];
  
  for (const pattern of readPatterns) {
    let match;
    while ((match = pattern.exec(code)) !== null) {
      const prop = match[1];
      // Ignorar propiedades nativas del browser
      if (!isNativeWindowProp(prop)) {
        reads.push({
          property: prop,
          line: getLineNumber(code, match.index),
          type: 'read'
        });
      }
    }
  }
  
  for (const pattern of writePatterns) {
    let match;
    while ((match = pattern.exec(code)) !== null) {
      const prop = match[1];
      if (!isNativeWindowProp(prop)) {
        writes.push({
          property: prop,
          line: getLineNumber(code, match.index),
          type: 'write'
        });
      }
    }
  }
  
  return { reads, writes, all: [...reads, ...writes] };
}

/**
 * Detecta conexiones entre archivos basadas en localStorage compartido
 * @param {Object} fileResults - Mapa de filePath -> {localStorage, events, globals}
 * @returns {Array} - Conexiones detectadas
 */
export function detectLocalStorageConnections(fileResults) {
  const connections = [];
  const files = Object.entries(fileResults);
  
  for (let i = 0; i < files.length; i++) {
    const [fileA, resultsA] = files[i];
    const storageA = resultsA.localStorage || { all: [] };
    
    for (let j = i + 1; j < files.length; j++) {
      const [fileB, resultsB] = files[j];
      const storageB = resultsB.localStorage || { all: [] };
      
      // Buscar keys comunes
      const keysA = new Set(storageA.all.map(s => s.key));
      const keysB = storageB.all.map(s => s.key);
      const commonKeys = keysB.filter(k => keysA.has(k));
      
      if (commonKeys.length > 0) {
        // Determinar dirección de la conexión
        const writesA = storageA.writes.map(w => w.key);
        const readsA = storageA.reads.map(r => r.key);
        const writesB = storageB.writes.map(w => w.key);
        const readsB = storageB.reads.map(r => r.key);
        
        for (const key of commonKeys) {
          const direction = [];
          if (writesA.includes(key)) direction.push(`${fileA} → writes`);
          if (readsA.includes(key)) direction.push(`${fileA} → reads`);
          if (writesB.includes(key)) direction.push(`${fileB} → writes`);
          if (readsB.includes(key)) direction.push(`${fileB} → reads`);
          
          connections.push({
            id: `localStorage_${key}_${fileA}_to_${fileB}`,
            sourceFile: fileA,
            targetFile: fileB,
            type: 'localStorage',
            via: 'localStorage',
            key: key,
            direction: direction.join(', '),
            confidence: 1.0, // 100% confiable porque es regex
            detectedBy: 'static-extractor',
            reason: `Both files use localStorage key '${key}'`
          });
        }
      }
    }
  }
  
  return connections;
}

/**
 * Detecta conexiones entre archivos basadas en variables globales compartidas
 * @param {Object} fileResults - Mapa de filePath -> {localStorage, events, globals}
 * @returns {Array} - Conexiones detectadas
 */
export function detectGlobalConnections(fileResults) {
  const connections = [];
  const files = Object.entries(fileResults);
  
  for (let i = 0; i < files.length; i++) {
    const [fileA, resultsA] = files[i];
    const globalsA = resultsA.globals || { all: [] };
    
    for (let j = i + 1; j < files.length; j++) {
      const [fileB, resultsB] = files[j];
      const globalsB = resultsB.globals || { all: [] };
      
      // Buscar propiedades comunes
      const propsA = new Set(globalsA.all.map(g => g.property));
      const propsB = globalsB.all.map(g => g.property);
      const commonProps = propsB.filter(p => propsA.has(p));
      
      if (commonProps.length > 0) {
        // Determinar dirección de la conexión
        const writesA = globalsA.writes.map(w => w.property);
        const readsA = globalsA.reads.map(r => r.property);
        const writesB = globalsB.writes.map(w => w.property);
        const readsB = globalsB.reads.map(r => r.property);
        
        for (const prop of commonProps) {
          const direction = [];
          if (writesA.includes(prop)) direction.push(`${fileA} → writes`);
          if (readsA.includes(prop)) direction.push(`${fileA} → reads`);
          if (writesB.includes(prop)) direction.push(`${fileB} → writes`);
          if (readsB.includes(prop)) direction.push(`${fileB} → reads`);
          
          connections.push({
            id: `global_${prop}_${fileA}_to_${fileB}`,
            sourceFile: fileA,
            targetFile: fileB,
            type: 'globalVariable',
            via: 'global',
            property: prop,
            direction: direction.join(', '),
            confidence: 1.0,
            detectedBy: 'static-extractor',
            reason: `Both files use global variable '${prop}'`
          });
        }
      }
    }
  }
  
  return connections;
}

/**
 * Detecta conexiones entre archivos basadas en eventos compartidos
 * @param {Object} fileResults - Mapa de filePath -> {localStorage, events, globals}
 * @returns {Array} - Conexiones detectadas
 */
export function detectEventConnections(fileResults) {
  const connections = [];
  const files = Object.entries(fileResults);
  
  for (let i = 0; i < files.length; i++) {
    const [fileA, resultsA] = files[i];
    const eventsA = resultsA.events || { all: [] };
    
    for (let j = i + 1; j < files.length; j++) {
      const [fileB, resultsB] = files[j];
      const eventsB = resultsB.events || { all: [] };
      
      // Buscar eventos comunes
      const eventsA_set = new Set(eventsA.all.map(e => e.event));
      const eventsB_list = eventsB.all.map(e => e.event);
      const commonEvents = eventsB_list.filter(e => eventsA_set.has(e));
      
      if (commonEvents.length > 0) {
        for (const eventName of commonEvents) {
          const emitsA = eventsA.emitters.some(e => e.event === eventName);
          const listensA = eventsA.listeners.some(e => e.event === eventName);
          const emitsB = eventsB.emitters.some(e => e.event === eventName);
          const listensB = eventsB.listeners.some(e => e.event === eventName);
          
          // Determinar dirección: emisor -> listener
          let source = fileA;
          let target = fileB;
          
          if (emitsA && listensB) {
            source = fileA;
            target = fileB;
          } else if (emitsB && listensA) {
            source = fileB;
            target = fileA;
          }
          
          connections.push({
            id: `event_${eventName}_${source}_to_${target}`,
            sourceFile: source,
            targetFile: target,
            type: 'eventListener',
            via: 'event',
            event: eventName,
            direction: `${emitsA ? 'emits' : 'listens'} → ${emitsB ? 'emits' : 'listens'}`,
            confidence: 1.0,
            detectedBy: 'static-extractor',
            reason: `Both files use event '${eventName}'`
          });
        }
      }
    }
  }
  
  return connections;
}

/**
 * Analiza un archivo completo y extrae toda la información semántica
 * @param {string} filePath - Ruta del archivo
 * @param {string} code - Código fuente
 * @returns {Object} - Resultados de extracción
 */
export function extractSemanticFromFile(filePath, code) {
  return {
    filePath,
    localStorage: extractLocalStorageKeys(code),
    events: extractEventNames(code),
    globals: extractGlobalAccess(code)
  };
}

/**
 * Detecta todas las conexiones semánticas entre múltiples archivos
 * @param {Object} fileSourceCode - Mapa de filePath -> código fuente
 * @returns {Object} - {localStorageConnections: [], eventConnections: [], globalConnections: [], all: []}
 */
export function detectAllSemanticConnections(fileSourceCode) {
  // Primero, extraer información de cada archivo
  const fileResults = {};
  for (const [filePath, code] of Object.entries(fileSourceCode)) {
    fileResults[filePath] = extractSemanticFromFile(filePath, code);
  }
  
  // Luego, detectar conexiones
  const localStorageConnections = detectLocalStorageConnections(fileResults);
  const eventConnections = detectEventConnections(fileResults);
  const globalConnections = detectGlobalConnections(fileResults);
  
  return {
    localStorageConnections,
    eventConnections,
    globalConnections,
    all: [...localStorageConnections, ...eventConnections, ...globalConnections],
    fileResults
  };
}

// ==================== UTILIDADES ====================

/**
 * Obtiene el número de línea para una posición en el código
 * @param {string} code - Código fuente
 * @param {number} position - Posición en el string
 * @returns {number} - Número de línea (1-based)
 */
function getLineNumber(code, position) {
  const lines = code.substring(0, position).split('\n');
  return lines.length;
}

/**
 * Verifica si una propiedad es nativa de window
 * @param {string} prop - Nombre de la propiedad
 * @returns {boolean}
 */
function isNativeWindowProp(prop) {
  const nativeProps = [
    'document', 'location', 'history', 'navigator', 'screen', 'console',
    'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval',
    'fetch', 'XMLHttpRequest', 'WebSocket', 'localStorage', 'sessionStorage',
    'addEventListener', 'removeEventListener', 'dispatchEvent',
    'innerWidth', 'innerHeight', 'outerWidth', 'outerHeight',
    'scrollX', 'scrollY', 'pageXOffset', 'pageYOffset',
    'alert', 'confirm', 'prompt', 'open', 'close', 'print',
    'requestAnimationFrame', 'cancelAnimationFrame',
    'Promise', 'Array', 'Object', 'String', 'Number', 'Boolean',
    'Date', 'Math', 'JSON', 'RegExp', 'Error', 'Map', 'Set'
  ];
  
  return nativeProps.includes(prop) || 
         prop.startsWith('on') ||  // Event handlers
         /^[A-Z]/.test(prop);      // Constructores (Array, Object, etc)
}
