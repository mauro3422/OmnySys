/**
 * @fileoverview Certificate Generator - Generación de certificados de verificación
 * 
 * Responsabilidad Única (SRP): Generar certificados de verificación válidos.
 * 
 * @module verification/orchestrator/certificates
 */

import { createHash } from 'crypto';
import { createLogger } from '../../../../utils/logger.js';

const logger = createLogger('OmnySys:verification:certificates');

/**
 * Certificado de verificación
 * @typedef {Object} VerificationCertificate
 * @property {string} id - ID único del certificado
 * @property {string} projectPath - Path del proyecto
 * @property {string} issuedAt - Fecha de emisión
 * @property {string} validUntil - Fecha de vencimiento
 * @property {string} status - Estado de la verificación
 * @property {string} version - Versión del certificado
 * @property {Object} metrics - Métricas del proyecto
 * @property {string} hash - Hash del reporte
 * @property {Array} signatures - Validadores que firmaron
 */

/**
 * Genera certificado de verificación
 * 
 * @param {Object} report - Reporte de verificación
 * @param {string} projectPath - Path del proyecto
 * @returns {Promise<VerificationCertificate>} Certificado generado
 */
export async function generateCertificate(report, projectPath) {
  logger.info('📜 Generating verification certificate...');
  
  const certificate = {
    id: generateCertificateId(report, projectPath),
    projectPath,
    issuedAt: new Date().toISOString(),
    validUntil: calculateValidity(),
    status: report.status,
    version: '1.0.0',
    metrics: {
      totalFiles: report.stats.bySystem.files || 0,
      totalAtoms: report.stats.bySystem.atoms || 0,
      totalConnections: report.stats.bySystem.connections || 0,
      issuesFound: report.stats.totalIssues
    },
    hash: calculateHash(report),
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
 * 
 * @param {Object} report - Reporte de verificación
 * @param {string} projectPath - Path del proyecto
 * @returns {string} ID único
 */
export function generateCertificateId(report, projectPath) {
  const timestamp = Date.now();
  const hash = createHash('md5')
    .update(`${projectPath}-${timestamp}`)
    .digest('hex')
    .substring(0, 8);
  return `cert-${timestamp}-${hash}`;
}

/**
 * Calcula fecha de validez del certificado
 * @returns {string} Fecha de vencimiento en ISO format
 */
export function calculateValidity() {
  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + 7); // Válido por 7 días
  return validUntil.toISOString();
}

/**
 * Calcula hash del reporte
 * 
 * @param {Object} report - Reporte de verificación
 * @returns {string} Hash SHA256
 */
export function calculateHash(report) {
  const data = JSON.stringify({
    projectPath: report.projectPath,
    timestamp: report.timestamp,
    status: report.status,
    stats: report.stats
  });
  
  return createHash('sha256').update(data).digest('hex');
}

/**
 * Verifica si un certificado es válido
 * 
 * @param {VerificationCertificate} certificate - Certificado a verificar
 * @returns {boolean} true si es válido
 */
export function isCertificateValid(certificate) {
  if (!certificate || !certificate.validUntil) {
    return false;
  }
  
  const now = new Date();
  const validUntil = new Date(certificate.validUntil);
  
  return now < validUntil;
}

/**
 * Verifica si se puede generar certificado basado en el reporte
 * 
 * @param {Object} report - Reporte de verificación
 * @returns {boolean} true si se puede generar certificado
 */
export function canGenerateCertificate(report) {
  const hasCriticalIssues = report.issues.some(i => i.severity === 'critical');
  
  return report.status === 'passed' || 
         (report.status === 'warning' && !hasCriticalIssues);
}
