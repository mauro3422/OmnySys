/**
 * @fileoverview Atoms-Files Validator
 * 
 * Valida consistencia entre átomos y archivos.
 * Verifica correspondencia bidireccional.
 * 
 * @module consistency/validators/atoms-files-validator
 * @version 1.0.0
 */

import { normalizePath, classifyFile } from '../../../utils/path-utils.js';
import { findFileByPath, isHistoricalOrTestFile } from '../utils/path-utils.js';
import { IssueManager } from '../issue-manager/index.js';
import { createLogger } from '../../../../../utils/logger.js';

const logger = createLogger('OmnySys:consistency:atoms-files');

/**
 * Atoms-Files Validator
 */
export class AtomsFilesValidator {
  constructor(cache, issueManager) {
    this.cache = cache;
    this.issues = issueManager || new IssueManager();
  }
  
  /**
   * Valida consistencia entre átomos y archivos
   * @returns {Array} - Issues encontrados
   */
  validate() {
    logger.debug('Validating atoms <-> files consistency...');
    
    // Verificar que cada átomo tenga su archivo
    this.validateAtomsHaveFiles();
    
    // Verificar que archivos con funciones tengan átomos
    this.validateFilesHaveAtoms();
    
    return this.issues.getIssues();
  }
  
  /**
   * Valida que cada átomo tenga su archivo correspondiente
   * @private
   */
  validateAtomsHaveFiles() {
    for (const [atomId, atom] of this.cache.atoms) {
      const filePath = normalizePath(atom.filePath);
      const fileData = findFileByPath(filePath, this.cache.files);
      
      if (!fileData) {
        // Si es archivo de test o histórico, es evidencia no error
        const isHistorical = isHistoricalOrTestFile(filePath);
        this.issues.addNonExistentFileIssue(atomId, filePath, isHistorical);
        continue;
      }
      
      // Verificar que la función exista en el archivo
      this.validateFunctionExists(atom, atomId, fileData);
      
      // Verificar isExported coincida
      this.validateExportStatus(atom, atomId, fileData);
    }
  }
  
  /**
   * Valida que la función del átomo exista en el archivo
   * @private
   */
  validateFunctionExists(atom, atomId, fileData) {
    const definitions = fileData.definitions || [];
    const funcDef = definitions.find(d => d.name === atom.name && d.type === 'function');
    
    if (!funcDef) {
      this.issues.addFunctionNotFoundIssue(
        atomId, 
        atom.name, 
        definitions
      );
    }
  }
  
  /**
   * Valida que el estado de export coincida entre átomo y archivo
   * @private
   */
  validateExportStatus(atom, atomId, fileData) {
    const exportDef = fileData.exports?.find(e => e.name === atom.name);
    const isExportedInFile = !!exportDef;
    
    if (atom.isExported !== isExportedInFile) {
      this.issues.addExportMismatchIssue(atomId, atom.isExported, isExportedInFile);
    }
  }
  
  /**
   * Valida que archivos con funciones tengan átomos correspondientes
   * @private
   */
  validateFilesHaveAtoms() {
    for (const [filePath, fileData] of this.cache.files) {
      const definitions = fileData.definitions || [];
      const funcDefs = definitions.filter(d => d.type === 'function');
      
      if (funcDefs.length === 0) {
        continue; // No hay funciones, no necesita átomos
      }
      
      // Contar átomos para este archivo
      const fileAtoms = this.findAtomsForFile(filePath);
      
      if (fileAtoms.length === 0) {
        // Usar clasificación inteligente del archivo
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
   * Encuentra átomos para un archivo específico
   * @private
   */
  findAtomsForFile(filePath) {
    return Array.from(this.cache.atoms.values())
      .filter(a => normalizePath(a.filePath) === filePath);
  }
  
  /**
   * Obtiene estadísticas de validación
   * @returns {Object} - Estadísticas
   */
  getStats() {
    const issues = this.issues.getIssues();
    return {
      orphanedAtoms: issues.filter(i => 
        i.message.includes('non-existent file')
      ).length,
      orphanedFiles: issues.filter(i =>
        i.message.includes('no atoms')
      ).length,
      exportMismatches: issues.filter(i =>
        i.message.includes('Export status mismatch')
      ).length
    };
  }
}

export default AtomsFilesValidator;
