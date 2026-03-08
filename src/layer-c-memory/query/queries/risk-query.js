/**
 * @fileoverview risk-query.js
 *
 * Consultas de evaluación de riesgos
 * USA SQLite exclusivamente -sin fallback JSON
 *
 * @module query/queries/risk-query
 */

import { getRepository } from '#layer-c/storage/repository/index.js';
import {
  ensureLiveRowSync,
  getLiveFileSetSql,
} from '../../../shared/compiler/index.js';

function normalizeDerivedRiskLevel(score) {
  if (score >= 0.85) return 'critical';
  if (score >= 0.65) return 'high';
  if (score >= 0.4) return 'medium';
  return 'low';
}

function buildDerivedRiskRows(repo) {
  return repo.db.prepare(`
    SELECT
      a.file_path,
      ROUND(AVG(COALESCE(a.propagation_score, 0)), 4) as propagation_score,
      ROUND(AVG(COALESCE(a.complexity, 0) / 15.0), 4) as complexity_score,
      ROUND(AVG(COALESCE(a.coupling_score, 0)), 4) as coupling_score,
      ROUND(AVG(COALESCE(a.fragility_score, 0)), 4) as fragility_score,
      ROUND(AVG(COALESCE(a.centrality_score, 0) / 100.0), 4) as centrality_score,
      SUM(CASE WHEN COALESCE(a.has_network_calls, 0) = 1 THEN 1 ELSE 0 END) as network_atoms,
      SUM(CASE WHEN COALESCE(a.is_async, 0) = 1 THEN 1 ELSE 0 END) as async_atoms,
      SUM(CASE WHEN COALESCE(a.has_error_handling, 0) = 0 THEN 1 ELSE 0 END) as atoms_without_error_handling,
      SUM(CASE WHEN LOWER(COALESCE(a.risk_level, 'low')) IN ('high', 'critical') THEN 1 ELSE 0 END) as high_risk_atoms,
      COUNT(*) as atom_count
    FROM atoms a
    JOIN (${getLiveFileSetSql()}) live ON live.file_path = a.file_path
    WHERE (a.is_removed IS NULL OR a.is_removed = 0)
      AND a.file_path IS NOT NULL
    GROUP BY a.file_path
  `).all().map((row) => {
    const rawScore =
      (Number(row.propagation_score) || 0) * 0.3 +
      (Number(row.complexity_score) || 0) * 0.2 +
      (Number(row.coupling_score) || 0) * 0.15 +
      (Number(row.fragility_score) || 0) * 0.15 +
      (Number(row.centrality_score) || 0) * 0.1 +
      (Math.min(Number(row.network_atoms) || 0, 5) / 5) * 0.05 +
      (Math.min(Number(row.high_risk_atoms) || 0, 5) / 5) * 0.05;

    const score = Number(Math.max(0, Math.min(1, rawScore)).toFixed(4));
    return {
      file_path: row.file_path,
      risk_score: score,
      risk_level: normalizeDerivedRiskLevel(score),
      assessed_at: null,
      factors_json: JSON.stringify([
        { type: 'derived_from_atoms', atomCount: Number(row.atom_count) || 0 },
        { type: 'propagation_score', score: Number(row.propagation_score) || 0 },
        { type: 'complexity_score', score: Number(row.complexity_score) || 0 },
        { type: 'coupling_score', score: Number(row.coupling_score) || 0 },
        { type: 'fragility_score', score: Number(row.fragility_score) || 0 },
        { type: 'network_atoms', count: Number(row.network_atoms) || 0 },
        { type: 'high_risk_atoms', count: Number(row.high_risk_atoms) || 0 },
        { type: 'atoms_without_error_handling', count: Number(row.atoms_without_error_handling) || 0 },
        { type: 'async_atoms', count: Number(row.async_atoms) || 0 }
      ]),
      shared_state_count: null,
      external_deps_count: Number(row.network_atoms) || 0,
      complexity_score: Number(row.complexity_score) || 0,
      propagation_score: Number(row.propagation_score) || 0,
      source: 'derived_from_atoms'
    };
  });
}

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

  const liveRowSync = ensureLiveRowSync(repo.db, { autoSync: true, sampleLimit: 5 });

  const totalRiskRows = repo.db.prepare(`
    SELECT COUNT(*) as total
    FROM risk_assessments
    WHERE risk_level IS NOT NULL
  `).get()?.total || 0;

  const {
    liveFileTotal = 0,
    staleRiskRows = 0
  } = liveRowSync.summary || {};

  const riskRows = repo.db.prepare(`
    SELECT ra.file_path, ra.risk_score, ra.risk_level, ra.factors_json,
           ra.shared_state_count, ra.external_deps_count, ra.complexity_score,
           ra.propagation_score, ra.assessed_at
    FROM risk_assessments ra
    JOIN (${getLiveFileSetSql()}) live ON live.file_path = ra.file_path
    WHERE ra.risk_level IS NOT NULL
    ORDER BY ra.risk_score DESC
  `).all();

  const resolvedRiskRows = riskRows?.length > 0 ? riskRows : buildDerivedRiskRows(repo);
  const usedFallback = (!riskRows || riskRows.length === 0) && resolvedRiskRows.length > 0;

  const criticalRiskFiles = [];
  const highRiskFiles = [];
  const mediumRiskFiles = [];
  const lowRiskFiles = [];

  let criticalCount = 0;
  let highCount = 0;
  let mediumCount = 0;
  let lowCount = 0;

  for (const row of resolvedRiskRows) {
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
        totalFiles: resolvedRiskRows.length,
        liveFilesTotal: liveFileTotal,
        unassessedLiveFiles: Math.max(0, liveFileTotal - resolvedRiskRows.length),
        staleRowsDropped: Math.max(
          0,
          liveRowSync.deleted.riskAssessments || staleRiskRows || (totalRiskRows - resolvedRiskRows.length)
        ),
        source: usedFallback ? 'derived_from_atoms' : 'risk_assessments',
        note: usedFallback
          ? 'Risk assessment derived from live atom metrics because risk_assessments is empty.'
          : undefined
      },
      criticalRiskFiles,
      highRiskFiles,
      mediumRiskFiles,
      lowRiskFiles
    },
    scores: {}
  };
}
