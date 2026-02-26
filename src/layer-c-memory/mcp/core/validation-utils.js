/**
 * @fileoverview validation-utils.js
 * 
 * Sistema de validación robusto para operaciones de archivos MCP.
 * Previene errores comunes antes de editar/escribir archivos.
 * 
 * Validaciones implementadas:
 * 1. ✅ Existencia de archivo (pre-edit)
 * 2. ✅ Verificación de duplicados (funciones con mismo nombre)
 * 3. ✅ Validación de rutas (relativa vs absoluta)
 * 4. ✅ Contexto de líneas (mostrar alrededor del cambio)
 * 5. ✅ Impact analysis (qué se rompe si edito esto)
 * 
 * @module mcp/core/validation-utils
 */

import fs from 'fs/promises';
import path from 'path';
import { getAllAtoms } from '#layer-c/storage/index.js';

/**
 * Resultado de validación
 * @typedef {Object} ValidationResult
 * @property {boolean} valid - Si pasó todas las validaciones
 * @property {string[]} warnings - Advertencias (no bloqueantes)
 * @property {string[]} errors - Errores (bloqueantes)
 * @property {Object} context - Información de contexto
 */

/**
 * Valida si un archivo existe antes de editar
 * 
 * @param {string} filePath - Ruta del archivo
 * @returns {Promise<ValidationResult>}
 */
export async function validateFileExists(filePath, projectPath = null) {
  const result = {
    valid: true,
    warnings: [],
    errors: [],
    context: {}
  };

  try {
    const absolutePath = path.isAbsolute(filePath) ? filePath :
      (projectPath ? path.join(projectPath, filePath) : path.resolve(filePath));
    await fs.access(absolutePath);
    result.context.absolutePath = absolutePath;
    result.context.exists = true;
  } catch (error) {
    result.valid = false;
    result.errors.push(`❌ File does not exist: ${filePath}`);
    result.context.exists = false;

    // Sugerir archivos similares
    const suggestions = await findSimilarFiles(filePath);
    if (suggestions.length > 0) {
      result.context.suggestions = suggestions;
      result.warnings.push(`💡 Did you mean: ${suggestions.join(', ')}?`);
    }
  }

  return result;
}

/**
 * Encuentra archivos similares si el buscado no existe
 * @private
 */
async function findSimilarFiles(filePath) {
  try {
    const dir = path.dirname(filePath);
    const basename = path.basename(filePath, path.extname(filePath));
    const files = await fs.readdir(dir, { withFileTypes: true });

    return files
      .filter(f => f.isFile() && f.name.includes(basename.substring(0, 5)))
      .map(f => path.join(dir, f.name))
      .slice(0, 3);
  } catch {
    return [];
  }
}

/**
 * Valida si hay funciones duplicadas con el mismo nombre
 * 
 * @param {string} filePath - Ruta del archivo
 * @param {string} symbolName - Nombre de la función/símbolo
 * @param {string} projectPath - Ruta del proyecto (para acceder al grafo)
 * @returns {Promise<ValidationResult>}
 */
export async function validateNoDuplicates(filePath, symbolName, projectPath) {
  const result = {
    valid: true,
    warnings: [],
    errors: [],
    context: {}
  };

  if (!projectPath) {
    // Sin projectPath no podemos verificar duplicados
    result.warnings.push(`⚠️ Cannot check duplicates: projectPath not provided`);
    return result;
  }

  try {
    // Buscar en el grafo usando storage directamente (sin import dinámico)
    const atoms = await getAllAtoms(projectPath);

    // Filtrar átomos con el mismo nombre
    const instances = atoms.filter(atom => atom.name === symbolName);

    if (instances.length > 1) {
      const sameFileInstances = instances.filter(
        i => i.filePath === filePath || i.filePath.includes(path.basename(filePath))
      );

      if (sameFileInstances.length > 1) {
        result.valid = false;
        result.errors.push(
          `❌ Duplicate symbol "${symbolName}" found ${sameFileInstances.length} times in this file`
        );
        result.context.duplicates = sameFileInstances.map(a => ({
          id: a.id,
          filePath: a.filePath,
          line: a.line,
          complexity: a.complexity
        }));
      } else {
        result.warnings.push(
          `⚠️ Symbol "${symbolName}" exists in ${instances.length} files - ` +
          `editing this one may affect: ${instances.slice(0, 3).map(i => i.filePath).join(', ')}`
        );
      }
    }
  } catch (error) {
    // Si no podemos verificar, solo advertir
    result.warnings.push(`⚠️ Could not verify duplicates for "${symbolName}": ${error.message}`);
  }

  return result;
}

/**
 * Valida que la ruta sea correcta y segura
 * 
 * @param {string} filePath - Ruta a validar
 * @returns {ValidationResult}
 */
export function validatePath(filePath) {
  const result = {
    valid: true,
    warnings: [],
    errors: [],
    context: {}
  };

  // Detectar si es absoluta
  if (path.isAbsolute(filePath)) {
    result.warnings.push(`⚠️ Using absolute path: ${filePath}. Consider using relative path.`);
  }

  // Detectar caracteres problemáticos
  const invalidChars = /[<>"|?*]/;
  if (invalidChars.test(filePath)) {
    result.valid = false;
    result.errors.push(`❌ Path contains invalid characters: ${filePath.match(invalidChars)[0]}`);
  }

  // Detectar doble slashes o puntos
  if (filePath.includes('//') || filePath.includes('..')) {
    result.warnings.push(`⚠️ Path contains // or .. which may cause issues`);
  }

  // Detectar extensión
  const ext = path.extname(filePath);
  result.context.extension = ext;
  if (!ext) {
    result.warnings.push(`⚠️ File has no extension: ${filePath}`);
  }

  return result;
}

/**
 * Obtiene contexto de líneas alrededor de una posición
 * 
 * @param {string} filePath - Ruta del archivo
 * @param {number} lineNumber - Línea objetivo
 * @param {number} contextLines - Líneas de contexto (default: 5)
 * @returns {Promise<Object>}
 */
export async function getLineContext(filePath, lineNumber, contextLines = 5) {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split('\n');

    const start = Math.max(0, lineNumber - contextLines - 1);
    const end = Math.min(lines.length, lineNumber + contextLines);

    const contextLines2 = [];
    for (let i = start; i < end; i++) {
      contextLines2.push({
        line: i + 1,
        content: lines[i],
        isTarget: i === lineNumber - 1
      });
    }

    return {
      totalLines: lines.length,
      targetLine: lineNumber,
      context: contextLines2,
      surrounding: contextLines2.filter(l => !l.isTarget).map(l => `${l.line}: ${l.content}`).join('\n')
    };
  } catch (error) {
    return {
      error: `Could not read context: ${error.message}`,
      totalLines: 0,
      context: []
    };
  }
}

/**
 * Análisis de impacto antes de editar usando el grafo directamente
 * 
 * @param {string} filePath - Ruta del archivo
 * @param {string} symbolName - Nombre del símbolo a editar
 * @param {string} projectPath - Ruta del proyecto (para acceder al grafo)
 * @returns {Promise<ValidationResult>}
 */
export async function validateImpact(filePath, symbolName, projectPath) {
  const result = {
    valid: true,
    warnings: [],
    errors: [],
    context: {}
  };

  if (!projectPath) {
    result.warnings.push(`⚠️ Cannot analyze impact: projectPath not provided`);
    return result;
  }

  try {
    // Usar el grafo directamente (sin import dinámico)
    const atoms = await getAllAtoms(projectPath);

    // Encontrar átomos del archivo objetivo
    const fileAtoms = atoms.filter(a => a.filePath === filePath);

    // Calcular impacto basado en calledBy (quién llama a estos átomos)
    const affectedFiles = new Set();
    let totalCallers = 0;

    for (const atom of fileAtoms) {
      if (atom.calledBy && atom.calledBy.length > 0) {
        totalCallers += atom.calledBy.length;
        // Agregar archivos de los callers
        for (const callerId of atom.calledBy) {
          const caller = atoms.find(a => a.id === callerId);
          if (caller) {
            affectedFiles.add(caller.filePath);
          }
        }
      }
    }

    if (affectedFiles.size > 0) {
      result.warnings.push(
        `⚠️ This change will affect ${affectedFiles.size} files directly (${totalCallers} total call sites)`
      );
      result.context.affectedFiles = Array.from(affectedFiles).slice(0, 5);
    }

    if (affectedFiles.size > 10) {
      result.warnings.push(
        `🚨 HIGH IMPACT: ${affectedFiles.size} total files affected. Consider careful review.`
      );
    }

    // Calcular riesgo basado en fragilityScore
    const highFragilityAtoms = fileAtoms.filter(a => a.derived?.fragilityScore > 0.5);
    if (highFragilityAtoms.length > 0) {
      result.warnings.push(
        `⚠️ ${highFragilityAtoms.length} fragile atoms in this file (fragility > 0.5)`
      );
    }

  } catch (error) {
    // Si no podemos obtener impacto, continuar con advertencia
    result.warnings.push(`⚠️ Could not analyze impact: ${error.message}`);
  }

  return result;
}

/**
 * Validación COMPLETA antes de editar (combina todas las validaciones)
 * 
 * @param {Object} params - Parámetros
 * @param {string} params.filePath - Ruta del archivo
 * @param {string} params.symbolName - Nombre del símbolo (opcional)
 * @param {number} params.lineNumber - Línea a editar (opcional)
 * @param {string} params.projectPath - Ruta del proyecto (para acceder al grafo)
 * @returns {Promise<ValidationResult>}
 */
export async function validateBeforeEdit({ filePath, symbolName = null, lineNumber = null, projectPath = null }) {
  console.log(`🔍 Validating edit operation: ${filePath}${symbolName ? `::${symbolName}` : ''}`);

  const combined = {
    valid: true,
    warnings: [],
    errors: [],
    context: {
      validationsPerformed: [],
      filePath,
      symbolName
    }
  };

  // 1. Validar existencia
  const existsValidation = await validateFileExists(filePath, projectPath);
  combined.valid = combined.valid && existsValidation.valid;
  combined.warnings.push(...existsValidation.warnings);
  combined.errors.push(...existsValidation.errors);
  combined.context.fileExists = existsValidation.context.exists;
  combined.context.validationsPerformed.push('fileExists');

  if (!combined.valid) {
    console.log(`❌ Validation FAILED: ${combined.errors.join(', ')}`);
    return combined;
  }

  // 2. Validar ruta
  const pathValidation = validatePath(filePath);
  combined.valid = combined.valid && pathValidation.valid;
  combined.warnings.push(...pathValidation.warnings);
  combined.errors.push(...pathValidation.errors);
  combined.context.validationsPerformed.push('path');

  // 3. Validar duplicados (si hay symbolName y projectPath)
  if (symbolName && projectPath) {
    const dupValidation = await validateNoDuplicates(filePath, symbolName, projectPath);
    combined.valid = combined.valid && dupValidation.valid;
    combined.warnings.push(...dupValidation.warnings);
    combined.errors.push(...dupValidation.errors);
    combined.context.validationsPerformed.push('duplicates');
  }

  // 4. Obtener contexto de líneas (si hay lineNumber)
  if (lineNumber && combined.context.fileExists) {
    const context = await getLineContext(filePath, lineNumber);
    combined.context.lineContext = context;
    combined.context.validationsPerformed.push('lineContext');
    console.log(`📝 Context around line ${lineNumber}:\n${context.surrounding}`);
  }

  // 5. Análisis de impacto (si hay projectPath)
  if (projectPath) {
    const impactValidation = await validateImpact(filePath, symbolName, projectPath);
    combined.warnings.push(...impactValidation.warnings);
    combined.context.validationsPerformed.push('impact');
  }

  // Resumen
  console.log(`✅ Validation complete: ${combined.context.validationsPerformed.join(' → ')}`);
  if (combined.warnings.length > 0) {
    console.log(`⚠️ Warnings: ${combined.warnings.length}`);
    combined.warnings.forEach(w => console.log(`   ${w}`));
  }
  if (combined.errors.length > 0) {
    console.log(`❌ Errors: ${combined.errors.length}`);
    combined.errors.forEach(e => console.log(`   ${e}`));
  }

  return combined;
}

/**
 * Valida antes de escribir archivo nuevo
 * 
 * @param {Object} params - Parámetros
 * @param {string} params.filePath - Ruta del archivo
 * @returns {Promise<ValidationResult>}
 */
export async function validateBeforeWrite({ filePath }) {
  console.log(`🔍 Validating write operation: ${filePath}`);

  const result = {
    valid: true,
    warnings: [],
    errors: [],
    context: {
      validationsPerformed: []
    }
  };

  // 1. Validar ruta
  const pathValidation = validatePath(filePath);
  result.valid = result.valid && pathValidation.valid;
  result.warnings.push(...pathValidation.warnings);
  result.errors.push(...pathValidation.errors);
  result.context.validationsPerformed.push('path');

  // 2. Verificar si ya existe (advertir sobreescritura)
  try {
    await fs.access(filePath);
    result.warnings.push(`⚠️ File already exists: ${filePath}. Will OVERWRITE.`);
    result.context.alreadyExists = true;
  } catch {
    result.context.alreadyExists = false;
  }
  result.context.validationsPerformed.push('existsCheck');

  // 3. Verificar que el directorio padre existe
  const parentDir = path.dirname(filePath);
  try {
    await fs.access(parentDir);
    result.context.parentExists = true;
  } catch {
    result.warnings.push(`⚠️ Parent directory does not exist: ${parentDir}. Will be created.`);
    result.context.parentExists = false;
  }
  result.context.validationsPerformed.push('parentDir');

  console.log(`✅ Validation complete: ${result.context.validationsPerformed.join(' → ')}`);

  return result;
}

// Exportar todo
export default {
  validateFileExists,
  validateNoDuplicates,
  validatePath,
  getLineContext,
  validateImpact,
  validateBeforeEdit,
  validateBeforeWrite
};
