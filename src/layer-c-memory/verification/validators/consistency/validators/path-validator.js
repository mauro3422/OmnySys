/**
 * @fileoverview Path Validator
 * 
 * Valida consistencia de formatos de path.
 * Detecta inconsistencias entre átomos y archivos.
 * 
 * @module consistency/validators/path-validator
 * @version 1.0.0
 */

import { checkPathFormatConsistency } from '../utils/path-utils.js';
import { IssueManager } from '../issue-manager/index.js';
import { createLogger } from '../../../../../utils/logger.js';

const logger = createLogger('OmnySys:consistency:path');

/**
 * Path Validator
 */
export class PathValidator {
  constructor(cache, issueManager) {
    this.cache = cache;
    this.issues = issueManager || new IssueManager();
  }
  
  /**
   * Valida consistencia de paths
   * @returns {Array} - Issues encontrados
   */
  validate() {
    logger.debug('Validating path consistency...');
    
    const inconsistency = checkPathFormatConsistency(
      this.cache.atoms,
      this.cache.files
    );
    
    if (inconsistency) {
      this.issues.addIssue({
        category: 'STRUCTURE',
        severity: 'HIGH',
        system: 'ATOMS',
        path: 'global',
        message: `Inconsistent path formats detected: ${inconsistency.formats.join(', ')}`,
        suggestion: 'Normalize all paths to relative format with forward slashes',
        metadata: {
          formats: inconsistency.formats,
          details: inconsistency.details
        }
      });
    }
    
    return this.issues.getIssues();
  }
  
  /**
   * Obtiene estadísticas de formatos
   * @returns {Promise<Object>} - Estadísticas
   */
  async getStats() {
    const { detectPathFormat } = await import('../utils/path-utils.js');
    const formats = new Map();
    
    // Contar formatos en átomos
    for (const atom of this.cache.atoms.values()) {
      const format = detectPathFormat(atom.filePath);
      formats.set(format, (formats.get(format) || 0) + 1);
    }
    
    // Contar formatos en archivos
    for (const [filePath, fileData] of this.cache.files) {
      const path = fileData.path || filePath;
      const format = detectPathFormat(path);
      formats.set(format, (formats.get(format) || 0) + 1);
    }
    
    return {
      formatCounts: Object.fromEntries(formats),
      uniqueFormats: formats.size,
      isConsistent: formats.size === 1
    };
  }
}

export default PathValidator;
