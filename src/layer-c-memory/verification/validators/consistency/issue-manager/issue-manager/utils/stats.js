/**
 * @fileoverview Issue Statistics
 * 
 * Cálculo de estadísticas de issues.
 * 
 * @module consistency/issue-manager/utils/stats
 */

import { IssueCategory, DataSystem } from '../../../../../types/index.js';
import { countBySeverity, countBySystem } from './counters.js';

/**
 * Calcula estadísticas de issues
 * @param {Array} issues - Lista de issues
 * @returns {Object} - Estadísticas
 */
export function calculateStats(issues) {
  return {
    total: issues.length,
    bySeverity: countBySeverity(issues),
    bySystem: countBySystem(issues),
    atomsFilesMismatch: issues.filter(i => 
      i.category === IssueCategory.CONSISTENCY && 
      i.system === DataSystem.ATOMS
    ).length,
    missingFiles: issues.filter(i =>
      i.message.includes('non-existent file')
    ).length,
    pathIssues: issues.filter(i =>
      i.category === IssueCategory.STRUCTURE
    ).length
  };
}

/**
 * Genera resumen de issues
 * @param {Array} issues - Lista de issues
 * @param {Object} cache - Cache de datos
 * @returns {Object} - Resumen
 */
export function generateSummary(issues, cache) {
  return {
    totalIssues: issues.length,
    totalAtoms: cache.atoms?.size || 0,
    totalFiles: cache.files?.size || 0,
    totalConnections: cache.connections?.length || 0,
    orphanedAtoms: issues.filter(i => 
      i.message.includes('non-existent file')
    ).length,
    orphanedFiles: issues.filter(i =>
      i.message.includes('no atoms')
    ).length,
    bySeverity: countBySeverity(issues)
  };
}
