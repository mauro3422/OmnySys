import { statsPool } from '../../../../../shared/utils/stats-pool.js';
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
getStats() {
    return statsPool.getStats('path-validator');
  }}

export default PathValidator;

