/**
 * @fileoverview Issue Creator
 * 
 * Crea diferentes tipos de issues de consistencia.
 * 
 * @module consistency/issue-manager/managers/issue-creator
 */

import { Severity, IssueCategory, DataSystem } from '../../../../../types/index.js';

/**
 * Crea un issue de archivo no existente
 * @param {Function} addIssue - Función para agregar issue
 * @param {string} atomId - ID del átomo
 * @param {string} filePath - Path del archivo
 * @param {boolean} isHistorical - Si es archivo histórico/test
 * @returns {Object} - Issue creado
 */
export function addNonExistentFileIssue(addIssue, atomId, filePath, isHistorical = false) {
  if (isHistorical) {
    return addIssue({
      category: IssueCategory.CONSISTENCY,
      severity: Severity.INFO,
      system: DataSystem.ATOMS,
      path: atomId,
      message: `Atom references historical/test file (evidence): ${filePath}`,
      suggestion: 'Historical metadata preserved for reference'
    });
  }
  
  return addIssue({
    category: IssueCategory.CONSISTENCY,
    severity: Severity.HIGH,
    system: DataSystem.ATOMS,
    path: atomId,
    message: `Atom references non-existent file: ${filePath}`,
    suggestion: 'Remove orphaned atom or re-analyze the file'
  });
}

/**
 * Crea un issue de función no encontrada
 * @param {Function} addIssue - Función para agregar issue
 * @param {string} atomId - ID del átomo
 * @param {string} functionName - Nombre de la función
 * @param {Array} availableDefinitions - Definiciones disponibles
 * @returns {Object} - Issue creado
 */
export function addFunctionNotFoundIssue(addIssue, atomId, functionName, availableDefinitions) {
  return addIssue({
    category: IssueCategory.CONSISTENCY,
    severity: Severity.MEDIUM,
    system: DataSystem.ATOMS,
    path: atomId,
    message: `Atom function '${functionName}' not found in file definitions`,
    actual: availableDefinitions.map(d => d.name).join(', '),
    suggestion: 'Atom may be stale, re-analysis needed'
  });
}

/**
 * Crea un issue de mismatch de export
 * @param {Function} addIssue - Función para agregar issue
 * @param {string} atomId - ID del átomo
 * @param {boolean} atomExportStatus - Estado en el átomo
 * @param {boolean} fileExportStatus - Estado en el archivo
 * @returns {Object} - Issue creado
 */
export function addExportMismatchIssue(addIssue, atomId, atomExportStatus, fileExportStatus) {
  return addIssue({
    category: IssueCategory.CONSISTENCY,
    severity: Severity.MEDIUM,
    system: DataSystem.ATOMS,
    path: atomId,
    message: 'Export status mismatch between atom and file',
    expected: `isExported: ${fileExportStatus}`,
    actual: `isExported: ${atomExportStatus}`
  });
}

/**
 * Crea un issue de archivo sin átomos
 * @param {Function} addIssue - Función para agregar issue
 * @param {string} filePath - Path del archivo
 * @param {number} functionCount - Cantidad de funciones
 * @param {Object} classification - Clasificación del archivo
 * @returns {Object|null} - Issue creado o null si no aplica
 */
export function addMissingAtomsIssue(addIssue, filePath, functionCount, classification) {
  if (!classification.extractable) {
    return null;
  }
  
  let severity = Severity.HIGH;
  let suggestion = 'Run atom extraction for this file';
  let note = '';
  
  if (classification.type === 'test') {
    severity = Severity.INFO;
    suggestion = 'Test files - atom extraction optional';
    note = ' (test file)';
  } else if (classification.type === 'script') {
    severity = Severity.MEDIUM;
    suggestion = 'Consider running atom extraction for scripts';
    note = ' (script)';
  }
  
  return addIssue({
    category: IssueCategory.COMPLETENESS,
    severity,
    system: DataSystem.FILES,
    path: filePath,
    message: `File has ${functionCount} functions but no atoms extracted${note}`,
    suggestion,
    metadata: {
      fileType: classification.type,
      priority: classification.priority,
      extractable: classification.extractable
    }
  });
}

/**
 * Crea un issue de conexión con archivo no existente
 * @param {Function} addIssue - Función para agregar issue
 * @param {string} connId - ID de la conexión
 * @param {string} filePath - Path del archivo
 * @param {string} type - 'source' | 'target'
 * @param {boolean} isHistorical - Si es archivo histórico/test
 * @returns {Object} - Issue creado
 */
export function addConnectionNonExistentFileIssue(addIssue, connId, filePath, type, isHistorical = false) {
  if (isHistorical) {
    return addIssue({
      category: IssueCategory.CONSISTENCY,
      severity: Severity.INFO,
      system: DataSystem.CONNECTIONS,
      path: connId,
      message: `Connection references historical/test ${type} (evidence): ${filePath}`
    });
  }
  
  return addIssue({
    category: IssueCategory.CONSISTENCY,
    severity: Severity.HIGH,
    system: DataSystem.CONNECTIONS,
    path: connId,
    message: `Connection references non-existent ${type} file: ${filePath}`
  });
}
