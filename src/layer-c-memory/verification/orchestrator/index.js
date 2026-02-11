/**
 * @fileoverview verification-orchestrator.js
 * 
 * Orquesta todo el proceso de verificación y certificación
 * Coordina validadores, genera reportes y emite certificados
 * 
 * @module verification/orchestrator
 */

import path from 'path';
import { createHash } from 'crypto';
import { IntegrityValidator } from '../validators/integrity-validator.js';
import { ConsistencyValidator } from '../validators/consistency-validator.js';
import { VerificationStatus, Severity } from '../types/index.js';
import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('OmnySys:verification:orchestrator');

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
   */
  async verify() {
    logger.info('🔍 Starting comprehensive verification...');
    const startTime = Date.now();
    
    // 1. Registrar validadores
    this.registerValidators();
    
    // 2. Ejecutar validaciones
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
    
    // 3. Generar reporte consolidado
    const report = this.generateReport(startTime);
    
    // 4. Generar certificado si pasó o está en warning (sin críticos)
    let certificate = null;
    const canGenerateCert = report.status === VerificationStatus.PASSED || 
                           (report.status === VerificationStatus.WARNING && 
                            !report.issues.some(i => i.severity === 'critical'));
    
    if (this.options.generateCertificate && canGenerateCert) {
      certificate = await this.generateCertificate(report);
      if (report.status === VerificationStatus.WARNING) {
        logger.warn('⚠️  Certificate generated with WARNING status (non-critical issues present)');
      }
    }
    
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
   * Genera reporte consolidado
   */
  generateReport(startTime) {
    const allIssues = this.results.flatMap(r => r.issues || []);
    
    // Determinar estado general
    let status = VerificationStatus.PASSED;
    if (allIssues.some(i => i.severity === Severity.CRITICAL)) {
      status = VerificationStatus.FAILED;
    } else if (allIssues.length > 0) {
      status = VerificationStatus.WARNING;
    }
    
    // Agrupar issues por severidad
    const bySeverity = {
      critical: allIssues.filter(i => i.severity === Severity.CRITICAL).length,
      high: allIssues.filter(i => i.severity === Severity.HIGH).length,
      medium: allIssues.filter(i => i.severity === Severity.MEDIUM).length,
      low: allIssues.filter(i => i.severity === Severity.LOW).length,
      info: allIssues.filter(i => i.severity === Severity.INFO).length
    };
    
    // Agrupar por sistema
    const bySystem = {};
    allIssues.forEach(issue => {
      bySystem[issue.system] = (bySystem[issue.system] || 0) + 1;
    });
    
    // Generar resumen
    const summary = this.generateSummary(allIssues);
    
    return {
      projectPath: this.projectPath,
      timestamp: new Date().toISOString(),
      duration: Date.now() - startTime,
      status,
      summary,
      stats: {
        totalIssues: allIssues.length,
        bySeverity,
        bySystem,
        validatorsRun: this.validators.length
      },
      issues: allIssues,
      validatorResults: this.results.map(r => ({
        status: r.status,
        issueCount: (r.issues || []).length,
        stats: r.stats || {}
      }))
    };
  }

  /**
   * Genera resumen ejecutivo
   */
  generateSummary(allIssues) {
    const criticalCount = allIssues.filter(i => i.severity === Severity.CRITICAL).length;
    const highCount = allIssues.filter(i => i.severity === Severity.HIGH).length;
    
    let message = '';
    if (criticalCount > 0) {
      message = `❌ CRITICAL: ${criticalCount} critical issues found. System integrity compromised.`;
    } else if (highCount > 0) {
      message = `⚠️ WARNING: ${highCount} high severity issues found. SSOT violations detected.`;
    } else if (allIssues.length > 0) {
      message = `ℹ️ INFO: ${allIssues.length} minor issues found. System functional but has inconsistencies.`;
    } else {
      message = `✅ PASSED: All systems verified. Data integrity and consistency confirmed.`;
    }
    
    return {
      message,
      recommendations: this.generateRecommendations(allIssues)
    };
  }

  /**
   * Genera recomendaciones basadas en issues
   */
  generateRecommendations(allIssues) {
    const recommendations = [];
    
    // Detectar patrones de issues
    const hasPathIssues = allIssues.some(i => 
      i.category === 'structure' && i.message.includes('path')
    );
    
    const hasMissingAtoms = allIssues.some(i =>
      i.message.includes('no atoms')
    );
    
    const hasOrphanedAtoms = allIssues.some(i =>
      i.message.includes('non-existent file')
    );
    
    if (hasPathIssues) {
      recommendations.push({
        priority: 'high',
        action: 'Normalize all paths to relative format with forward slashes',
        reason: 'Path inconsistencies break cross-referencing between systems'
      });
    }
    
    if (hasMissingAtoms) {
      recommendations.push({
        priority: 'high',
        action: 'Run atomic extraction for all files',
        reason: 'Missing atoms mean incomplete analysis'
      });
    }
    
    if (hasOrphanedAtoms) {
      recommendations.push({
        priority: 'medium',
        action: 'Clean up orphaned atoms or re-analyze missing files',
        reason: 'Orphaned atoms indicate stale data'
      });
    }
    
    if (allIssues.length === 0) {
      recommendations.push({
        priority: 'low',
        action: 'Schedule regular verification runs',
        reason: 'Prevent future inconsistencies'
      });
    }
    
    return recommendations;
  }

  /**
   * Genera certificado de verificación
   */
  async generateCertificate(report) {
    logger.info('📜 Generating verification certificate...');
    
    const certificate = {
      id: this.generateCertificateId(report),
      projectPath: this.projectPath,
      issuedAt: new Date().toISOString(),
      validUntil: this.calculateValidity(),
      status: report.status,
      version: '1.0.0',
      metrics: {
        totalFiles: report.stats.bySystem.files || 0,
        totalAtoms: report.stats.bySystem.atoms || 0,
        totalConnections: report.stats.bySystem.connections || 0,
        issuesFound: report.stats.totalIssues
      },
      hash: this.calculateHash(report),
      signatures: [
        'integrity-validator',
        'consistency-validator'
      ]
    };
    
    logger.info(`✅ Certificate generated: ${certificate.id}`);
    return certificate;
  }

  /**
   * Genera ID único para certificado
   */
  generateCertificateId(report) {
    const timestamp = Date.now();
    const hash = createHash('md5')
      .update(`${this.projectPath}-${timestamp}`)
      .digest('hex')
      .substring(0, 8);
    return `cert-${timestamp}-${hash}`;
  }

  /**
   * Calcula fecha de validez del certificado
   */
  calculateValidity() {
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 7); // Válido por 7 días
    return validUntil.toISOString();
  }

  /**
   * Calcula hash del reporte
   */
  calculateHash(report) {
    const data = JSON.stringify({
      projectPath: report.projectPath,
      timestamp: report.timestamp,
      status: report.status,
      stats: report.stats
    });
    
    return createHash('sha256').update(data).digest('hex');
  }

  /**
   * Obtiene resumen rápido del estado
   */
  getQuickStatus() {
    const allIssues = this.results.flatMap(r => r.issues || []);
    const critical = allIssues.filter(i => i.severity === Severity.CRITICAL).length;
    const high = allIssues.filter(i => i.severity === Severity.HIGH).length;
    
    if (critical > 0) return { status: 'CRITICAL', emoji: '🔴', count: critical };
    if (high > 0) return { status: 'WARNING', emoji: '🟡', count: high };
    if (allIssues.length > 0) return { status: 'OK', emoji: '🟢', count: allIssues.length };
    return { status: 'PERFECT', emoji: '✅', count: 0 };
  }
}

export default VerificationOrchestrator;
