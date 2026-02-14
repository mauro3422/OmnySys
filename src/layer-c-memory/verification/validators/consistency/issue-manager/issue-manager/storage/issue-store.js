/**
 * @fileoverview Issue Store
 * 
 * Almacenamiento y gestión de issues.
 * 
 * @module consistency/issue-manager/storage/issue-store
 */

import { Severity, IssueCategory, DataSystem } from '../../../../../types/index.js';

/**
 * Agrega un issue al store
 * @param {Array} issues - Array de issues
 * @param {number} counter - Contador de issues
 * @param {Object} params - Parámetros del issue
 * @returns {Object} - Issue creado
 */
export function addIssue(issues, counter, { 
  category, 
  severity, 
  system, 
  path, 
  message, 
  expected, 
  actual, 
  suggestion, 
  metadata 
}) {
  const issue = {
    id: `consistency-${Date.now()}-${counter}`,
    category,
    severity,
    system,
    path,
    message,
    expected,
    actual,
    suggestion,
    metadata,
    timestamp: new Date().toISOString()
  };
  
  issues.push(issue);
  return issue;
}

/**
 * Limpia todos los issues
 * @returns {Object} - Estado reseteado
 */
export function clear() {
  return { issues: [], counter: 0 };
}
