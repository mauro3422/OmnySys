/**
 * @fileoverview Files-Connections Validator
 * 
 * Valida consistencia entre archivos y conexiones.
 * Verifica que todas las conexiones referencien archivos existentes.
 * 
 * @module consistency/validators/files-connections-validator
 * @version 1.0.0
 */

import { normalizePath } from '../../../utils/path-utils.js';
import { findFileByPath, isHistoricalOrTestFile } from '../utils/path-utils.js';
import { IssueManager } from '../issue-manager/index.js';
import { createLogger } from '../../../../../utils/logger.js';

const logger = createLogger('OmnySys:consistency:files-connections');

/**
 * Files-Connections Validator
 */
export class FilesConnectionsValidator {
  constructor(cache, issueManager) {
    this.cache = cache;
    this.issues = issueManager || new IssueManager();
  }
  
  /**
   * Valida consistencia entre archivos y conexiones
   * @returns {Array} - Issues encontrados
   */
  validate() {
    logger.debug('Validating files <-> connections consistency...');
    
    for (const conn of this.cache.connections) {
      this.validateConnection(conn);
    }
    
    return this.issues.getIssues();
  }
  
  /**
   * Valida una conexión específica
   * @private
   */
  validateConnection(conn) {
    const sourceFile = normalizePath(conn.sourceFile);
    const targetFile = normalizePath(conn.targetFile);
    
    // Validar source file
    this.validateConnectionFile(conn, sourceFile, 'source');
    
    // Validar target file
    this.validateConnectionFile(conn, targetFile, 'target');
    
    // Verificar bidireccionalidad si ambos archivos existen
    if (this.fileExists(sourceFile) && this.fileExists(targetFile)) {
      this.validateBidirectionality(conn, sourceFile, targetFile);
    }
  }
  
  /**
   * Valida que un archivo de conexión exista
   * @private
   */
  validateConnectionFile(conn, filePath, type) {
    if (this.fileExists(filePath)) {
      return; // Todo bien
    }
    
    // Verificar si es archivo histórico/test
    const isHistorical = isHistoricalOrTestFile(filePath);
    this.issues.addConnectionNonExistentFileIssue(
      conn.id,
      filePath,
      type,
      isHistorical
    );
  }
  
  /**
   * Verifica si un archivo existe en el cache
   * @private
   */
  fileExists(filePath) {
    return !!findFileByPath(filePath, this.cache.files);
  }
  
  /**
   * Valida bidireccionalidad de conexiones
   * @private
   */
  validateBidirectionality(conn, sourceFile, targetFile) {
    const targetData = findFileByPath(targetFile, this.cache.files);
    
    if (!targetData) return;
    
    // Verificar que source esté en usedBy de target
    const targetUsedBy = targetData.usedBy || [];
    const sourceInUsedBy = targetUsedBy.some(u => 
      normalizePath(u) === sourceFile
    );
    
    if (!sourceInUsedBy) {
      this.issues.addIssue({
        category: 'COHERENCE',
        severity: 'MEDIUM',
        system: 'FILES',
        path: targetFile,
        message: 'Connection exists but not reflected in usedBy',
        suggestion: 'Update file metadata to include connection'
      });
    }
  }
  
  /**
   * Obtiene estadísticas de validación
   * @returns {Object} - Estadísticas
   */
  getStats() {
    const issues = this.issues.getIssues();
    return {
      missingSourceFiles: issues.filter(i => 
        i.message?.includes('non-existent source file')
      ).length,
      missingTargetFiles: issues.filter(i => 
        i.message?.includes('non-existent target file')
      ).length,
      bidirectionalityIssues: issues.filter(i =>
        i.message?.includes('not reflected in usedBy')
      ).length
    };
  }
}

export default FilesConnectionsValidator;
