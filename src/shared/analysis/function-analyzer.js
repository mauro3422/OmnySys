/**
 * function-analyzer.js
 * Opción C: Análisis granular por función
 * 
 * En lugar de analizar un archivo completo, analiza función por función.
 * Cada función ve solo su contexto relevante:
 *   - Imports que usa específicamente
 *   - Variables globales que toca
 *   - Eventos que emite/escucha
 *   - Funciones que llama
 * 
 * FUTURO: Esta es la evolución natural del sistema cuando madure.
 */

// NOTA: No importamos parseFile directamente porque function-analyzer.js
// trabaja con el análisis YA EXISTENTE de capa A (fileAnalysis), no parsea de nuevo.
// Esto evita doble procesamiento y mantiene consistencia.

/**
 * Analiza un archivo a nivel de funciones individuales
 * @param {string} filePath - Ruta del archivo
 * @param {string} code - Código fuente
 * @param {object} fileAnalysis - Análisis del archivo completo (de capa A)
 * @returns {Array} - Array de análisis por función
 */
export function analyzeFunctions(filePath, code, fileAnalysis) {
  const functions = [];
  
  // Extraer definiciones de funciones del análisis existente
  const functionDefs = fileAnalysis.definitions?.filter(d => d.type === 'function') || [];
  
  for (const funcDef of functionDefs) {
    // Extraer el código de esta función específica
    const functionCode = extractFunctionCode(code, funcDef);
    
    // Detectar qué usa esta función específicamente
    const functionContext = {
      name: funcDef.name,
      params: funcDef.params,
      line: funcDef.line,
      endLine: funcDef.endLine,
      isExported: funcDef.isExported,
      
      // Solo los imports que esta función usa
      usedImports: detectUsedImports(functionCode, fileAnalysis.imports),
      
      // Variables globales que toca
      globalAccess: detectGlobalAccess(functionCode),
      
      // localStorage keys
      localStorageOps: detectLocalStorageOps(functionCode),
      
      // Eventos
      eventOps: detectEventOps(functionCode),
      
      // Funciones que llama
      calls: detectCalls(functionCode),
      
      // Async/await
      isAsync: functionCode.includes('async ') || functionCode.includes('await '),
      
      // JSDoc de esta función
      jsdoc: extractJSDocForFunction(code, funcDef)
    };
    
    functions.push(functionContext);
  }
  
  return functions;
}

import { extractFunctionCode, extractJSDocComment } from '../utils/ast-utils.js';

/**
 * Detecta qué imports usa esta función
 */
function detectUsedImports(functionCode, imports) {
  const used = [];
  
  for (const imp of imports || []) {
    const specifiers = imp.specifiers || [];
    for (const spec of specifiers) {
      // Si la función usa este import
      const regex = new RegExp(`\\b${spec.imported || spec.local}\\b`, 'g');
      if (regex.test(functionCode)) {
        used.push({
          source: imp.source,
          name: spec.imported || spec.local,
          alias: spec.local !== spec.imported ? spec.local : null
        });
      }
    }
  }
  
  return used;
}

/**
 * Detecta acceso a variables globales
 */
function detectGlobalAccess(code) {
  const globals = [];
  const patterns = [
    /window\.(\w+)/g,
    /global\.(\w+)/g,
    /globalThis\.(\w+)/g
  ];
  
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(code)) !== null) {
      globals.push({
        object: match[0].split('.')[0], // window, global, globalThis
        property: match[1],
        isRead: !isWriteOperation(code, match.index),
        isWrite: isWriteOperation(code, match.index)
      });
    }
  }
  
  return [...new Map(globals.map(g => [`${g.object}.${g.property}`, g])).values()];
}

/**
 * Detecta operaciones de localStorage
 */
function detectLocalStorageOps(code) {
  const ops = [];
  const patterns = [
    { regex: /localStorage\.getItem\(['"`]([^'"`]+)['"`]\)/g, type: 'read' },
    { regex: /localStorage\.setItem\(['"`]([^'"`]+)['"`]/g, type: 'write' },
    { regex: /localStorage\.removeItem\(['"`]([^'"`]+)['"`]\)/g, type: 'delete' }
  ];
  
  for (const { regex, type } of patterns) {
    let match;
    while ((match = regex.exec(code)) !== null) {
      ops.push({ key: match[1], type });
    }
  }
  
  return ops;
}

/**
 * Detecta operaciones de eventos
 */
function detectEventOps(code) {
  const ops = [];
  const patterns = [
    { regex: /addEventListener\(['"`]([^'"`]+)['"`]/g, type: 'listen' },
    { regex: /removeEventListener\(['"`]([^'"`]+)['"`]/g, type: 'unlisten' },
    { regex: /dispatchEvent\(['"`]?(?:new\s+)?\w*Event\(['"`]([^'"`]+)['"`]/g, type: 'emit' },
    { regex: /\.emit\(['"`]([^'"`]+)['"`]/g, type: 'emit' }
  ];
  
  for (const { regex, type } of patterns) {
    let match;
    while ((match = regex.exec(code)) !== null) {
      ops.push({ event: match[1], type });
    }
  }
  
  return ops;
}

/**
 * Detecta llamadas a funciones
 */
function detectCalls(code) {
  const calls = [];
  const callRegex = /(\w+)\s*\(/g;
  let match;
  
  while ((match = callRegex.exec(code)) !== null) {
    const funcName = match[1];
    // Filtrar keywords
    if (!['if', 'for', 'while', 'switch', 'catch', 'return'].includes(funcName)) {
      calls.push(funcName);
    }
  }
  
  return [...new Set(calls)].slice(0, 10); // Limitar a 10 únicas
}

/**
 * Detecta si es una operación de escritura
 */
function isWriteOperation(code, position) {
  const before = code.slice(Math.max(0, position - 20), position);
  return before.includes('=') && !before.includes('==');
}

/**
 * Extrae JSDoc específico de una función
 */
function extractJSDocForFunction(code, funcDef) {
  const jsdocText = extractJSDocComment(code, funcDef);
  
  if (!jsdocText) return null;
  
  // Parsear tags
  const tags = [];
  const tagRegex = /@(\w+)\s*(?:\{([^}]+)\})?\s*(\w+)?\s*-?\s*(.*)?/g;
  let match;
  
  while ((match = tagRegex.exec(jsdocText)) !== null) {
    tags.push({
      tag: match[1],
      type: match[2] || null,
      name: match[3] || null,
      description: match[4] || null
    });
  }
  
  return {
    raw: jsdocText,
    tags,
    params: tags.filter(t => t.tag === 'param'),
    returns: tags.find(t => t.tag === 'returns') || null,
    isAsync: tags.some(t => t.tag === 'async'),
    isDeprecated: tags.some(t => t.tag === 'deprecated')
  };
}

/**
 * Construye contexto para LLM a nivel de función
 * MUCHO más preciso que a nivel de archivo
 */
export function buildFunctionContext(funcAnalysis, allImports, projectContext) {
  const context = {
    function: {
      name: funcAnalysis.name,
      params: funcAnalysis.params,
      isAsync: funcAnalysis.isAsync,
      isExported: funcAnalysis.isExported
    },
    
    // Solo imports que esta función USA (no todos los del archivo)
    imports: funcAnalysis.usedImports.map(imp => ({
      from: imp.source,
      import: imp.name,
      alias: imp.alias
    })),
    
    // Estado compartido que esta función toca
    sharedState: {
      localStorage: funcAnalysis.localStorageOps,
      globals: funcAnalysis.globalAccess
    },
    
    // Eventos
    events: funcAnalysis.eventOps,
    
    // Contratos
    contracts: funcAnalysis.jsdoc ? {
      description: funcAnalysis.jsdoc.tags.find(t => !t.tag)?.description || null,
      params: funcAnalysis.jsdoc.params,
      returns: funcAnalysis.jsdoc.returns,
      deprecated: funcAnalysis.jsdoc.isDeprecated,
      async: funcAnalysis.jsdoc.isAsync
    } : null,
    
    // Llamadas internas (para detectar dependencias internas del archivo)
    calls: funcAnalysis.calls
  };
  
  return context;
}

/**
 * Detecta si una función tiene side effects
 */
export function hasSideEffects(funcAnalysis) {
  return (
    funcAnalysis.localStorageOps.length > 0 ||
    funcAnalysis.globalAccess.some(g => g.isWrite) ||
    funcAnalysis.eventOps.some(e => e.type === 'emit') ||
    funcAnalysis.calls.includes('fetch') ||
    funcAnalysis.calls.includes('setTimeout') ||
    funcAnalysis.calls.includes('setInterval')
  );
}

/**
 * Detecta si una función es pura
 */
export function isPureFunction(funcAnalysis) {
  return !hasSideEffects(funcAnalysis) && 
         funcAnalysis.globalAccess.length === 0 &&
         funcAnalysis.localStorageOps.length === 0;
}
