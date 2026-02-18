/**
 * @fileoverview Duplication Detector
 * 
 * Detecta duplicación de datos entre sistemas.
 * Verifica consistencia de información duplicada.
 * 
 * @module consistency/validators/duplication-detector
 * @version 1.0.0
 */

import { IssueManager } from '../issue-manager/index.js';
import { createLogger } from '../../../../../utils/logger.js';

const logger = createLogger('OmnySys:consistency:duplication');

/**
 * Duplication Detector
 */
export class DuplicationDetector {
  constructor(cache, issueManager) {
    this.cache = cache;
    this.issues = issueManager || new IssueManager();
  }
  
  /**
   * Detecta duplicación de datos
   * @returns {Array} - Issues encontrados
   */
  detect() {
    logger.debug('Detecting data duplication...');
    
    // Verificar duplicación de información de exports
    this.detectExportDuplication();
    
    // Verificar duplicación de metadata
    this.detectMetadataDuplication();
    
    return this.issues.getIssues();
  }
  
  /**
   * Detecta duplicación de información de exports
   * @private
   */
  detectExportDuplication() {
    for (const [filePath, fileData] of this.cache.files) {
      const exportsInFile = fileData.exports || [];
      
      for (const exp of exportsInFile) {
        // Buscar átomo correspondiente
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
    // Verificar duplicación de datos básicos
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
    
    // Verificar nombre coincida
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
   * Detecta duplicación de metadata
   * @private
   */
  detectMetadataDuplication() {
    // Detectar átomos duplicados (mismo ID)
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
    
    // Detectar archivos duplicados (mismo path)
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
  
  /**
   * Obtiene estadísticas de duplicación
   * @returns {Object} - Estadísticas
   */
  getStats() {
    const issues = this.issues.getIssues();
    return {
      exportInconsistencies: issues.filter(i => 
        i.message?.includes('Export information duplicated')
      ).length,
      duplicateAtoms: issues.filter(i =>
        i.message?.includes('Duplicate atom ID')
      ).length,
      duplicateFiles: issues.filter(i =>
        i.message?.includes('Duplicate file entry')
      ).length
    };
  }
}

export default DuplicationDetector;
