/**
 * @fileoverview error-handling.js
 * 
 * Extrae patrones de manejo de errores
 * 
 * @module extractors/metadata/error-handling
 */

import { getLineNumber } from '../utils.js';

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
