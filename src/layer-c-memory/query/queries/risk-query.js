/**
 * @fileoverview risk-query.js
 *
 * Consultas de evaluación de riesgos
 * USA SQLite exclusivamente -sin fallback JSON
 *
 * @module query/queries/risk-query
 */

import { getRepository } from '#layer-c/storage/repository/index.js';

/**
 * Obtiene el assessment de riesgos completo
 * @param {string} rootPath - Raíz del proyecto
 * @returns {Promise<object>}
 * @throws {Error} Si SQLite no está disponible
 */
export async function getRiskAssessment(rootPath) {
  const repo = getRepository(rootPath);
  
  if (!repo || !repo.db) {
    throw new Error('SQLite not available. Run analysis first.');
  }
  
  const riskRows = repo.db.prepare(`
    SELECT file_path, risk_score, risk_level, factors_json, 
           shared_state_count, external_deps_count, complexity_score, 
           propagation_score, assessed_at
    FROM risk_assessments 
    WHERE risk_level IN ('critical', 'high', 'medium')
    ORDER BY risk_score DESC
  `).all();
  
  if (!riskRows || riskRows.length === 0) {
    return {
      report: {
        summary: {
          criticalCount: 0,
          highCount: 0,
          mediumCount: 0,
          lowCount: 0,
          totalFiles: 0
        },
        criticalRiskFiles: [],
        highRiskFiles: [],
        mediumRiskFiles: []
      },
      scores: {}
    };
  }
  
  const criticalRiskFiles = [];
  const highRiskFiles = [];
  const mediumRiskFiles = [];
  
  let criticalCount = 0, highCount = 0, mediumCount = 0;
  
  for (const row of riskRows) {
    const fileRisk = {
      file: row.file_path,
      severity: row.risk_level.toUpperCase(),
      score: row.risk_score,
      reason: JSON.parse(row.factors_json || '[]').slice(0, 3).map(f => f.type || 'unknown').join(', ') || 'Multiple risk factors',
      factors: JSON.parse(row.factors_json || '[]'),
      source: 'sqlite'
    };
    
    if (row.risk_level === 'critical') {
      criticalRiskFiles.push(fileRisk);
      criticalCount++;
    } else if (row.risk_level === 'high') {
      highRiskFiles.push(fileRisk);
      highCount++;
    } else {
      mediumRiskFiles.push(fileRisk);
      mediumCount++;
    }
  }
  
  return {
    report: {
      summary: {
        criticalCount,
        highCount,
        mediumCount,
        lowCount: 0,
        totalFiles: riskRows.length
      },
      criticalRiskFiles,
      highRiskFiles,
      mediumRiskFiles
    },
    scores: {}
  };
}

// DEAD CODE REMOVED: getAllRiskFiles, getHighRiskFiles (never used)
