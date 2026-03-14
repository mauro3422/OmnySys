/**
 * @fileoverview validation-ext.js
 *
 * Validación extendida para safe_edit.
 * Complementa las validaciones de atomic_edit con checks adicionales.
 */

import { createLogger } from '#utils/logger.js';

const logger = createLogger('OmnySys:MCP:SafeEdit:Validation');

/**
 * Valida el intent de edición antes de ejecutar
 * @param {Object} params - Parámetros de validación
 * @param {string} params.filePath - Ruta del archivo
 * @param {string} params.oldString - Contenido actual a reemplazar
 * @param {string} params.newContent - Nuevo contenido
 * @param {string} params.projectPath - Ruta del proyecto
 * @param {Object} params.editContext - Contexto de edición
 * @returns {Promise<Object>} Resultado de validación
 */
export async function validateEditIntent({
  filePath,
  oldString,
  newContent,
  projectPath,
  editContext
}) {
  const errors = [];
  const warnings = [];

  // 1. Validar que oldString no esté vacío
  if (!oldString || oldString.trim() === '') {
    errors.push('oldString is empty or undefined');
  }

  // 2. Validar que newContent no esté vacío (a menos que sea una eliminación intencional)
  if (!newContent || newContent.trim() === '') {
    warnings.push('newContent is empty - this will delete code');
  }

  // 3. Validar que oldString y newContent sean diferentes
  if (oldString === newContent) {
    errors.push('oldString and newContent are identical - no changes would be made');
  }

  // 4. Validar balance de llaves/paréntesis (básico)
  const oldBraces = countBraces(oldString);
  const newBraces = countBraces(newContent);
  
  if (Math.abs(oldBraces.open - oldBraces.close) !== Math.abs(newBraces.open - newBraces.close)) {
    warnings.push('Brace balance changed - verify this is intentional');
  }

  // 5. Validar indentación consistente
  const oldIndent = detectIndentation(oldString);
  const newIndent = detectIndentation(newContent);
  
  if (oldIndent && newIndent && oldIndent !== newIndent) {
    if (editContext && editContext.indentation && oldIndent === editContext.indentation) {
      warnings.push(`New content indentation (${JSON.stringify(newIndent)}) differs from context (${JSON.stringify(oldIndent)})`);
    }
  }

  // 6. Validar que no se estén eliminando exports importantes
  if (oldString.includes('export') && !newContent.includes('export')) {
    warnings.push('Export statement may be removed - verify this is intentional');
  }

  // 7. Validar tamaño del cambio (cambios muy grandes pueden ser riesgosos)
  const oldLines = oldString.split('\n').length;
  const newLines = newContent.split('\n').length;
  const lineDiff = Math.abs(oldLines - newLines);
  
  if (lineDiff > 50) {
    warnings.push(`Large change: ${lineDiff} lines difference - consider breaking into smaller edits`);
  }

  // 8. Validar contexto si está disponible
  if (editContext && editContext.atomName) {
    logger.debug(`[validateEditIntent] Editing atom: ${editContext.atomName} at line ${editContext.targetLine}`);
  }

  const valid = errors.length === 0;

  return {
    valid,
    errors,
    warnings,
    summary: {
      oldLength: oldString?.length || 0,
      newLength: newContent?.length || 0,
      oldLines,
      newLines,
      lineDiff
    }
  };
}

/**
 * Cuenta llaves abiertas y cerradas en un string
 */
function countBraces(str) {
  let open = 0;
  let close = 0;
  
  for (const char of str) {
    if (char === '{') open++;
    if (char === '}') close++;
  }
  
  return { open, close };
}

/**
 * Detecta la indentación de un string
 */
function detectIndentation(str) {
  const match = str.match(/^(\s+)/);
  if (!match) return null;
  
  const whitespace = match[1];
  if (whitespace.includes('\t')) return '\t';
  
  const spaceCount = whitespace.length;
  if (spaceCount % 4 === 0) return '    ';
  if (spaceCount % 2 === 0) return '  ';
  return whitespace;
}

/**
 * Valida sintaxis básica de JavaScript (sin ejecutar)
 * @param {string} code - Código a validar
 * @returns {Object} Resultado de validación
 */
export function validateBasicSyntax(code) {
  const errors = [];

  // 1. Verificar llaves balanceadas
  const braces = countBraces(code);
  if (braces.open !== braces.close) {
    errors.push(`Unbalanced braces: ${braces.open} open, ${braces.close} close`);
  }

  // 2. Verificar paréntesis balanceados
  let parens = 0;
  for (const char of code) {
    if (char === '(') parens++;
    if (char === ')') parens--;
  }
  if (parens !== 0) {
    errors.push(`Unbalanced parentheses: ${parens > 0 ? 'missing closing' : 'extra closing'}`);
  }

  // 3. Verificar corchetes balanceados
  let brackets = 0;
  for (const char of code) {
    if (char === '[') brackets++;
    if (char === ']') brackets--;
  }
  if (brackets !== 0) {
    errors.push(`Unbalanced brackets: ${brackets > 0 ? 'missing closing' : 'extra closing'}`);
  }

  // 4. Verificar strings sin cerrar (básico)
  const singleQuotes = (code.match(/'/g) || []).length;
  const doubleQuotes = (code.match(/"/g) || []).length;
  const templateQuotes = (code.match(/`/g) || []).length;
  
  if (singleQuotes % 2 !== 0) {
    errors.push('Unclosed single-quoted string');
  }
  if (doubleQuotes % 2 !== 0) {
    errors.push('Unclosed double-quoted string');
  }
  if (templateQuotes % 2 !== 0) {
    errors.push('Unclosed template string');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
