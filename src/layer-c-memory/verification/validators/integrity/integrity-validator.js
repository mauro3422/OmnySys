/**
 * @fileoverview Integrity Validator - Main Orchestrator
 * 
 * Valida la integridad de los datos:
 * - JSONs bien formados
 * - Campos requeridos presentes
 * - Tipos de datos correctos
 * 
 * @module verification/validators/integrity
 * @version 0.9.4 - Modularizado
 */

import path from 'path';
import { Severity, VerificationStatus } from '../../types/index.js';
import { createLogger } from '../../../../utils/logger.js';
import { IssueManager } from './utils/index.js';
import {
  validateAtoms,
  validateFiles,
  validateConnections,
  validateCache
} from './validators/index.js';

const logger = createLogger('OmnySys:verification:integrity');

/**
 * Valida la integridad de todos los sistemas de datos
 */
export class IntegrityValidator {
  constructor(projectPath) {
    this.projectPath = projectPath;
    this.dataDir = path.join(projectPath, '.omnysysdata');
    this.issueManager = new IssueManager();
  }

  /**
   * Valida la integridad de todos los sistemas
   * @returns {Promise<Object>} Resultado de validación
   */
  async validate() {
    logger.info('🔍 Starting integrity validation...');

    // Validar átomos
    const atomCount = await validateAtoms(
      path.join(this.dataDir, 'atoms'),
      (issue) => this.issueManager.addIssue(issue)
    );
    logger.debug(`✓ Validated ${atomCount} atom files`);

    // Validar archivos
    const fileCount = await validateFiles(
      path.join(this.dataDir, 'files'),
      (issue) => this.issueManager.addIssue(issue)
    );
    logger.debug(`✓ Validated ${fileCount} file JSONs`);

    // Validar conexiones
    await validateConnections(
      path.join(this.dataDir, 'connections'),
      (issue) => this.issueManager.addIssue(issue)
    );

    // Validar cache
    await validateCache(
      path.join(this.dataDir, 'cache'),
      (issue) => this.issueManager.addIssue(issue)
    );

    const issues = this.issueManager.getIssues();
    logger.info(`✅ Integrity validation complete: ${issues.length} issues found`);

    return {
      status: this._determineStatus(issues),
      issues,
      stats: this.issueManager.calculateStats()
    };
  }

  /**
   * Determina el estado de validación basado en los issues
   * @private
   */
  _determineStatus(issues) {
    if (issues.length === 0) return VerificationStatus.PASSED;
    if (issues.some(i => i.severity === Severity.CRITICAL)) return VerificationStatus.FAILED;
    return VerificationStatus.WARNING;
  }
}

export default IntegrityValidator;
