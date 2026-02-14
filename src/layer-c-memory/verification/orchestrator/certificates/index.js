/**
 * @fileoverview Certificates Module - Exportaciones de certificados
 * 
 * @module verification/orchestrator/certificates
 */

export { 
  generateCertificate,
  generateCertificateId,
  calculateValidity,
  calculateHash,
  isCertificateValid,
  canGenerateCertificate
} from './certificate-generator.js';
