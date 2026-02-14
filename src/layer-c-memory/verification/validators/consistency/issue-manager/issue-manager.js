/**
 * @fileoverview Issue Manager
 * 
 * Gestiona la creación, almacenamiento y consulta de issues de consistencia.
 * Centraliza la lógica de creación de issues para mantener consistencia.
 * 
 * @module consistency/issue-manager/issue-manager
 * @version 1.0.0
 * @deprecated Use modular version: issue-manager/index.js
 */

// Re-export from modular version for backward compatibility
export { 
  IssueManager, 
  Severity,
  IssueCategory,
  DataSystem,
  default 
} from './issue-manager/index.js';
