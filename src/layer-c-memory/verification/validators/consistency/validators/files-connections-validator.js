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
import { BaseConsistencyValidator } from './base-consistency-validator.js';
import { createLogger } from '../../../../../utils/logger.js';

const logger = createLogger('OmnySys:consistency:files-connections');

/**
 * Files-Connections Validator
 */
export class FilesConnectionsValidator extends BaseConsistencyValidator {
  constructor(cache, issueManager) {
    super(cache, issueManager, 'files-connections-validator');
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
   * Valida una conexion especifica
   * @private
   */
  validateConnection(conn) {
    const sourceFile = normalizePath(conn.sourceFile);
    const targetFile = normalizePath(conn.targetFile);

    this.validateReferencedFileExists(conn, sourceFile, 'source');
    this.validateReferencedFileExists(conn, targetFile, 'target');

    if (this.fileExists(sourceFile) && this.fileExists(targetFile)) {
      this.validateBidirectionality(conn, sourceFile, targetFile);
    }
  }

  /**
   * Valida que un archivo de conexion exista
   * @private
   */
  validateReferencedFileExists(conn, filePath, type) {
    if (this.fileExists(filePath)) {
      return;
    }

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

    const targetUsedBy = targetData.usedBy || [];
    const sourceInUsedBy = targetUsedBy.some((usedBy) =>
      normalizePath(usedBy) === sourceFile
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
}

export default FilesConnectionsValidator;
