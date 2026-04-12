import { buildFinding, buildGrade } from './database-health-assessment-scoring.js';

export function buildDatabaseHealthAssessment({
  counts = {},
  fileUniverse = null,
  systemMapCoverage = null,
  semanticSurface = null
} = {}) {
  const {
    orphanAtoms = 0,
    orphanAtomsMissingScan = 0,
    atomsWithCalls = 0,
    activeCallRelations = 0,
    callGraphRows = 0,
    orphanCallRelations = 0,
    contradictoryRiskRows = 0,
    atomsWithSemanticSignals = 0,
    activeSemanticConnections = 0,
    activeSystemFiles = 0,
    systemFilesWithSemantics = 0
  } = counts || {};

  const criticalFindings = [];
  const warnings = [];
  let score = 100;

  if (fileUniverse?.healthy === false) {
    const penalty = 12 * Math.max(1, fileUniverse.issues?.length || 0);
    score -= penalty;
    warnings.push(...(fileUniverse.issues || []).map((issue) => buildFinding(issue.code, issue.severity, issue.message)));
  }

  if (systemMapCoverage?.healthy === false) {
    const penalty = 10 * Math.max(1, systemMapCoverage.issues?.length || 0);
    score -= penalty;
    warnings.push(...(systemMapCoverage.issues || []).map((issue) => buildFinding(issue, 'medium', issue)));
  }

  if (semanticSurface?.materiallyDrifting === true) {
    const isCanonicalDrift = semanticSurface?.contract?.status === 'drift';
    const isAdvisorySurface = semanticSurface?.contract?.status === 'advisory_only';
    if (isCanonicalDrift) {
      const penalty = 15 + (semanticSurface.materialIssues?.length || 0) * 5;
      score -= penalty;
      warnings.push(...(semanticSurface.advisories || []).map((message) => buildFinding('semantic_surface_advisory', 'medium', message)));
      criticalFindings.push(...(semanticSurface.materialIssues || []).map((message) => buildFinding('semantic_surface_drift', 'medium', message)));
    } else if (isAdvisorySurface) {
      warnings.push(...(semanticSurface.advisories || []).map((message) => buildFinding('semantic_surface_advisory', 'low', message)));
    } else {
      const penalty = 8 + (semanticSurface.materialIssues?.length || 0) * 3;
      score -= penalty;
      warnings.push(...(semanticSurface.advisories || []).map((message) => buildFinding('semantic_surface_advisory', 'medium', message)));
      criticalFindings.push(...(semanticSurface.materialIssues || []).map((message) => buildFinding('semantic_surface_drift', 'medium', message)));
    }
  }

  if (orphanAtoms > 0) {
    score -= Math.min(35, 12 + Math.floor(orphanAtoms / 25));
    criticalFindings.push(buildFinding(
      'orphaned_atoms',
      'high',
      'Active atoms still point to files that are missing from the canonical files table.',
      {
        orphanAtoms,
        orphanAtomsMissingScan
      }
    ));
  }

  if (atomsWithCalls > 0 && activeCallRelations === 0) {
    score -= 40;
    criticalFindings.push(buildFinding(
      'call_graph_not_hydrated',
      'high',
      'Atoms still contain calls_json, but the canonical atom_relations call projection has no active calls.'
    ));
  } else if (atomsWithCalls > 0 && callGraphRows === 0) {
    score -= 25;
    criticalFindings.push(buildFinding(
      'call_graph_view_empty',
      'high',
      'Atoms contain call telemetry, but the canonical call_graph view is empty.'
    ));
  } else if (atomsWithCalls > 0 && callGraphRows !== activeCallRelations) {
    score -= 10;
    warnings.push(buildFinding(
      'call_graph_projection_drift',
      'medium',
      'The call_graph view and atom_relations call rows are not aligned.'
    ));
  }

  if (orphanCallRelations > 0) {
    score -= Math.min(15, 5 + Math.floor(orphanCallRelations / 50));
    warnings.push(buildFinding(
      'orphan_call_relations',
      'medium',
      'Some call relations point to inactive or missing atoms.',
      { orphanCallRelations }
    ));
  }

  if (contradictoryRiskRows > 0) {
    score -= Math.min(25, 10 + contradictoryRiskRows);
    criticalFindings.push(buildFinding(
      'risk_lifecycle_contradiction',
      'high',
      'risk_assessments contains rows marked removed while still claiming lifecycle_status = active.',
      { contradictoryRiskRows }
    ));
  }

  if (atomsWithSemanticSignals > 0 && activeSemanticConnections === 0) {
    score -= 8;
    warnings.push(buildFinding(
      'semantic_projection_lag',
      'medium',
      'Atom semantic signals exist, but the semantic_connections table is empty.'
    ));
  }

  if (activeSystemFiles > 0 && systemFilesWithSemantics === 0 && atomsWithSemanticSignals > 0) {
    score -= 6;
    warnings.push(buildFinding(
      'system_files_semantic_lag',
      'medium',
      'system_files has no semantic_connections_json rows while atom semantic signals exist.'
    ));
  }

  const healthScore = Math.max(0, Math.round(score));
  const healthy = healthScore >= 85 && criticalFindings.length === 0;

  const recommendations = [];
  if (atomsWithCalls > 0 && activeCallRelations === 0) {
    recommendations.push('Reindex the project so call relations are persisted into atom_relations and exposed through call_graph.');
  }
  if (orphanAtoms > 0) {
    recommendations.push('Reconcile active atoms against the files and compiler_scanned_files tables before trusting database health.');
  }
  if (contradictoryRiskRows > 0) {
    recommendations.push('Reconcile risk_assessments lifecycle fields and soft-delete flags before trusting risk telemetry.');
  }
  if (semanticSurface?.materiallyDrifting === true) {
    recommendations.push('Rebuild semantic_connections from the canonical atom semantic metadata surface.');
  }

  return {
    healthy,
    healthScore,
    grade: buildGrade(healthScore),
    summary: healthy
      ? 'Database projections are aligned'
      : 'Database projections are drifting from the canonical atom graph',
    criticalFindings,
    warnings,
    recommendations
  };
}
