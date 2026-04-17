import { getRepository } from './index.js';
import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('OmnySys:storage:algebraic');

/**
 * Algebraic Query Service
 * High-performance SQL aggregations for diagnostic reports.
 */

/**
 * Fetches the system inventory summary using Relational SQL Views.
 * @param {string} projectPath
 */
export async function getAlgebraicInventory(projectPath) {
  const repo = getRepository(projectPath);
  if (!repo || !repo.db) return null;

  try {
    // 1. Core Counts
    const counts = repo.db.prepare(`
      SELECT
        (SELECT COUNT(*) FROM files) as file_count,
        (SELECT COUNT(*) FROM atoms) as atom_count,
        (SELECT COUNT(*) FROM societies) as society_count,
        (SELECT COUNT(*) FROM semantic_issues) as issue_count
    `).get();

    // 2. Metadata Coverage (from Live View)
    const coverage = repo.db.prepare(`SELECT * FROM v_metadata_coverage`).get();

    // 3. System Health Averages (from Live Atoms)
    const health = repo.db.prepare(`
      SELECT
        AVG(complexity) as avg_complexity,
        AVG(fragility_score) as avg_fragility,
        AVG(propagation_score) as avg_propagation
      FROM atoms
    `).get();

    // 4. Drift Analysis (Relational Reality vs Stored Metadata)
    const driftCount = repo.db.prepare(`SELECT COUNT(*) as count FROM v_algebraic_drift`).get()?.count || 0;

    return {
      success: true,
      capturedAt: new Date().toISOString(),
      summary: {
        totalSystemCount: counts.file_count,
        totalAtoms: counts.atom_count,
        societiesCount: counts.society_count,
        policyDriftCount: counts.issue_count,
        algebraicDriftCount: driftCount,
        metadataFieldCoveragePct: coverage?.avg_coverage || 0,
        avgComplexity: Math.round(health.avg_complexity * 10) / 10,
        avgFragility: Math.round(health.avg_fragility * 100) / 100,
        avgPropagation: Math.round(health.avg_propagation * 100) / 100,
        inventoryState: driftCount > 10 ? 'drift_detected' : 'stable'
      }
    };
  } catch (error) {
    logger.error('   ❌ Algebraic Inventory Fetch Failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Fetches top systems based on live importance score.
 */
export async function getAlgebraicTopSystems(projectPath, limit = 8) {
  const repo = getRepository(projectPath);
  if (!repo || !repo.db) return [];

  try {
    return repo.db.prepare(`
      SELECT
        v.name,
        v.file_path,
        v.live_importance as importanceScore,
        v.live_propagation as propagationScore,
        COALESCE(r.ripple_effect_score, 0) as rippleScore
      FROM v_live_metrics v
      LEFT JOIN v_propagation_recursive r ON v.id = r.id
      ORDER BY v.live_importance DESC
      LIMIT ?
    `).all(limit);
  } catch (error) {
    logger.error('   ❌ Algebraic Top Systems Fetch Failed:', error);
    return [];
  }
}

/**
 * Combined high-level health metrics for the one-screen panel.
 */
export async function aggregateAlgebraicMetrics(projectPath) {
  const inventory = await getAlgebraicInventory(projectPath);

  if (!inventory || !inventory.success) {
    return { metrics: { error: 'Service Unavailable' } };
  }

  const repo = getRepository(projectPath);
  const driftSignals = repo.db.prepare(`
    SELECT name, importance_drift, relational_importance
    FROM v_algebraic_drift
    LIMIT 5
  `).all();

  // Grouped results for compiler-snapshot-service
  return {
    metrics: {
      totalAtoms: inventory.summary.totalAtoms,
      policyDriftCount: inventory.summary.policyDriftCount,
      metadataCoverage: inventory.summary.metadataFieldCoveragePct,
      health: {
        fragility: inventory.summary.avgFragility,
        propagation: inventory.summary.avgPropagation,
        complexity: inventory.summary.avgComplexity
      },
      risks: {
        critical: inventory.summary.algebraicDriftCount, // Using algebraic drift as a primary risk signal
        high: 0,
        medium: 0,
        low: 0
      },
      driftAssessment: {
        signals: driftSignals.map(s => ({
          type: 'relational_drift',
          evidence: `Stored importance differs from relational reality by ${s.importance_drift}`,
          severity: s.importance_drift > 0.5 ? 'high' : 'medium'
        }))
      }
    }
  };
}

export default {
  getAlgebraicInventory,
  getAlgebraicTopSystems,
  aggregateAlgebraicMetrics
};
