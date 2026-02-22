/**
 * @fileoverview Verification Contract Definitions
 * 
 * Constantes para tests de contrato de Verification.
 * 
 * @module tests/contracts/layer-c/helpers/verification-definitions
 */

export const ORCHESTRATOR_EXPORTS = [
  'VerificationOrchestrator',
  'generateReport',
  'generateSummary',
  'groupIssuesByCategory',
  'calculateIssueStats',
  'generateRecommendations',
  'prioritizeRecommendations',
  'filterRecommendationsByPriority',
  'generateCertificate',
  'generateCertificateId',
  'calculateValidity',
  'calculateHash',
  'isCertificateValid',
  'canGenerateCertificate',
  'getQuickStatus',
  'determineStatus',
  'countBySeverity',
  'hasCriticalIssues',
  'hasHighSeverityIssues',
  'ValidatorRegistry',
  'globalValidatorRegistry',
  'registerStandardValidators'
];

export const ORCHESTRATOR_METHODS = [
  'verify',
  'registerValidators',
  'runValidations',
  'maybeGenerateCertificate',
  'getQuickStatus'
];

export const VERIFICATION_TYPES_EXPORTS = [
  'Severity',
  'IssueCategory',
  'DataSystem',
  'VerificationStatus'
];

export const REPORT_GENERATOR_EXPORTS = [
  'generateReport',
  'generateSummary',
  'groupIssuesByCategory',
  'calculateIssueStats'
];

export const CERTIFICATE_GENERATOR_EXPORTS = [
  'generateCertificate',
  'generateCertificateId',
  'calculateValidity',
  'calculateHash',
  'isCertificateValid',
  'canGenerateCertificate'
];

export const VALIDATOR_EXPORTS = [
  'ValidatorRegistry',
  'globalValidatorRegistry',
  'registerStandardValidators',
  'createValidator',
  'composeValidators'
];
