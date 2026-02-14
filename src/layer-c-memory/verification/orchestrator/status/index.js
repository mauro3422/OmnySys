/**
 * @fileoverview Status Module - Exportaciones de estado
 * 
 * @module verification/orchestrator/status
 */

export { 
  getQuickStatus,
  determineStatus,
  countBySeverity,
  hasCriticalIssues,
  hasHighSeverityIssues
} from './status-checker.js';
