/**
 * @fileoverview Verification Orchestrator - Orquestador de verificación
 * 
 * Orquesta todo el proceso de verificación y certificación.
 * Coordina validadores, genera reportes y emite certificados.
 * 
 * @module verification/orchestrator
 */

import { IntegrityValidator } from '../validators/integrity-validator.js';
import { ConsistencyValidator } from '../validators/consistency-validator.js';
import { VerificationStatus } from '../types/index.js';
import { createLogger } from '../../../utils/logger.js';
import { generateReport } from './reporters/report-generator.js';
import { generateCertificate, canGenerateCertificate } from './certificates/certificate-generator.js';
import { getQuickStatus } from './status/status-checker.js';

const logger = createLogger('OmnySys:verification:orchestrator');

/**
 * Orquestador de verificación
 */
export class VerificationOrchestrator {
  constructor(projectPath, options = {}) {
    this.projectPath = projectPath;
    this.options = {
      checkIntegrity: true,
      checkConsistency: true,
      generateCertificate: true,
      outputFormat: 'json',
      ...options
    };
    
    this.validators = [];
    this.results = [];
  }

  /**
   * Ejecuta verificación completa
   * @returns {Promise<Object>} Resultado de la verificación
   */
  async verify() {
    logger.info('🔍 Starting comprehensive verification...');
    const startTime = Date.now();
    
    // 1. Registrar validadores
    this.registerValidators();
    
    // 2. Ejecutar validaciones
    await this.runValidations();
    
    // 3. Generar reporte consolidado
    const report = generateReport(this.results, this.validators, this.projectPath, startTime);
    
    // 4. Generar certificado si corresponde
    const certificate = await this.maybeGenerateCertificate(report);
    
    logger.info(`✅ Verification complete in ${Date.now() - startTime}ms`);
    
    return {
      report,
      certificate,
      passed: report.status === VerificationStatus.PASSED
    };
  }

  /**
   * Registra los validadores según configuración
   */
  registerValidators() {
    if (this.options.checkIntegrity) {
      this.validators.push(new IntegrityValidator(this.projectPath));
      logger.debug('Registered: IntegrityValidator');
    }
    
    if (this.options.checkConsistency) {
      this.validators.push(new ConsistencyValidator(this.projectPath));
      logger.debug('Registered: ConsistencyValidator');
    }
  }

  /**
   * Ejecuta todas las validaciones registradas
   */
  async runValidations() {
    for (const validator of this.validators) {
      try {
        const result = await validator.validate();
        this.results.push(result);
      } catch (error) {
        logger.error(`Validator failed: ${error.message}`);
        this.results.push({
          status: VerificationStatus.FAILED,
          error: error.message,
          issues: []
        });
      }
    }
  }

  /**
   * Genera certificado si las condiciones lo permiten
   * @param {Object} report - Reporte de verificación
   * @returns {Promise<Object|null>} Certificado o null
   */
  async maybeGenerateCertificate(report) {
    if (!this.options.generateCertificate) {
      return null;
    }
    
    if (!canGenerateCertificate(report)) {
      logger.info('⚠️ Certificate not generated: critical issues found or verification failed');
      return null;
    }
    
    const certificate = await generateCertificate(report, this.projectPath);
    
    if (report.status === VerificationStatus.WARNING) {
      logger.warn('⚠️ Certificate generated with WARNING status (non-critical issues present)');
    }
    
    return certificate;
  }

  /**
   * Obtiene resumen rápido del estado
   * @returns {Object} Estado rápido
   */
  getQuickStatus() {
    return getQuickStatus(this.results);
  }
}

export default VerificationOrchestrator;
