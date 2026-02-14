/**
 * @fileoverview Issue Manager
 * 
 * Gestiona la creación, almacenamiento y consulta de issues de consistencia.
 * Centraliza la lógica de creación de issues para mantener consistencia.
 * 
 * @module consistency/issue-manager/issue-manager
 * @version 1.0.0
 */

import { Severity, IssueCategory, DataSystem } from '../../../types/index.js';

/**
 * Issue Manager - Gestiona issues de consistencia
 */
export class IssueManager {
  constructor() {
    this.issues = [];
    this.issueCounter = 0;
  }
  
  /**
   * Agrega un issue
   * @param {Object} params - Parámetros del issue
   * @returns {Object} - Issue creado
   */
  addIssue({ 
    category, 
    severity, 
    system, 
    path, 
    message, 
    expected, 
    actual, 
    suggestion, 
    metadata 
  }) {
    const issue = {
      id: `consistency-${Date.now()}-${this.issueCounter++}`,
      category,
      severity,
      system,
      path,
      message,
      expected,
      actual,
      suggestion,
      metadata,
      timestamp: new Date().toISOString()
    };
    
    this.issues.push(issue);
    return issue;
  }
  
  /**
   * Crea un issue de archivo no existente
   * @param {string} atomId - ID del átomo
   * @param {string} filePath - Path del archivo
   * @param {boolean} isHistorical - Si es archivo histórico/test
   * @returns {Object} - Issue creado
   */
  addNonExistentFileIssue(atomId, filePath, isHistorical = false) {
    if (isHistorical) {
      return this.addIssue({
        category: IssueCategory.CONSISTENCY,
        severity: Severity.INFO,
        system: DataSystem.ATOMS,
        path: atomId,
        message: `Atom references historical/test file (evidence): ${filePath}`,
        suggestion: 'Historical metadata preserved for reference'
      });
    }
    
    return this.addIssue({
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
   * @param {string} atomId - ID del átomo
   * @param {string} functionName - Nombre de la función
   * @param {Array} availableDefinitions - Definiciones disponibles
   * @returns {Object} - Issue creado
   */
  addFunctionNotFoundIssue(atomId, functionName, availableDefinitions) {
    return this.addIssue({
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
   * @param {string} atomId - ID del átomo
   * @param {boolean} atomExportStatus - Estado en el átomo
   * @param {boolean} fileExportStatus - Estado en el archivo
   * @returns {Object} - Issue creado
   */
  addExportMismatchIssue(atomId, atomExportStatus, fileExportStatus) {
    return this.addIssue({
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
   * @param {string} filePath - Path del archivo
   * @param {number} functionCount - Cantidad de funciones
   * @param {Object} classification - Clasificación del archivo
   * @returns {Object|null} - Issue creado o null si no aplica
   */
  addMissingAtomsIssue(filePath, functionCount, classification) {
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
    
    return this.addIssue({
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
   * @param {string} connId - ID de la conexión
   * @param {string} filePath - Path del archivo
   * @param {string} type - 'source' | 'target'
   * @param {boolean} isHistorical - Si es archivo histórico/test
   * @returns {Object} - Issue creado
   */
  addConnectionNonExistentFileIssue(connId, filePath, type, isHistorical = false) {
    if (isHistorical) {
      return this.addIssue({
        category: IssueCategory.CONSISTENCY,
        severity: Severity.INFO,
        system: DataSystem.CONNECTIONS,
        path: connId,
        message: `Connection references historical/test ${type} (evidence): ${filePath}`
      });
    }
    
    return this.addIssue({
      category: IssueCategory.CONSISTENCY,
      severity: Severity.HIGH,
      system: DataSystem.CONNECTIONS,
      path: connId,
      message: `Connection references non-existent ${type} file: ${filePath}`
    });
  }
  
  /**
   * Obtiene todos los issues
   * @returns {Array} - Lista de issues
   */
  getIssues() {
    return [...this.issues];
  }
  
  /**
   * Filtra issues por severidad
   * @param {string} severity - Severidad a filtrar
   * @returns {Array} - Issues filtrados
   */
  getIssuesBySeverity(severity) {
    return this.issues.filter(i => i.severity === severity);
  }
  
  /**
   * Filtra issues por categoría
   * @param {string} category - Categoría a filtrar
   * @returns {Array} - Issues filtrados
   */
  getIssuesByCategory(category) {
    return this.issues.filter(i => i.category === category);
  }
  
  /**
   * Cuenta issues por severidad
   * @returns {Object} - Conteo por severidad
   */
  countBySeverity() {
    const counts = {};
    for (const issue of this.issues) {
      counts[issue.severity] = (counts[issue.severity] || 0) + 1;
    }
    return counts;
  }
  
  /**
   * Cuenta issues por sistema
   * @returns {Object} - Conteo por sistema
   */
  countBySystem() {
    const counts = {};
    for (const issue of this.issues) {
      counts[issue.system] = (counts[issue.system] || 0) + 1;
    }
    return counts;
  }
  
  /**
   * Limpia todos los issues
   */
  clear() {
    this.issues = [];
    this.issueCounter = 0;
  }
  
  /**
   * Verifica si hay issues críticos
   * @returns {boolean} - True si hay issues críticos
   */
  hasCriticalIssues() {
    return this.issues.some(i => i.severity === Severity.CRITICAL);
  }
  
  /**
   * Calcula estadísticas de issues
   * @returns {Object} - Estadísticas
   */
  calculateStats() {
    return {
      total: this.issues.length,
      bySeverity: this.countBySeverity(),
      bySystem: this.countBySystem(),
      atomsFilesMismatch: this.issues.filter(i => 
        i.category === IssueCategory.CONSISTENCY && 
        i.system === DataSystem.ATOMS
      ).length,
      missingFiles: this.issues.filter(i =>
        i.message.includes('non-existent file')
      ).length,
      pathIssues: this.issues.filter(i =>
        i.category === IssueCategory.STRUCTURE
      ).length
    };
  }
  
  /**
   * Genera resumen de issues
   * @param {Object} cache - Cache de datos
   * @returns {Object} - Resumen
   */
  generateSummary(cache) {
    return {
      totalIssues: this.issues.length,
      totalAtoms: cache.atoms?.size || 0,
      totalFiles: cache.files?.size || 0,
      totalConnections: cache.connections?.length || 0,
      orphanedAtoms: this.issues.filter(i => 
        i.message.includes('non-existent file')
      ).length,
      orphanedFiles: this.issues.filter(i =>
        i.message.includes('no atoms')
      ).length,
      bySeverity: this.countBySeverity()
    };
  }
}

export default IssueManager;
