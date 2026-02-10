/**
 * @fileoverview Error Flow Extractor
 * 
 * Mapea el flujo de errores: quién lanza qué, quién lo maneja.
 * Detecta "cables de error" entre funciones.
 * 
 * @module layer-a-static/extractors/metadata/error-flow
 */

import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('OmnySys:extractors:error-flow');

/**
 * Extrae flujo de errores de una función
 * 
 * @param {string} code - Código fuente
 * @param {Object} typeContracts - Contratos de tipo (throws)
 * @returns {Object} Flujo de errores
 */
export function extractErrorFlow(code, typeContracts = {}) {
  const errorFlow = {
    // Errores que esta función puede lanzar
    throws: [],
    
    // Errores que esta función maneja (catch)
    catches: [],
    
    // Try-catch blocks
    tryBlocks: [],
    
    // Llamadas que pueden lanzar (y no se manejan aquí)
    unhandledCalls: [],
    
    // Patrón de propagación
    propagation: 'none' // 'none', 'partial', 'full'
  };
  
  try {
    // Extraer throws explícitos
    errorFlow.throws = extractThrows(code, typeContracts);
    
    // Extraer catches
    errorFlow.catches = extractCatches(code);
    
    // Extraer try-catch blocks
    errorFlow.tryBlocks = extractTryBlocks(code);
    
    // Detectar propagación
    errorFlow.propagation = detectPropagationPattern(code);
    
    // Detectar unhandled calls
    errorFlow.unhandledCalls = detectUnhandledCalls(code);
    
  } catch (error) {
    logger.warn('Failed to extract error flow:', error.message);
  }
  
  return errorFlow;
}

/**
 * Extrae throws de una función
 */
function extractThrows(code, typeContracts) {
  const throws = [];
  
  // Desde typeContracts (JSDoc)
  if (typeContracts.throws) {
    for (const t of typeContracts.throws) {
      throws.push({
        type: t.type,
        condition: t.condition,
        source: 'jsdoc',
        confidence: 0.9
      });
    }
  }
  
  // Throws explícitos en código
  const throwPattern = /throw\s+(?:new\s+)?(\w+)(?:\s*\()?/g;
  let match;
  
  while ((match = throwPattern.exec(code)) !== null) {
    const errorType = match[1];
    
    // Evitar duplicados con JSDoc
    if (!throws.some(t => t.type === errorType)) {
      // Buscar contexto
      const contextStart = Math.max(0, match.index - 200);
      const context = code.slice(contextStart, match.index);
      
      // Detectar condición
      const condition = detectThrowCondition(context);
      
      throws.push({
        type: errorType,
        condition,
        source: 'explicit',
        confidence: 1.0,
        line: code.slice(0, match.index).split('\n').length
      });
    }
  }
  
  // Detectar throws implícitos (ej: JSON.parse sin try)
  const implicitPatterns = [
    { pattern: /JSON\.parse\s*\(/, type: 'SyntaxError', confidence: 0.7 },
    { pattern: /JSON\.stringify\s*\(/, type: 'TypeError', confidence: 0.6 },
    { pattern: /localStorage\.getItem\s*\(/, type: 'Error', confidence: 0.5 },
    { pattern: /fetch\s*\(/, type: 'NetworkError', confidence: 0.6 }
  ];
  
  for (const { pattern, type, confidence } of implicitPatterns) {
    if (pattern.test(code)) {
      // Verificar si está en try-catch
      const isProtected = isInsideTryBlock(code, code.search(pattern));
      
      if (!isProtected) {
        throws.push({
          type,
          condition: `unprotected ${type.toLowerCase()} call`,
          source: 'implicit',
          confidence,
          implicit: true
        });
      }
    }
  }
  
  return throws;
}

/**
 * Detecta condición de throw desde contexto
 */
function detectThrowCondition(context) {
  const lines = context.split('\n');
  const lastLines = lines.slice(-5);
  
  // Buscar if/else/when
  for (const line of lastLines.reverse()) {
    const ifMatch = line.match(/if\s*\(([^)]+)\)/);
    if (ifMatch) return ifMatch[1].trim();
    
    const whenMatch = line.match(/(?:when|unless)\s+(.*)/i);
    if (whenMatch) return whenMatch[1].trim();
  }
  
  return 'unknown';
}

/**
 * Extrae catches de una función
 */
function extractCatches(code) {
  const catches = [];
  
  const catchPattern = /catch\s*\(\s*(?:\w+\s+)?(\w+)?\s*\)/g;
  let match;
  
  while ((match = catchPattern.exec(code)) !== null) {
    const errorVar = match[1] || 'error';
    
    // Buscar qué se hace con el error
    const afterCatch = code.slice(match.index, match.index + 500);
    
    const handling = {
      type: 'generic',
      variable: errorVar,
      rethrows: /throw\s+\w+/.test(afterCatch),
      logs: /console\.(log|error|warn)/.test(afterCatch),
      returns: /return\s+/.test(afterCatch),
      transforms: /new\s+\w+Error/.test(afterCatch)
    };
    
    // Detectar tipo específico
    const typePattern = /instanceof\s+(\w+)/;
    const typeMatch = afterCatch.match(typePattern);
    if (typeMatch) {
      handling.type = typeMatch[1];
    }
    
    catches.push(handling);
  }
  
  return catches;
}

/**
 * Extrae try-catch blocks
 */
function extractTryBlocks(code) {
  const blocks = [];
  
  // Simplificado: contar try blocks
  const tryPattern = /try\s*\{/g;
  const matches = code.match(tryPattern) || [];
  
  for (let i = 0; i < matches.length; i++) {
    const tryIndex = code.indexOf(matches[i]);
    const blockEnd = findBlockEnd(code, tryIndex);
    const block = code.slice(tryIndex, blockEnd);
    
    blocks.push({
      hasCatch: /catch\s*\(/.test(block),
      hasFinally: /finally\s*\{/.test(block),
      lines: block.split('\n').length,
      protectedCalls: detectProtectedCalls(block)
    });
  }
  
  return blocks;
}

/**
 * Encuentra el final de un bloque
 */
function findBlockEnd(code, start) {
  let depth = 0;
  for (let i = start; i < code.length; i++) {
    if (code[i] === '{') depth++;
    if (code[i] === '}') {
      depth--;
      if (depth === 0) return i + 1;
    }
  }
  return code.length;
}

/**
 * Detecta llamadas protegidas por try
 */
function detectProtectedCalls(block) {
  const calls = [];
  
  const callPattern = /(\w+)\s*\(/g;
  let match;
  
  while ((match = callPattern.exec(block)) !== null) {
    calls.push(match[1]);
  }
  
  return [...new Set(calls)];
}

/**
 * Detecta patrón de propagación de errores
 */
function detectPropagationPattern(code) {
  const hasTryCatch = /try\s*\{/.test(code);
  const hasThrow = /throw\s+/.test(code);
  const hasRethrow = /catch.*?throw/.test(code);
  
  if (!hasTryCatch && hasThrow) return 'full';      // Lanza sin manejar
  if (hasTryCatch && !hasRethrow) return 'none';    // Maneja todo
  if (hasTryCatch && hasRethrow) return 'partial';  // Maneja y propaga
  
  return 'none';
}

/**
 * Detecta llamadas que pueden lanzar errores y no se manejan
 */
function detectUnhandledCalls(code) {
  const unhandled = [];
  
  // Funciones que típicamente lanzan
  const throwingFunctions = [
    'JSON.parse', 'JSON.stringify',
    'fetch', 'axios', 'request',
    'fs.readFile', 'fs.writeFile',
    'querySelector', 'getElementById',
    'require', 'import'
  ];
  
  for (const func of throwingFunctions) {
    const pattern = new RegExp(`${func.replace('.', '\\.')}\\s*\\(`);
    
    if (pattern.test(code)) {
      // Verificar si está protegido
      const positions = [];
      let match;
      const regex = new RegExp(`${func.replace('.', '\\.')}\\s*\\(`, 'g');
      
      while ((match = regex.exec(code)) !== null) {
        if (!isInsideTryBlock(code, match.index)) {
          positions.push(match.index);
        }
      }
      
      if (positions.length > 0) {
        unhandled.push({
          function: func,
          positions: positions.length,
          risk: func.includes('JSON') ? 'medium' : 'high'
        });
      }
    }
  }
  
  return unhandled;
}

/**
 * Verifica si una posición está dentro de un try block
 */
function isInsideTryBlock(code, position) {
  const before = code.slice(0, position);
  
  // Contar try/catch antes
  const tries = (before.match(/try\s*\{/g) || []).length;
  const catches = (before.match(/catch\s*\(/g) || []).length;
  
  return tries > catches;
}

/**
 * Extrae conexiones de error flow entre átomos
 * 
 * @param {Array} atoms - Todos los átomos
 * @returns {Array} Conexiones de error
 */
export function extractErrorFlowConnections(atoms) {
  const connections = [];
  
  // Indexar por errores que lanzan
  const throwersByType = new Map();
  
  for (const atom of atoms) {
    if (!atom.errorFlow?.throws) continue;
    
    for (const err of atom.errorFlow.throws) {
      if (!throwersByType.has(err.type)) {
        throwersByType.set(err.type, []);
      }
      throwersByType.get(err.type).push({
        atom,
        error: err
      });
    }
  }
  
  // Buscar quién maneja estos errores
  for (const atom of atoms) {
    if (!atom.errorFlow?.catches) continue;
    
    for (const catchHandler of atom.errorFlow.catches) {
      const errorType = catchHandler.type;
      
      // Buscar quién lanza este tipo
      const potentialThrowers = throwersByType.get(errorType) || [];
      
      for (const { atom: thrower, error } of potentialThrowers) {
        if (thrower.id === atom.id) continue;
        
        // Verificar si el thrower es llamado por el catcher
        const isCalled = atom.calls?.some(call => 
          call.includes(thrower.name) || call.includes(thrower.id)
        );
        
        if (isCalled) {
          connections.push({
            type: 'error-flow',
            from: thrower.id,
            to: atom.id,
            errorType,
            condition: error.condition,
            handling: {
              rethrows: catchHandler.rethrows,
              logs: catchHandler.logs,
              returns: catchHandler.returns,
              transforms: catchHandler.transforms
            },
            confidence: 0.8,
            evidence: {
              throwLine: error.line,
              handlingType: catchHandler.type
            }
          });
        }
      }
    }
  }
  
  // Detectar errores NO manejados
  for (const atom of atoms) {
    if (!atom.errorFlow?.throws) continue;
    
    for (const err of atom.errorFlow.throws) {
      // Buscar si alguien lo maneja
      const hasHandler = connections.some(c => 
        c.from === atom.id && c.errorType === err.type
      );
      
      if (!hasHandler) {
        connections.push({
          type: 'error-flow-unhandled',
          from: atom.id,
          to: 'uncaught',
          errorType: err.type,
          condition: err.condition,
          risk: err.implicit ? 'medium' : 'high',
          confidence: 0.6,
          warning: true,
          message: `Error ${err.type} may be unhandled`
        });
      }
    }
  }
  
  return connections;
}
