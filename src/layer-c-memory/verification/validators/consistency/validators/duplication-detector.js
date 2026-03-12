/**
 * @fileoverview Duplication Detector
 *
 * Detecta duplicacion de datos entre sistemas.
 * Verifica consistencia de informacion duplicada.
 *
 * @module consistency/validators/duplication-detector
 * @version 1.0.0
 */

import { BaseConsistencyValidator } from './base-consistency-validator.js';
import { createLogger } from '../../../../../utils/logger.js';

const logger = createLogger('OmnySys:consistency:duplication');

/**
 * Duplication Detector
 */
export class DuplicationDetector extends BaseConsistencyValidator {
  constructor(cache, issueManager) {
    super(cache, issueManager, 'duplication-detector');
  }

  /**
   * Detecta duplicacion de datos
   * @returns {Array} - Issues encontrados
   */
  detect() {
    logger.debug('Detecting data duplication...');

    this.detectExportDuplication();
    this.detectMetadataDuplication();

    return this.issues.getIssues();
  }

  /**
   * Detecta duplicacion de informacion de exports
   * @private
   */
  detectExportDuplication() {
    for (const [filePath, fileData] of this.cache.files) {
      const exportsInFile = fileData.exports || [];

      for (const exp of exportsInFile) {
        const atomId = `${filePath}::${exp.name}`;
        const atom = this.cache.atoms.get(atomId);

        if (atom) {
          this.validateExportConsistency(atom, atomId, exp);
        }
      }
    }
  }

  /**
   * Valida consistencia de datos de export
   * @private
   */
  validateExportConsistency(atom, atomId, exportDef) {
    if (atom.isExported !== true) {
      this.issues.addIssue({
        category: 'CONSISTENCY',
        severity: 'LOW',
        system: 'ATOMS',
        path: atomId,
        message: 'Export information duplicated but inconsistent',
        expected: true,
        actual: atom.isExported,
        metadata: {
          atomHas: atom.isExported,
          fileHas: true
        }
      });
    }

    if (atom.name !== exportDef.name) {
      this.issues.addIssue({
        category: 'CONSISTENCY',
        severity: 'MEDIUM',
        system: 'ATOMS',
        path: atomId,
        message: 'Export name mismatch between atom and file',
        expected: exportDef.name,
        actual: atom.name
      });
    }
  }

  /**
   * Detecta duplicacion de metadata
   * @private
   */
  detectMetadataDuplication() {
    const atomIds = new Map();

    for (const [atomId, atom] of this.cache.atoms) {
      if (atomIds.has(atomId)) {
        this.issues.addIssue({
          category: 'CONSISTENCY',
          severity: 'HIGH',
          system: 'ATOMS',
          path: atomId,
          message: 'Duplicate atom ID detected',
          suggestion: 'Remove duplicate atom entry'
        });
      } else {
        atomIds.set(atomId, atom);
      }
    }

    const filePaths = new Map();

    for (const [filePath, fileData] of this.cache.files) {
      const normalizedPath = (fileData.path || filePath).toLowerCase();

      if (filePaths.has(normalizedPath)) {
        this.issues.addIssue({
          category: 'CONSISTENCY',
          severity: 'HIGH',
          system: 'FILES',
          path: filePath,
          message: 'Duplicate file entry detected',
          suggestion: 'Remove duplicate file entry'
        });
      } else {
        filePaths.set(normalizedPath, fileData);
      }
    }
  }
}

export default DuplicationDetector;
