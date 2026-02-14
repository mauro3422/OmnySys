/**
 * @fileoverview File validation logic
 * @module verification/validators/integrity/validators/file-validator
 */

import fs from 'fs/promises';
import path from 'path';
import { Severity, IssueCategory, DataSystem } from '../../../types/index.js';
import { FILE_REQUIRED_FIELDS } from '../constants/index.js';
import { getJsonFiles } from '../utils/file-scanner.js';

/**
 * Valida archivos JSON de metadatos
 * @param {string} filesDir - Directorio de archivos
 * @param {Function} addIssue - Callback para agregar issues
 */
export async function validateFiles(filesDir, addIssue) {
  try {
    const fileJsons = await getJsonFiles(filesDir);

    for (const fileJson of fileJsons) {
      const fullPath = path.join(filesDir, fileJson);
      await validateFileJson(fullPath, fileJson, addIssue);
    }

    return fileJsons.length;
  } catch (error) {
    // Directorio puede no existir, no es crítico
    return 0;
  }
}

/**
 * Valida un archivo JSON individual
 * @param {string} fullPath - Ruta completa del archivo
 * @param {string} relativePath - Ruta relativa
 * @param {Function} addIssue - Callback para agregar issues
 */
async function validateFileJson(fullPath, relativePath, addIssue) {
  try {
    const content = await fs.readFile(fullPath, 'utf-8');

    let fileData;
    try {
      fileData = JSON.parse(content);
    } catch (parseError) {
      addIssue({
        category: IssueCategory.INTEGRITY,
        severity: Severity.CRITICAL,
        system: DataSystem.FILES,
        path: relativePath,
        message: `Invalid JSON: ${parseError.message}`
      });
      return;
    }

    // Verificar campos requeridos
    const missingFields = FILE_REQUIRED_FIELDS.filter(field => !(field in fileData));
    if (missingFields.length > 0) {
      addIssue({
        category: IssueCategory.COMPLETENESS,
        severity: Severity.HIGH,
        system: DataSystem.FILES,
        path: relativePath,
        message: `Missing required fields: ${missingFields.join(', ')}`
      });
    }

  } catch (error) {
    addIssue({
      category: IssueCategory.INTEGRITY,
      severity: Severity.HIGH,
      system: DataSystem.FILES,
      path: relativePath,
      message: `Failed to read file: ${error.message}`
    });
  }
}
