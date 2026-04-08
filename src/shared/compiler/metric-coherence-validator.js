/**
 * @fileoverview Metric coherence validator — detects inconsistencies between
 * different reporting surfaces (server_status, health_panel, metrics_snapshot, etc.)
 * and between derived metrics vs raw database counts.
 *
 * This ensures that when the same underlying data (activeAtoms, liveCoverageRatio, etc.)
 * is reported through different endpoints, they remain consistent within acceptable tolerance.
 *
 * @module shared/compiler/metric-coherence-validator
 */

import { asNumber } from './core-utils.js';

/**
 * Thresholds for coherence validation.
 * If difference exceeds these thresholds, the metric is considered incoherent.
 */
const COHERENCE_THRESHOLDS = {
  activeAtoms: { absolute: 100, percentage: 0.05 }, // 5% or 100 atoms
  activeFiles: { absolute: 10, percentage: 0.03 }, // 3% or 10 files
  callLinks: { absolute: 500, percentage: 0.1 }, // 10% or 500 links
  semanticLinks: { absolute: 20, percentage: 0.15 }, // 15% or 20 links
  liveCoverageRatio: { absolute: 0.05, percentage: 0.1 }, // 10% or 0.05 ratio
  issueCount: { absolute: 5, percentage: 0.2 }, // 20% or 5 issues
  healthScore: { absolute: 5, percentage: 0.05 } // 5% or 5 points
};

/**
 * Checks if two numeric values are coherent within tolerance.
 * Returns { coherent: boolean, diff: number, diffPct: number }
 */
function checkCoherence(value1, value2, threshold) {
  const v1 = asNumber(value1, 0);
  const v2 = asNumber(value2, 0);
  const diff = Math.abs(v1 - v2);
  const baseValue = Math.max(v1, v2, 1); // Avoid division by zero
  const diffPct = diff / baseValue;

  const isCoherent = diff <= threshold.absolute || diffPct <= threshold.percentage;

  return {
    coherent: isCoherent,
    value1: v1,
    value2: v2,
    diff,
    diffPct: Number((diffPct * 100).toFixed(2)),
    threshold: threshold
  };
}

/**
 * Validates coherence between database counts and explainability metrics.
 * Detects when compilerExplainability.databaseHealth differs from raw SQL counts.
 */
export function validateDatabaseCoherence(compilerExplainability, repo) {
  const findings = [];
  
  if (!compilerExplainability?.databaseHealth || !repo?.db) {
    return {
      coherent: false,
      severity: 'high',
      reason: 'Database health or repository unavailable',
      findings: [{
        metric: 'database_availability',
        coherent: false,
        severity: 'high',
        reason: 'Cannot validate database coherence without db access'
      }]
    };
  }

  const dbHealth = compilerExplainability.databaseHealth;
  const metrics = dbHealth.metrics || {};

  // Validate activeAtoms consistency
  if (metrics.activeAtoms !== undefined) {
    try {
      const sqlResult = repo.db.prepare(
        'SELECT COUNT(*) as count FROM atoms WHERE (is_removed IS NULL OR is_removed = 0)'
      ).get();
      
      const sqlActiveAtoms = asNumber(sqlResult?.count, 0);
      const reportedAtoms = asNumber(metrics.activeAtoms, 0);
      
      if (sqlActiveAtoms > 0 && reportedAtoms === 0) {
        findings.push({
          metric: 'activeAtoms',
          coherent: false,
          severity: 'critical',
          sqlValue: sqlActiveAtoms,
          reportedValue: reportedAtoms,
          diff: sqlActiveAtoms,
          diffPct: 100,
          reason: `SQL reports ${sqlActiveAtoms} active atoms but databaseHealth.metrics.activeAtoms reports ${reportedAtoms}. This is a reporting bug, not a data issue.`
        });
      } else if (sqlActiveAtoms > 0) {
        const coherence = checkCoherence(sqlActiveAtoms, reportedAtoms, COHERENCE_THRESHOLDS.activeAtoms);
        if (!coherence.coherent) {
          findings.push({
            metric: 'activeAtoms',
            ...coherence,
            severity: coherence.diffPct > 10 ? 'high' : 'medium',
            reason: `Active atoms count mismatch: SQL=${sqlActiveAtoms}, reported=${reportedAtoms}`
          });
        }
      }
    } catch (error) {
      findings.push({
        metric: 'activeAtoms',
        coherent: false,
        severity: 'high',
        reason: `Failed to validate activeAtoms: ${error.message}`
      });
    }
  }

  // Validate activeFiles consistency
  if (metrics.activeFiles !== undefined) {
    try {
      const sqlResult = repo.db.prepare(
        'SELECT COUNT(*) as count FROM files WHERE (is_removed IS NULL OR is_removed = 0)'
      ).get();
      
      const sqlActiveFiles = asNumber(sqlResult?.count, 0);
      const reportedFiles = asNumber(metrics.activeFiles, 0);
      
      if (sqlActiveFiles > 0 && reportedFiles === 0) {
        findings.push({
          metric: 'activeFiles',
          coherent: false,
          severity: 'critical',
          sqlValue: sqlActiveFiles,
          reportedValue: reportedFiles,
          diff: sqlActiveFiles,
          diffPct: 100,
          reason: `SQL reports ${sqlActiveFiles} active files but databaseHealth.metrics.activeFiles reports ${reportedFiles}`
        });
      } else if (sqlActiveFiles > 0) {
        const coherence = checkCoherence(sqlActiveFiles, reportedFiles, COHERENCE_THRESHOLDS.activeFiles);
        if (!coherence.coherent) {
          findings.push({
            metric: 'activeFiles',
            ...coherence,
            severity: coherence.diffPct > 10 ? 'high' : 'medium',
            reason: `Active files count mismatch: SQL=${sqlActiveFiles}, reported=${reportedFiles}`
          });
        }
      }
    } catch (error) {
      findings.push({
        metric: 'activeFiles',
        coherent: false,
        severity: 'high',
        reason: `Failed to validate activeFiles: ${error.message}`
      });
    }
  }

  // Validate call relations consistency
  if (metrics.activeCallRelations !== undefined) {
    try {
      const sqlResult = repo.db.prepare(
        "SELECT COUNT(*) as count FROM atom_relations WHERE relation_type = 'calls' AND (is_removed IS NULL OR is_removed = 0)"
      ).get();
      
      const sqlCallRelations = asNumber(sqlResult?.count, 0);
      const reportedRelations = asNumber(metrics.activeCallRelations, 0);
      
      if (sqlCallRelations > 0 && reportedRelations === 0) {
        findings.push({
          metric: 'activeCallRelations',
          coherent: false,
          severity: 'high',
          sqlValue: sqlCallRelations,
          reportedValue: reportedRelations,
          diff: sqlCallRelations,
          diffPct: 100,
          reason: `SQL reports ${sqlCallRelations} call relations but databaseHealth.metrics.activeCallRelations reports ${reportedRelations}`
        });
      } else if (sqlCallRelations > 0) {
        const coherence = checkCoherence(sqlCallRelations, reportedRelations, COHERENCE_THRESHOLDS.callLinks);
        if (!coherence.coherent) {
          findings.push({
            metric: 'activeCallRelations',
            ...coherence,
            severity: 'medium',
            reason: `Call relations count mismatch: SQL=${sqlCallRelations}, reported=${reportedRelations}`
          });
        }
      }
    } catch (error) {
      findings.push({
        metric: 'activeCallRelations',
        coherent: false,
        severity: 'high',
        reason: `Failed to validate call relations: ${error.message}`
      });
    }
  }

  const criticalFindings = findings.filter(f => f.severity === 'critical');
  const highFindings = findings.filter(f => f.severity === 'high');
  const mediumFindings = findings.filter(f => f.severity === 'medium');

  const hasCritical = criticalFindings.length > 0;
  const hasHigh = highFindings.length > 0;
  const allCoherent = findings.length === 0 || findings.every(f => f.coherent);

  return {
    coherent: allCoherent,
    severity: hasCritical ? 'critical' : hasHigh ? 'high' : mediumFindings.length > 0 ? 'medium' : 'low',
    healthy: allCoherent,
    trustworthy: allCoherent,
    totalChecks: findings.length + 3, // +3 for the checks we always run
    findings,
    criticalFindings,
    highFindings,
    mediumFindings,
    reason: allCoherent
      ? 'All database metrics are coherent with raw SQL counts'
      : `Found ${findings.length} incoherence(s): ${criticalFindings.length} critical, ${highFindings.length} high, ${mediumFindings.length} medium`,
    recommendation: hasCritical || hasHigh
      ? 'Fix reporting layer immediately — database is healthy but metrics are misreported'
      : 'Review metric discrepancies and ensure all reporting surfaces use the same data source',
    checkedAt: new Date().toISOString()
  };
}

/**
 * Validates coherence between different reporting endpoints.
 * Compares metrics from server_status, health_panel, and metrics_snapshot.
 */
export function validateReportingCoherence(reportingEndpoints = []) {
  const findings = [];

  if (reportingEndpoints.length < 2) {
    return {
      coherent: true,
      severity: 'low',
      reason: 'Insufficient reporting endpoints to validate coherence',
      findings: []
    };
  }

  // Compare activeAtoms across endpoints
  const activeAtomsValues = reportingEndpoints
    .filter(ep => ep.activeAtoms !== undefined)
    .map(ep => ({ source: ep.source, value: asNumber(ep.activeAtoms, 0) }));

  if (activeAtomsValues.length >= 2) {
    const values = activeAtomsValues.map(v => v.value);
    const max = Math.max(...values);
    const min = Math.min(...values);
    const diff = max - min;
    const diffPct = max > 0 ? (diff / max) * 100 : 0;

    if (diff > COHERENCE_THRESHOLDS.activeAtoms.absolute && diffPct > COHERENCE_THRESHOLDS.activeAtoms.percentage * 100) {
      findings.push({
        metric: 'activeAtoms',
        coherent: false,
        severity: diffPct > 50 ? 'critical' : 'high',
        sources: activeAtomsValues,
        maxValue: max,
        minValue: min,
        diff,
        diffPct: Number(diffPct.toFixed(2)),
        reason: `Active atoms varies across reporting endpoints: min=${min}, max=${max} (${diffPct.toFixed(1)}% difference)`
      });
    }
  }

  // Compare healthScore across endpoints
  const healthScoreValues = reportingEndpoints
    .filter(ep => ep.healthScore !== undefined)
    .map(ep => ({ source: ep.source, value: asNumber(ep.healthScore, 0) }));

  if (healthScoreValues.length >= 2) {
    const values = healthScoreValues.map(v => v.value);
    const max = Math.max(...values);
    const min = Math.min(...values);
    const diff = max - min;
    const diffPct = max > 0 ? (diff / max) * 100 : 0;

    if (diff > COHERENCE_THRESHOLDS.healthScore.absolute && diffPct > COHERENCE_THRESHOLDS.healthScore.percentage * 100) {
      findings.push({
        metric: 'healthScore',
        coherent: false,
        severity: diffPct > 20 ? 'high' : 'medium',
        sources: healthScoreValues,
        maxValue: max,
        minValue: min,
        diff,
        diffPct: Number(diffPct.toFixed(2)),
        reason: `Health score varies across endpoints: min=${min}, max=${max} (diff=${diff}, ${diffPct.toFixed(1)}%)`
      });
    }
  }

  const allCoherent = findings.length === 0;

  return {
    coherent: allCoherent,
    severity: findings.some(f => f.severity === 'critical') ? 'critical'
      : findings.some(f => f.severity === 'high') ? 'high'
      : findings.length > 0 ? 'medium' : 'low',
    healthy: allCoherent,
    trustworthy: allCoherent,
    endpointsCompared: reportingEndpoints.length,
    findings,
    reason: allCoherent
      ? 'All reporting endpoints are coherent'
      : `Found ${findings.length} incoherence(s) across ${reportingEndpoints.length} endpoints`,
    recommendation: findings.length > 0
      ? 'Ensure all reporting surfaces consume from the same compilerExplainability instance'
      : 'Reporting coherence is healthy',
    checkedAt: new Date().toISOString()
  };
}

/**
 * Validates derived metrics consistency.
 * E.g., liveCoverageRatio should match activeAtoms / scannedFiles
 */
export function validateDerivedMetricsCoherence(compilerExplainability) {
  const findings = [];

  if (!compilerExplainability?.fileUniverseGranularity || !compilerExplainability?.databaseHealth) {
    return {
      coherent: true,
      severity: 'low',
      reason: 'Insufficient data to validate derived metrics',
      findings: []
    };
  }

  const fileUniverse = compilerExplainability.fileUniverseGranularity;
  const dbHealth = compilerExplainability.databaseHealth;
  const metrics = dbHealth.metrics || {};

  // Validate liveCoverageRatio
  if (fileUniverse.liveCoverageRatio !== undefined && metrics.activeAtoms !== undefined) {
    const reportedRatio = asNumber(fileUniverse.liveCoverageRatio, 0);
    const activeAtoms = asNumber(metrics.activeAtoms, 0);
    const scannedFiles = asNumber(fileUniverse.manifestFileTotal || fileUniverse.scannedFileTotal, 0);

    if (activeAtoms > 0 && scannedFiles > 0) {
      const expectedRatio = Math.min(1, activeAtoms / (scannedFiles * 10)); // Rough heuristic: ~10 atoms/file
      const diff = Math.abs(reportedRatio - expectedRatio);

      // Only flag if ratio is 0 but we have atoms (clear bug)
      if (reportedRatio === 0 && activeAtoms > 1000) {
        findings.push({
          metric: 'liveCoverageRatio',
          coherent: false,
          severity: 'high',
          reportedValue: reportedRatio,
          activeAtoms,
          scannedFiles,
          reason: `liveCoverageRatio is 0 but we have ${activeAtoms} active atoms across ${scannedFiles} files. This indicates a reporting bug.`
        });
      }
    }
  }

  const allCoherent = findings.length === 0;

  return {
    coherent: allCoherent,
    severity: findings.length > 0 ? 'high' : 'low',
    healthy: allCoherent,
    trustworthy: allCoherent,
    findings,
    reason: allCoherent
      ? 'Derived metrics are coherent'
      : `Found ${findings.length} derived metric incoherence(s)`,
    recommendation: findings.length > 0
      ? 'Review derived metric calculations and ensure they consume from consistent data sources'
      : 'Derived metrics coherence is healthy',
    checkedAt: new Date().toISOString()
  };
}

/**
 * Main validation function — runs all coherence checks.
 */
export function validateMetricCoherence({ compilerExplainability, repo, reportingEndpoints = [] } = {}) {
  const databaseCoherence = validateDatabaseCoherence(compilerExplainability, repo);
  const reportingCoherence = validateReportingCoherence(reportingEndpoints);
  const derivedCoherence = validateDerivedMetricsCoherence(compilerExplainability);

  const allCoherent = databaseCoherence.coherent && reportingCoherence.coherent && derivedCoherence.coherent;
  const severities = [databaseCoherence.severity, reportingCoherence.severity, derivedCoherence.severity];
  const worstSeverity = severities.includes('critical') ? 'critical'
    : severities.includes('high') ? 'high'
    : severities.includes('medium') ? 'medium'
    : 'low';

  const totalFindings = (databaseCoherence.findings?.length || 0)
    + (reportingCoherence.findings?.length || 0)
    + (derivedCoherence.findings?.length || 0);

  return {
    coherent: allCoherent,
    healthy: allCoherent,
    trustworthy: allCoherent,
    severity: worstSeverity,
    totalChecks: databaseCoherence.totalChecks + reportingCoherence.endpointsCompared + 1,
    totalFindings,
    database: databaseCoherence,
    reporting: reportingCoherence,
    derived: derivedCoherence,
    summary: allCoherent
      ? 'All metric coherence checks passed'
      : `Found ${totalFindings} incoherence(s) — ${databaseCoherence.findings?.length || 0} database, ${reportingCoherence.findings?.length || 0} reporting, ${derivedCoherence.findings?.length || 0} derived`,
    recommendation: allCoherent
      ? 'Metric coherence is healthy — all reporting surfaces are consistent'
      : `Review ${totalFindings} incoherence(s) immediately. Database metrics may be misreported.`,
    checkedAt: new Date().toISOString()
  };
}

export default {
  validateMetricCoherence,
  validateDatabaseCoherence,
  validateReportingCoherence,
  validateDerivedMetricsCoherence,
  COHERENCE_THRESHOLDS
};
