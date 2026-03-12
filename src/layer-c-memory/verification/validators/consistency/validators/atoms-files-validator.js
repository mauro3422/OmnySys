/**
 * @fileoverview Atoms-Files Validator
 *
 * Valida consistencia entre atomos y archivos.
 * Verifica correspondencia bidireccional.
 *
 * @module consistency/validators/atoms-files-validator
 * @version 1.0.0
 */

import { normalizePath, classifyFile } from '../../../utils/path-utils.js';
import { findFileByPath, isHistoricalOrTestFile } from '../utils/path-utils.js';
import { BaseConsistencyValidator } from './base-consistency-validator.js';
import { createLogger } from '../../../../../utils/logger.js';

const logger = createLogger('OmnySys:consistency:atoms-files');

/**
 * Atoms-Files Validator
 */
export class AtomsFilesValidator extends BaseConsistencyValidator {
  constructor(cache, issueManager) {
    super(cache, issueManager, 'atoms-files-validator');
  }

  /**
   * Valida consistencia entre atomos y archivos
   * @returns {Array} - Issues encontrados
   */
  validate() {
    logger.debug('Validating atoms <-> files consistency...');

    this.validateAtomsHaveFiles();
    this.validateFilesHaveAtoms();

    return this.issues.getIssues();
  }

  /**
   * Valida que cada atomo tenga su archivo correspondiente
   * @private
   */
  validateAtomsHaveFiles() {
    for (const [atomId, atom] of this.cache.atoms) {
      const filePath = normalizePath(atom.filePath);
      const fileData = findFileByPath(filePath, this.cache.files);

      if (!fileData) {
        const isHistorical = isHistoricalOrTestFile(filePath);
        this.issues.addNonExistentFileIssue(atomId, filePath, isHistorical);
        continue;
      }

      this.validateFunctionExists(atom, atomId, fileData);
      this.validateExportStatus(atom, atomId, fileData);
    }
  }

  /**
   * Valida que la funcion del atomo exista en el archivo
   * @private
   */
  validateFunctionExists(atom, atomId, fileData) {
    const definitions = fileData.definitions || [];
    const funcDef = definitions.find((definition) =>
      definition.name === atom.name && definition.type === 'function'
    );

    if (!funcDef) {
      this.issues.addFunctionNotFoundIssue(atomId, atom.name, definitions);
    }
  }

  /**
   * Valida que el estado de export coincida entre atomo y archivo
   * @private
   */
  validateExportStatus(atom, atomId, fileData) {
    const exportDef = fileData.exports?.find((exp) => exp.name === atom.name);
    const isExportedInFile = !!exportDef;

    if (atom.isExported !== isExportedInFile) {
      this.issues.addExportMismatchIssue(atomId, atom.isExported, isExportedInFile);
    }
  }

  /**
   * Valida que archivos con funciones tengan atomos correspondientes
   * @private
   */
  validateFilesHaveAtoms() {
    for (const [filePath, fileData] of this.cache.files) {
      const definitions = fileData.definitions || [];
      const funcDefs = definitions.filter((definition) => definition.type === 'function');

      if (funcDefs.length === 0) {
        continue;
      }

      const fileAtoms = this.findAtomsForFile(filePath);

      if (fileAtoms.length === 0) {
        const classification = classifyFile(filePath);
        this.issues.addMissingAtomsIssue(filePath, funcDefs.length, classification);
      } else if (fileAtoms.length !== funcDefs.length) {
        this.issues.addIssue({
          category: 'CONSISTENCY',
          severity: 'MEDIUM',
          system: 'FILES',
          path: filePath,
          message: 'Atom count mismatch',
          expected: `${funcDefs.length} atoms`,
          actual: `${fileAtoms.length} atoms`
        });
      }
    }
  }

  /**
   * Encuentra atomos para un archivo especifico
   * @private
   */
  findAtomsForFile(filePath) {
    return Array.from(this.cache.atoms.values())
      .filter((atom) => normalizePath(atom.filePath) === filePath);
  }
}

export default AtomsFilesValidator;
