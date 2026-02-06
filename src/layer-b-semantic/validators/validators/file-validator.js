/**
 * @fileoverview file-validator.js
 * 
 * Validación de paths de archivos del LLM
 * 
 * @module validators/validators/file-validator
 */

import { isJavaScriptCode, isGenericPath, looksLikeValidPath } from '../utils/pattern-checkers.js';

/**
 * Valida que los paths de archivos existan en el proyecto
 * @param {string[]} llmFiles - Paths propuestos por el LLM
 * @param {string[]} validFilePaths - Paths válidos del proyecto
 * @returns {string[]} - Paths validados
 */
export function validateConnectedFiles(llmFiles, validFilePaths) {
  if (!Array.isArray(llmFiles)) return [];

  return llmFiles.filter(file => {
    // Rechazar placeholders genéricos
    if (isGenericPath(file)) {
      console.warn(`⚠️  LLM devolvió path genérico: ${file}`);
      return false;
    }

    // Rechazar código como path
    if (isJavaScriptCode(file)) {
      console.warn(`⚠️  LLM confundió código con path: ${file}`);
      return false;
    }

    // Si tenemos lista de paths válidos, verificar
    if (validFilePaths?.length > 0) {
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

    return looksLikeValidPath(file);
  });
}

/**
 * Verifica si un archivo existe en la lista de válidos
 * @param {string} file - Path a verificar
 * @param {string[]} validFilePaths - Paths válidos
 * @returns {boolean}
 */
export function fileExistsInProject(file, validFilePaths) {
  if (!validFilePaths?.length) return true;
  
  return validFilePaths.some(validPath =>
    validPath === file ||
    validPath.endsWith(file) ||
    file.endsWith(validPath)
  );
}

/**
 * Normaliza un path de archivo
 * @param {string} file - Path a normalizar
 * @returns {string}
 */
export function normalizeFilePath(file) {
  return file.replace(/\\/g, '/').trim();
}
