/**
 * @fileoverview Verification Orchestrator - Orquestador de verificación
 * 
 * Orquesta todo el proceso de verificación y certificación.
 * Coordina validadores, genera reportes y emite certificados.
 * 
 * @module verification/orchestrator
 * 
 * @version 0.9.4 - Modularizado: separado en componentes especializados
 * @since 0.7.0
 */

// === Core ===
export { 
  VerificationOrchestrator 
} from './VerificationOrchestrator.js';

// === Reporters ===
export { 
  generateReport,
  generateSummary,
  groupIssuesByCategory,
  calculateIssueStats
} from './reporters/index.js';

// === Recommendations ===
export { 
  generateRecommendations,
  prioritizeRecommendations,
  filterRecommendationsByPriority
} from './recommendations/index.js';

// === Certificates ===
export { 
  generateCertificate,
  generateCertificateId,
  calculateValidity,
  calculateHash,
  isCertificateValid,
  canGenerateCertificate
} from './certificates/index.js';

// === Status ===
export { 
  getQuickStatus,
  determineStatus,
  countBySeverity,
  hasCriticalIssues,
  hasHighSeverityIssues
} from './status/index.js';

// === Validators ===
export { 
  ValidatorRegistry,
  globalValidatorRegistry,
  registerStandardValidators
} from './validators/index.js';

// === Default Export ===
export { VerificationOrchestrator as default } from './VerificationOrchestrator.js';
