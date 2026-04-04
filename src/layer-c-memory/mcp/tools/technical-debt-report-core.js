import {
  buildTechnicalDebtPriorityActions,
  calculateTechnicalDebtScore
} from './technical-debt-report-helpers.js';
import { loadTechnicalDebtReportArtifacts } from './technical-debt-report-core-helpers.js';

function loadLatestFolderizationSnapshotReport(db, {
  projectPath = null,
  scopePath = null,
  focusPath = null
} = {}) {
  if (!db?.prepare || !projectPath) {
    return null;
  }

  try {
    const row = db.prepare(`
      SELECT payload_json
      FROM compiler_metrics_snapshots
      WHERE project_path = ?
        AND snapshot_kind = 'folderization'
        AND (? IS NULL OR scope_path = ?)
        AND (? IS NULL OR focus_path = ?)
      ORDER BY captured_at DESC
      LIMIT 1
    `).get(
      projectPath,
      scopePath,
      scopePath,
      focusPath,
      focusPath
    );

    if (!row?.payload_json) {
      return null;
    }

    const payload = JSON.parse(row.payload_json);
    return payload?.folderization || payload?.snapshot?.folderization || null;
  } catch {
    return null;
  }
}

export async function loadTechnicalDebtReportDetails({
  aggregateTool,
  context,
  repo,
  folderizationOptions,
  currentSnapshot
} = {}) {
  const snapshotCurrent = currentSnapshot.current || {};
  const folderizationSnapshotReport = repo
    ? loadLatestFolderizationSnapshotReport(repo.db, {
        projectPath: context?.projectPath || null,
        scopePath: folderizationOptions?.scopePath || null,
        focusPath: folderizationOptions?.focusPath || null
      })
    : null;
  return loadTechnicalDebtReportArtifacts({
    aggregateTool,
    context,
    repo,
    folderizationOptions,
    snapshotCurrent,
    folderizationSnapshotReport
  });
}

export function buildTechnicalDebtReportResult({
  duplicatesResult,
  conceptualResult,
  pipelineHealthResult,
  folderizationReport,
  currentSnapshot,
  fingerprint
}) {
  const summary = {
    structuralDuplicates: duplicatesResult.duplicates?.summary || {},
    conceptualDuplicates: {
      ...(conceptualResult.summary || {}),
      actionableGroups: conceptualResult.summary?.actionableGroups ?? conceptualResult.summary?.totalGroups ?? 0,
      actionableImplementations: conceptualResult.summary?.actionableImplementations ?? conceptualResult.summary?.totalImplementations ?? 0,
      rawGroups: conceptualResult.summary?.rawGroups ?? conceptualResult.summary?.totalGroups ?? 0,
      rawImplementations: conceptualResult.summary?.rawImplementations ?? conceptualResult.summary?.totalImplementations ?? 0,
      noiseByClass: conceptualResult.summary?.noiseByClass || {},
      chestDistribution: conceptualResult.summary?.chestDistribution || {}
    },
    pipelineHealth: {
      score: pipelineHealthResult.healthScore || 0,
      grade: pipelineHealthResult.grade || 'F',
      orphans: pipelineHealthResult.orphanPipelineFunctions?.length || 0
    },
    folderization: folderizationReport.summary
  };

  const structural = {
    totalGroups: duplicatesResult.duplicates?.summary?.duplicateGroups || 0,
    totalInstances: duplicatesResult.duplicates?.summary?.totalDuplicateInstances || 0,
    topIssues: (duplicatesResult.remediation?.items || []).slice(0, 5).map((item) => ({
      name: item.name || 'Unknown',
      file: item.canonical?.file || item.file || 'Unknown',
      groupSize: item.groupSize,
      urgencyScore: item.urgencyScore,
      duplicateFiles: item.duplicateFiles?.length || 0
    }))
  };

  const conceptual = {
    totalGroups: conceptualResult.summary?.actionableGroups || conceptualResult.summary?.totalGroups || 0,
    actionableGroups: conceptualResult.summary?.actionableGroups || conceptualResult.summary?.totalGroups || 0,
    rawGroups: conceptualResult.summary?.rawGroups || conceptualResult.summary?.totalGroups || 0,
    totalImplementations: conceptualResult.summary?.actionableImplementations || conceptualResult.summary?.totalImplementations || 0,
    actionableImplementations: conceptualResult.summary?.actionableImplementations || conceptualResult.summary?.totalImplementations || 0,
    rawImplementations: conceptualResult.summary?.rawImplementations || conceptualResult.summary?.totalImplementations || 0,
    highRiskGroups: conceptualResult.summary?.highRisk || 0,
    noiseByClass: conceptualResult.summary?.noiseByClass || {},
    chestDistribution: conceptualResult.summary?.chestDistribution || {},
    topIssues: (conceptualResult.groups || []).slice(0, 5).map((group) => ({
      fingerprint: group.semanticFingerprint,
      concept: group.concept,
      implementationCount: group.implementationCount,
      fileCount: group.fileCount,
      risk: group.risk
    }))
  };

  const pipelineOrphans = {
    total: pipelineHealthResult.orphanPipelineFunctions?.length || 0,
    items: (pipelineHealthResult.orphanPipelineFunctions || []).map((orphan) => ({
      name: orphan.name,
      file: orphan.file,
      complexity: orphan.complexity,
      diagnosis: orphan.diagnosis
    }))
  };

  const folderization = {
    candidates: folderizationReport.candidateReport?.topCandidates || [],
    familyState: folderizationReport.familyState,
    migrationPlans: folderizationReport.migrationPlans?.candidates || [],
    focusPlan: folderizationReport.migrationPlans?.focusCandidate || null,
    naming: folderizationReport.naming,
    namingPatterns: folderizationReport.namingPatterns,
    creationGuidance: folderizationReport.creationGuidance,
    propagation: folderizationReport.propagation || null,
    namingDebt: {
      familyCount: folderizationReport.naming?.familyCount || 0,
      renameTargetCount: folderizationReport.naming?.renameTargetCount || 0,
      renameTargetDensity: folderizationReport.naming?.familyCount
        ? Math.round((folderizationReport.naming?.renameTargetCount || 0) / folderizationReport.naming.familyCount * 100) / 100
        : 0
    },
    recommendation: folderizationReport.recommendation,
    decision: folderizationReport.decision,
    summary: folderizationReport.summary
  };
  const propagation = folderization.propagation || null;

  const debtScore = calculateTechnicalDebtScore({
    structuralGroups: structural.totalGroups,
    conceptualGroups: conceptual.totalGroups,
    highRiskConceptual: conceptual.highRiskGroups,
    pipelineOrphans: pipelineOrphans.total,
    flatFamilies: folderization.familyState?.stateCounts?.flat || 0,
    mixedFamilies: folderization.familyState?.stateCounts?.mixed || 0,
    namingFamilies: folderization.naming?.familyCount || 0,
    namingTargets: folderization.naming?.renameTargetCount || 0,
    namingPatternFamilies: folderization.namingPatterns?.totalFamilies || 0
  });

  const priorityActions = buildTechnicalDebtPriorityActions({
    structural: duplicatesResult.remediation?.items || [],
    conceptual: conceptualResult.groups || [],
    orphans: pipelineHealthResult.orphanPipelineFunctions || [],
    folderization: folderizationReport.migrationPlans?.candidates || [],
    folderizationFamilyState: folderization.familyState,
    folderizationNaming: folderization.naming,
    folderizationNamingPatterns: folderization.namingPatterns,
    folderizationCreationGuidance: folderization.creationGuidance
  });

  return {
    success: true,
    aggregationType: 'technical_debt_report',
    summary,
    structural,
    conceptual,
    pipelineOrphans,
    folderization,
    propagation,
    debtScore,
    priorityActions,
    cache: {
      hit: false,
      fingerprint
    },
    timestamp: new Date().toISOString(),
    currentSnapshot
  };
}
