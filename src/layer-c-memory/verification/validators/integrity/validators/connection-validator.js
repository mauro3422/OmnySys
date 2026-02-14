/**
 * @fileoverview Connection validation logic
 * @module verification/validators/integrity/validators/connection-validator
 */

import fs from 'fs/promises';
import path from 'path';
import { Severity, IssueCategory, DataSystem } from '../../../types/index.js';

/**
 * Valida archivos de conexiones
 * @param {string} connectionsDir - Directorio de conexiones
 * @param {Function} addIssue - Callback para agregar issues
 */
export async function validateConnections(connectionsDir, addIssue) {
  try {
    const connectionFiles = await fs.readdir(connectionsDir);
    let validatedCount = 0;

    for (const connFile of connectionFiles) {
      if (connFile.endsWith('.json')) {
        const fullPath = path.join(connectionsDir, connFile);
        await validateConnectionFile(fullPath, connFile, addIssue);
        validatedCount++;
      }
    }

    return validatedCount;
  } catch (error) {
    // Directorio puede no existir, no es crítico
    return 0;
  }
}

/**
 * Valida un archivo de conexiones
 * @param {string} fullPath - Ruta completa del archivo
 * @param {string} relativePath - Ruta relativa
 * @param {Function} addIssue - Callback para agregar issues
 */
async function validateConnectionFile(fullPath, relativePath, addIssue) {
  try {
    const content = await fs.readFile(fullPath, 'utf-8');
    const connData = JSON.parse(content);

    if (!connData.connections || !Array.isArray(connData.connections)) {
      addIssue({
        category: IssueCategory.INTEGRITY,
        severity: Severity.HIGH,
        system: DataSystem.CONNECTIONS,
        path: relativePath,
        message: 'Missing or invalid connections array'
      });
    }
  } catch (error) {
    addIssue({
      category: IssueCategory.INTEGRITY,
      severity: Severity.HIGH,
      system: DataSystem.CONNECTIONS,
      path: relativePath,
      message: `Invalid connections file: ${error.message}`
    });
  }
}
