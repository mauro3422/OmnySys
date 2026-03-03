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
    WHERE risk_level IS NOT NULL
    ORDER BY risk_score DESC
  `).all();

  if (!riskRows || riskRows.length === 0) {
    // Fallback: derive basic risk summary from atoms table
    const stats = repo.db.prepare('SELECT COUNT(*) as atoms, COUNT(DISTINCT file_path) as files FROM atoms').get();
    return {
      report: {
        summary: {
          criticalCount: 0,
          highCount: 0,
          mediumCount: 0,
          lowCount: 0,
          totalFiles: stats?.files || 0,
          totalAtoms: stats?.atoms || 0,
          note: 'Risk assessment not yet computed. Run full analysis to populate risk_assessments table.'
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
    // factors_json may be stored as [] or {} — always coerce to array
    const rawFactors = (() => {
      try { const p = JSON.parse(row.factors_json || '[]'); return Array.isArray(p) ? p : []; }
      catch { return []; }
    })();

    const fileRisk = {
      file: row.file_path,
      severity: row.risk_level.toUpperCase(),
      score: row.risk_score,
      reason: rawFactors.slice(0, 3).map(f => f.type || 'unknown').join(', ') || 'Multiple risk factors',
      factors: rawFactors,
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
        lowCount: riskRows.filter(r => r.risk_level === 'low').length,
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
