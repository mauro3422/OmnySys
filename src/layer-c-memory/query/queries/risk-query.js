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

  const liveFileTotal = repo.db.prepare(`
    SELECT COUNT(DISTINCT file_path) as total
    FROM atoms
    WHERE file_path IS NOT NULL
      AND file_path != ''
  `).get()?.total || 0;

  const totalRiskRows = repo.db.prepare(`
    SELECT COUNT(*) as total
    FROM risk_assessments
    WHERE risk_level IS NOT NULL
  `).get()?.total || 0;

  const riskRows = repo.db.prepare(`
    SELECT ra.file_path, ra.risk_score, ra.risk_level, ra.factors_json,
           ra.shared_state_count, ra.external_deps_count, ra.complexity_score,
           ra.propagation_score, ra.assessed_at
    FROM risk_assessments ra
    JOIN (
      SELECT DISTINCT file_path
      FROM atoms
      WHERE file_path IS NOT NULL
        AND file_path != ''
    ) live ON live.file_path = ra.file_path
    WHERE ra.risk_level IS NOT NULL
    ORDER BY ra.risk_score DESC
  `).all();

  if (!riskRows || riskRows.length === 0) {
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
        mediumRiskFiles: [],
        lowRiskFiles: []
      },
      scores: {}
    };
  }

  const criticalRiskFiles = [];
  const highRiskFiles = [];
  const mediumRiskFiles = [];
  const lowRiskFiles = [];

  let criticalCount = 0;
  let highCount = 0;
  let mediumCount = 0;
  let lowCount = 0;

  for (const row of riskRows) {
    const rawFactors = (() => {
      try {
        const parsed = JSON.parse(row.factors_json || '[]');
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    })();

    const fileRisk = {
      file: row.file_path,
      severity: String(row.risk_level || 'low').toUpperCase(),
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
    } else if (row.risk_level === 'medium') {
      mediumRiskFiles.push(fileRisk);
      mediumCount++;
    } else {
      lowRiskFiles.push(fileRisk);
      lowCount++;
    }
  }

  return {
    report: {
      summary: {
        criticalCount,
        highCount,
        mediumCount,
        lowCount,
        totalFiles: riskRows.length,
        liveFilesTotal: liveFileTotal,
        unassessedLiveFiles: Math.max(0, liveFileTotal - riskRows.length),
        staleRowsDropped: Math.max(0, totalRiskRows - riskRows.length)
      },
      criticalRiskFiles,
      highRiskFiles,
      mediumRiskFiles,
      lowRiskFiles
    },
    scores: {}
  };
}
