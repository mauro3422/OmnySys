/**
 * metadata-extractors.js
 * Extrae metadatos adicionales de los archivos para enriquecer el análisis
 * 
 * Incluye:
 * 1. JSDoc/TSDoc Contracts - Documentación de parámetros y retornos
 * 2. Runtime Contracts - Aserciones y validaciones en runtime
 * 3. Async Patterns - Patrones de async/await, Promise
 * 4. Error Handling - Try/catch, throw, códigos de error
 * 5. Build-time Dependencies - __DEV__, process.env, etc.
 */

// ==================== 1. JSDoc/TSDoc CONTRACTS ====================

/**
 * Extrae contratos de documentación JSDoc/TSDoc
 * @param {string} code - Código fuente
 * @returns {Object} - { functions: [], types: [], contracts: [] }
 */
export function extractJSDocContracts(code) {
  const contracts = {
    functions: [],
    types: [],
    all: []
  };
  
  // Regex para bloques JSDoc/TSDoc completos
  const jsdocPattern = /\/\*\*\s*([\s\S]*?)\s*\*\//g;
  
  // Dentro de un bloque, extraer @param, @returns, @throws
  const paramPattern = /@param\s*(?:\{([^}]+)\})?\s*(?:\[?([^\]]+)\]?)?\s*-?\s*(.*)/;
  const returnsPattern = /@returns?\s*(?:\{([^}]+)\})?\s*(.*)/;
  const throwsPattern = /@throws?\s*(?:\{([^}]+)\})?\s*(.*)/;
  const deprecatedPattern = /@deprecated\s*(.*)/;
  
  let match;
  while ((match = jsdocPattern.exec(code)) !== null) {
    const block = match[1];
    const line = getLineNumber(code, match.index);
    
    const contract = {
      line,
      description: '',
      params: [],
      returns: null,
      throws: [],
      deprecated: false,
      deprecatedReason: ''
    };
    
    // Extraer descripción (primera línea sin @)
    const lines = block.split('\n');
    for (const line of lines) {
      const cleanLine = line.replace(/^\s*\*\s?/, '').trim();
      
      if (cleanLine.startsWith('@param')) {
        const paramMatch = cleanLine.match(/@param\s*(?:\{([^}]+)\})?\s*(?:\[?([^\]]+)\]?)?\s*-?\s*(.*)/);
        if (paramMatch) {
          contract.params.push({
            type: paramMatch[1] || 'any',
            name: paramMatch[2] || '',
            description: paramMatch[3] || '',
            optional: cleanLine.includes('[') && cleanLine.includes(']')
          });
        }
      } else if (cleanLine.startsWith('@returns') || cleanLine.startsWith('@return')) {
        const returnsMatch = cleanLine.match(/@returns?\s*(?:\{([^}]+)\})?\s*(.*)/);
        if (returnsMatch) {
          contract.returns = {
            type: returnsMatch[1] || 'any',
            description: returnsMatch[2] || ''
          };
        }
      } else if (cleanLine.startsWith('@throws') || cleanLine.startsWith('@throw')) {
        const throwsMatch = cleanLine.match(/@throws?\s*(?:\{([^}]+)\})?\s*(.*)/);
        if (throwsMatch) {
          contract.throws.push({
            type: throwsMatch[1] || 'Error',
            description: throwsMatch[2] || ''
          });
        }
      } else if (cleanLine.startsWith('@deprecated')) {
        contract.deprecated = true;
        contract.deprecatedReason = cleanLine.replace('@deprecated', '').trim();
      } else if (!cleanLine.startsWith('@') && cleanLine && !contract.description) {
        contract.description = cleanLine;
      }
    }
    
    contracts.all.push(contract);
    
    // Detectar si es para una función o tipo
    const nextLine = getNextLine(code, match.index + match[0].length);
    if (nextLine.includes('function') || nextLine.includes('=>') || nextLine.includes('(')) {
      contracts.functions.push(contract);
    } else if (nextLine.includes('interface') || nextLine.includes('type ')) {
      contracts.types.push(contract);
    }
  }
  
  return contracts;
}

// ==================== 2. RUNTIME CONTRACTS ====================

/**
 * Extrae aserciones y validaciones de runtime
 * @param {string} code - Código fuente
 * @returns {Object} - { assertions: [], invariants: [], validations: [] }
 */
export function extractRuntimeContracts(code) {
  const contracts = {
    assertions: [],    // console.assert, assert()
    invariants: [],    // if (x === null) throw
    validations: [],   // typeof checks, instanceof
    nullChecks: [],    // if (!x) return
    all: []
  };
  
  // console.assert() o assert()
  const assertPattern = /(?:console\.)?assert\s*\(\s*([^,)]+)(?:,\s*([^)]+))?\)/g;
  
  // typeof checks
  const typeofPattern = /typeof\s+(\w+)\s*===?\s*['"]([^'"]+)['"]/g;
  
  // instanceof checks
  const instanceofPattern = /(\w+)\s+instanceof\s+(\w+)/g;
  
  // if (x === null || x === undefined) throw
  const nullGuardPattern = /if\s*\(\s*(\w+)\s*===?\s*(?:null|undefined)\s*\)\s*\{\s*throw\s+new\s+(\w+)/g;
  
  // if (!x) return early
  const earlyReturnPattern = /if\s*\(\s*!(\w+)\s*\)\s*(?:return|throw)/g;
  
  // Optional chaining con fallback: x?.y?.z ?? default
  const optionalChainPattern = /(\w+\?\.[\w?\.]+)(?:\s*\?\?\s*([^\s,;)]+))?/g;
  
  let match;
  
  while ((match = assertPattern.exec(code)) !== null) {
    contracts.assertions.push({
      type: 'assert',
      condition: match[1],
      message: match[2],
      line: getLineNumber(code, match.index)
    });
  }
  
  while ((match = typeofPattern.exec(code)) !== null) {
    contracts.validations.push({
      type: 'typeof',
      variable: match[1],
      expectedType: match[2],
      line: getLineNumber(code, match.index)
    });
  }
  
  while ((match = instanceofPattern.exec(code)) !== null) {
    contracts.validations.push({
      type: 'instanceof',
      variable: match[1],
      expectedClass: match[2],
      line: getLineNumber(code, match.index)
    });
  }
  
  while ((match = nullGuardPattern.exec(code)) !== null) {
    contracts.nullChecks.push({
      type: 'null_guard',
      variable: match[1],
      throws: match[2],
      line: getLineNumber(code, match.index)
    });
  }
  
  while ((match = earlyReturnPattern.exec(code)) !== null) {
    contracts.invariants.push({
      type: 'early_return',
      variable: match[1],
      line: getLineNumber(code, match.index)
    });
  }
  
  contracts.all = [
    ...contracts.assertions,
    ...contracts.validations,
    ...contracts.nullChecks,
    ...contracts.invariants
  ];
  
  return contracts;
}

// ==================== 3. ASYNC PATTERNS ====================

/**
 * Extrae patrones de async/await y Promise
 * @param {string} code - Código fuente
 * @returns {Object} - { asyncFunctions: [], promiseChains: [], raceConditions: [] }
 */
export function extractAsyncPatterns(code) {
  const patterns = {
    asyncFunctions: [],     // async function, async arrow
    promiseCreations: [],   // new Promise()
    promiseChains: [],      // .then().catch()
    promiseAll: [],         // Promise.all([...])
    promiseRace: [],        // Promise.race([...])
    awaitExpressions: [],   // await x
    timeouts: [],           // setTimeout, setInterval
    raceConditions: [],     // Patrones sospechosos
    all: []
  };
  
  // async function declarations
  const asyncFuncPattern = /async\s+(?:function\s+)?(\w+)?\s*[\(=>]/g;
  
  // new Promise((resolve, reject) => ...)
  const newPromisePattern = /new\s+Promise\s*\(\s*(?:async\s*)?\(\s*(\w+)\s*,\s*(\w+)\s*\)/g;
  
  // Promise.all() / Promise.allSettled()
  const promiseAllPattern = /Promise\.(all|allSettled|race|any)\s*\(\s*(\[)/g;
  
  // await expressions
  const awaitPattern = /await\s+([^;\n]+)/g;
  
  // .then().catch().finally() chains
  const promiseChainPattern = /(\w+)\.(then|catch|finally)\s*\(/g;
  
  // setTimeout / setInterval
  const timeoutPattern = /(setTimeout|setInterval)\s*\(\s*([^,]+)\s*,\s*(\d+)/g;
  
  // Patrones de race condition sospechosos
  // await en loop: for (...) { await ... }
  const awaitInLoopPattern = /(for|while)\s*\([^)]+\)\s*\{[^}]*await\s+/g;
  
  let match;
  
  while ((match = asyncFuncPattern.exec(code)) !== null) {
    patterns.asyncFunctions.push({
      type: 'async_function',
      name: match[1] || 'anonymous',
      line: getLineNumber(code, match.index)
    });
  }
  
  while ((match = newPromisePattern.exec(code)) !== null) {
    patterns.promiseCreations.push({
      type: 'new_promise',
      resolveParam: match[1],
      rejectParam: match[2],
      line: getLineNumber(code, match.index)
    });
  }
  
  while ((match = promiseAllPattern.exec(code)) !== null) {
    const method = match[1];
    if (method === 'race') {
      patterns.promiseRace.push({
        type: 'promise_race',
        line: getLineNumber(code, match.index)
      });
    } else {
      patterns.promiseAll.push({
        type: `promise_${method}`,
        line: getLineNumber(code, match.index)
      });
    }
  }
  
  while ((match = awaitPattern.exec(code)) !== null) {
    patterns.awaitExpressions.push({
      type: 'await',
      expression: match[1].trim(),
      line: getLineNumber(code, match.index)
    });
  }
  
  while ((match = promiseChainPattern.exec(code)) !== null) {
    patterns.promiseChains.push({
      type: 'promise_chain',
      target: match[1],
      method: match[2],
      line: getLineNumber(code, match.index)
    });
  }
  
  while ((match = timeoutPattern.exec(code)) !== null) {
    patterns.timeouts.push({
      type: match[1],
      delay: parseInt(match[3]),
      line: getLineNumber(code, match.index)
    });
  }
  
  // Detectar await en loops (patrón sospechoso)
  const loopMatch = awaitInLoopPattern.exec(code);
  if (loopMatch) {
    patterns.raceConditions.push({
      type: 'await_in_loop',
      description: 'Sequential await in loop may cause performance issues',
      line: getLineNumber(code, loopMatch.index),
      severity: 'WARNING'
    });
  }
  
  patterns.all = [
    ...patterns.asyncFunctions,
    ...patterns.promiseCreations,
    ...patterns.promiseAll,
    ...patterns.promiseRace,
    ...patterns.awaitExpressions,
    ...patterns.promiseChains,
    ...patterns.timeouts
  ];
  
  return patterns;
}

// ==================== 4. ERROR HANDLING ====================

/**
 * Extrae patrones de manejo de errores
 * @param {string} code - Código fuente
 * @returns {Object} - { tryBlocks: [], errorCodes: [], customErrors: [] }
 */
export function extractErrorHandling(code) {
  const errors = {
    tryBlocks: [],          // try { ... } catch { ... }
    throwStatements: [],    // throw new Error()
    errorCodes: [],         // códigos de error específicos
    customErrors: [],       // class MyError extends Error
    errorMessages: [],      // mensajes de error hardcodeados
    catchBlocks: [],        // catch (e) { ... }
    all: []
  };
  
  // try/catch/finally blocks
  const tryCatchPattern = /try\s*\{[^}]*\}\s*catch\s*\(\s*(\w+)\s*\)\s*\{/g;
  
  // throw new Error() o throw custom
  const throwPattern = /throw\s+(?:new\s+)?(\w+)?\s*\(\s*['"]?([^'"\)]*)['"]?\)?/g;
  
  // Error codes: 'ERR_SOMETHING', 'E_SOMETHING', etc.
  const errorCodePattern = /['"](ERR_[A-Z_]+|E_[A-Z_]+|CODE_[A-Z_]+)['"]/g;
  
  // class XError extends Error
  const customErrorPattern = /class\s+(\w+Error)\s+extends\s+(?:Error|\w+Error)/g;
  
  // Mensajes de error hardcodeados: throw new Error('mensaje')
  const errorMessagePattern = /(?:throw|Error)\s*\(\s*['"]([^'"]{10,})['"]/g;
  
  // e.code === 'SOMETHING' (comparación de códigos)
  const codeCheckPattern = /(\w+)\.code\s*===?\s*['"]([^'"]+)['"]/g;
  
  let match;
  
  while ((match = tryCatchPattern.exec(code)) !== null) {
    errors.tryBlocks.push({
      type: 'try_catch',
      errorVar: match[1],
      line: getLineNumber(code, match.index)
    });
  }
  
  while ((match = throwPattern.exec(code)) !== null) {
    errors.throwStatements.push({
      type: 'throw',
      errorType: match[1] || 'Error',
      message: match[2],
      line: getLineNumber(code, match.index)
    });
  }
  
  while ((match = errorCodePattern.exec(code)) !== null) {
    errors.errorCodes.push({
      type: 'error_code',
      code: match[1],
      line: getLineNumber(code, match.index)
    });
  }
  
  while ((match = customErrorPattern.exec(code)) !== null) {
    errors.customErrors.push({
      type: 'custom_error_class',
      name: match[1],
      line: getLineNumber(code, match.index)
    });
  }
  
  while ((match = errorMessagePattern.exec(code)) !== null) {
    errors.errorMessages.push({
      type: 'error_message',
      message: match[1],
      line: getLineNumber(code, match.index)
    });
  }
  
  while ((match = codeCheckPattern.exec(code)) !== null) {
    errors.errorCodes.push({
      type: 'error_code_check',
      variable: match[1],
      code: match[2],
      line: getLineNumber(code, match.index)
    });
  }
  
  errors.all = [
    ...errors.tryBlocks,
    ...errors.throwStatements,
    ...errors.errorCodes,
    ...errors.customErrors
  ];
  
  return errors;
}

// ==================== 5. BUILD-TIME DEPENDENCIES ====================

/**
 * Extrae dependencias de build-time
 * @param {string} code - Código fuente
 * @returns {Object} - { envVars: [], devFlags: [], platformChecks: [] }
 */
export function extractBuildTimeDependencies(code) {
  const build = {
    envVars: [],            // process.env.X, import.meta.env.X
    devFlags: [],           // __DEV__, NODE_ENV === 'development'
    platformChecks: [],     // typeof window !== 'undefined'
    featureFlags: [],       // flags.enabled, etc.
    deadCodeCandidates: [], // Código que puede eliminarse en prod
    all: []
  };
  
  // process.env.VAR o import.meta.env.VAR
  const envPattern = /(?:process\.env|import\.meta\.env)\.(\w+)/g;
  
  // __DEV__, __PROD__, __TEST__
  const devFlagPattern = /__(DEV|PROD|TEST|DEBUG)__/g;
  
  // NODE_ENV checks
  const nodeEnvPattern = /process\.env\.NODE_ENV\s*===?\s*['"]([^'"]+)['"]/g;
  
  // typeof window !== 'undefined'
  const platformPattern = /typeof\s+(window|document|global|process)\s*!==?\s*['"]undefined['"]/g;
  
  // Feature flags: flags.x, featureFlags.y
  const featureFlagPattern = /(?:flags|featureFlags)\.(\w+)/g;
  
  // DEBUG || debug()
  const debugPattern = /(?:^|\s)(DEBUG|debug)\s*[\(&]/g;
  
  let match;
  
  while ((match = envPattern.exec(code)) !== null) {
    build.envVars.push({
      type: 'env_var',
      name: match[1],
      line: getLineNumber(code, match.index)
    });
  }
  
  while ((match = devFlagPattern.exec(code)) !== null) {
    build.devFlags.push({
      type: 'build_flag',
      name: match[1],
      line: getLineNumber(code, match.index)
    });
    
    // Marcar como código potencialmente muerto en producción
    if (match[1] === 'DEV' || match[1] === 'DEBUG') {
      build.deadCodeCandidates.push({
        type: 'dev_only_code',
        flag: match[1],
        line: getLineNumber(code, match.index),
        reason: 'Code may be removed in production build'
      });
    }
  }
  
  while ((match = nodeEnvPattern.exec(code)) !== null) {
    build.devFlags.push({
      type: 'node_env',
      value: match[1],
      line: getLineNumber(code, match.index)
    });
  }
  
  while ((match = platformPattern.exec(code)) !== null) {
    build.platformChecks.push({
      type: 'platform_check',
      platform: match[1],
      line: getLineNumber(code, match.index)
    });
  }
  
  while ((match = featureFlagPattern.exec(code)) !== null) {
    build.featureFlags.push({
      type: 'feature_flag',
      name: match[1],
      line: getLineNumber(code, match.index)
    });
  }
  
  while ((match = debugPattern.exec(code)) !== null) {
    build.devFlags.push({
      type: 'debug_call',
      name: match[1],
      line: getLineNumber(code, match.index)
    });
  }
  
  build.all = [
    ...build.envVars,
    ...build.devFlags,
    ...build.platformChecks,
    ...build.featureFlags
  ];
  
  return build;
}

// ==================== EXTRACTOR COMPLETO ====================

/**
 * Extrae TODOS los metadatos de un archivo
 * @param {string} filePath - Ruta del archivo
 * @param {string} code - Código fuente
 * @returns {Object} - Metadatos completos
 */
export function extractAllMetadata(filePath, code) {
  return {
    filePath,
    jsdoc: extractJSDocContracts(code),
    runtime: extractRuntimeContracts(code),
    async: extractAsyncPatterns(code),
    errors: extractErrorHandling(code),
    build: extractBuildTimeDependencies(code),
    timestamp: new Date().toISOString()
  };
}

// ==================== UTILIDADES ====================

function getLineNumber(code, position) {
  const lines = code.substring(0, position).split('\n');
  return lines.length;
}

function getNextLine(code, position) {
  const lines = code.substring(position).split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('*')) {
      return trimmed;
    }
  }
  return '';
}
