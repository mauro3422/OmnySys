/**
 * @fileoverview Path Validator
 *
 * Valida consistencia de formatos de path.
 * Detecta inconsistencias entre atomos y archivos.
 *
 * @module consistency/validators/path-validator
 * @version 1.0.0
 */

import { checkPathFormatConsistency } from '../utils/path-utils.js';
import { BaseConsistencyValidator } from './base-consistency-validator.js';
import { createLogger } from '../../../../../utils/logger.js';

const logger = createLogger('OmnySys:consistency:path');

/**
 * Path Validator
 */
export class PathValidator extends BaseConsistencyValidator {
  constructor(cache, issueManager) {
    super(cache, issueManager, 'path-validator');
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
}

export default PathValidator;
