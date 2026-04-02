import {
  buildEmptyFolderizationReport,
  buildFolderizationReportFromRepo
} from '../../../shared/compiler/index.js';
import {
  buildTechnicalDebtPriorityActions,
  calculateTechnicalDebtScore
} from './technical-debt-report-helpers.js';
import {
  buildEmptyConceptualResult,
  buildEmptyDuplicatesResult,
  buildEmptyPipelineHealthResult
} from './technical-debt-report-cache.js';

export async function loadTechnicalDebtReportDetails({
  aggregateTool,
  context,
  repo,
  folderizationOptions,
  currentSnapshot
} = {}) {
  const snapshotCurrent = currentSnapshot.current || {};
  const needsStructuralDetails = Number(snapshotCurrent.structuralGroups || 0) > 0;
  const needsConceptualDetails = Number(snapshotCurrent.conceptualGroups || 0) > 0
    || Number(snapshotCurrent.conceptualRawGroups || 0) > 0;
  const needsPipelineDetails = Number(snapshotCurrent.pipelineOrphans || 0) > 0;
  const needsFolderizationDetails = Number(snapshotCurrent.folderizationCandidateCount || 0) > 0
    || Number(snapshotCurrent.namingDebt || 0) > 0
    || Number(snapshotCurrent.flatFamilies || 0) > 0
    || Number(snapshotCurrent.mixedFamilies || 0) > 0;

  const [
    duplicatesResult,
    conceptualResult,
    pipelineHealthResult,
    folderizationReport
  ] = await Promise.all([
    needsStructuralDetails
      ? aggregateTool.execute({ aggregationType: 'duplicates', limit: 10 }, context)
      : buildEmptyDuplicatesResult(),
    needsConceptualDetails
      ? aggregateTool.execute({ aggregationType: 'conceptual_duplicates', limit: 10 }, context)
      : buildEmptyConceptualResult(),
    needsPipelineDetails
      ? aggregateTool.execute({ aggregationType: 'pipeline_health' }, context)
      : buildEmptyPipelineHealthResult(),
    repo
      ? (needsFolderizationDetails
        ? buildFolderizationReportFromRepo(repo, folderizationOptions)
        : buildEmptyFolderizationReport(folderizationOptions))
      : buildEmptyFolderizationReport(folderizationOptions)
  ]);

  return {
    duplicatesResult,
    conceptualResult,
    pipelineHealthResult,
    folderizationReport
  };
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
