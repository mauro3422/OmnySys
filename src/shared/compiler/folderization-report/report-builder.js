import { loadFolderizationRows } from '../directory-structure-folderization-data.js';
import {
  buildFolderizationCandidateReport,
  buildFolderizationFamilyStateReportFromRows,
  findExistingFolderizedFamilyForPathsFromRows,
  findFolderizationCandidateForPaths,
  findFolderizationCandidatesFromRows
} from '../directory-structure-folderization/analysis.js';
import {
  buildFolderizationMigrationPlanFromRepo,
  buildFolderizationMigrationPlanFromRows
} from '../directory-structure-folderization-migration.js';
import {
  buildFolderizationNamingReportFromRepo,
  buildFolderizationNamingReportFromRows,
  findBestFolderizedFamilyForPaths
} from '../directory-structure-folderization-naming/index.js';
import {
  buildFolderizationNormalizationPlanFromRepo,
  buildFolderizationNormalizationPlanFromRows
} from '../folderization-normalizer.js';
import { normalizeFocusPaths, normalizeGuidancePath } from './path-utils.js';
import { buildFolderizationRecommendation, buildEmptyRecommendation } from './recommendations.js';
import { buildFolderizationPropagationSummary } from './propagation-summary.js';
import { buildFolderizationSummary } from './summary-builder.js';
import { buildFolderizationDriftSignal, buildFolderizationContractDriftSignal } from './drift-signal.js';
import { buildFolderizationNamingDriftSignal } from './naming-drift-signal.js';
import { buildFolderizationCreationGuidance } from './creation-guidance.js';

function alignCreationGuidanceToTopCandidate(creationGuidance = {}, candidateReport = null) {
  const topCandidate = Array.isArray(candidateReport?.topCandidates)
    ? candidateReport.topCandidates[0] || null
    : null;

  if (!topCandidate?.recommendedFolder) {
    return creationGuidance;
  }

  const preferredFolder = topCandidate.recommendedFolder;
  if (creationGuidance?.preferredFolder === preferredFolder) {
    return creationGuidance;
  }

  return {
    ...creationGuidance,
    mode: 'create_folderized_family',
    matchedBy: 'candidateReport',
    familyDomain: topCandidate.directory || creationGuidance?.familyDomain || null,
    selectionReason: `Top folderization candidate from the DB is ${topCandidate.familyRoot} in ${topCandidate.directory}.`,
    preferredFolder,
    preferredFamilyRoot: topCandidate.familyRoot || creationGuidance?.preferredFamilyRoot || null,
    preferredDirectory: topCandidate.directory || creationGuidance?.preferredDirectory || null,
    guidance: `Top folderization candidate from the DB is ${topCandidate.familyRoot} in ${topCandidate.directory}. Create the next file inside ${preferredFolder} using a short role basename such as ${(creationGuidance?.preferredRoleStems || [])[0]?.stem || 'core.js'}.`
  };
}

function buildFolderizationReport({
  rows,
  candidateList,
  familyState,
  migrationPlans,
  naming,
  namingPatterns,
  scopePath,
  focusPath,
  focusCandidate,
  existingFolderizedFamily,
  databaseHealthy = true,
  liveRowSyncState = 'fresh'
}) {
  const candidateReport = buildFolderizationCandidateReport(candidateList);
  const creationGuidance = alignCreationGuidanceToTopCandidate(
    buildFolderizationCreationGuidance({
      rows,
      familyState,
      candidateReport,
      namingPatterns,
      naming,
      scopePath,
      focusPath
    }),
    candidateReport
  );
  const normalization = buildFolderizationNormalizationPlanFromRows(rows, [
    focusPath,
    scopePath,
    naming?.topFamilies?.[0]?.renameTargets?.[0]?.from || null,
    naming?.topFamilies?.[0]?.directory || null
  ].filter(Boolean), {
    mode: 'plan',
    candidatePath: focusPath || scopePath || naming?.topFamilies?.[0]?.directory || null
  });
  const recommendation = buildFolderizationRecommendation({
      decision: existingFolderizedFamily ? 'already_folderized' : migrationPlans?.focusCandidate?.decision || (candidateList.length > 0 ? 'review' : 'reject'),
      candidate: focusCandidate,
      migrationPlan: migrationPlans?.focusCandidate || null,
      existingFolderizedFamily
    });
  const drift = buildFolderizationDriftSignal({
    databaseHealthy,
    liveRowSyncState,
    candidateReport,
    familyState,
    naming,
    recommendation
  });
  const namingDrift = buildFolderizationNamingDriftSignal({
    databaseHealthy,
    liveRowSyncState,
    naming,
    familyState,
    recommendation
  });
  const propagation = buildFolderizationPropagationSummary({
    candidateReport,
    familyState,
    migrationPlans,
    naming,
    creationGuidance,
    recommendation,
    decision: existingFolderizedFamily ? 'already_folderized' : migrationPlans?.focusCandidate?.decision || 'reject',
    drift
  });
  const contractDrift = buildFolderizationContractDriftSignal({
    drift,
    namingDrift,
    propagation,
    normalization,
    decision: existingFolderizedFamily ? 'already_folderized' : migrationPlans?.focusCandidate?.decision || 'reject',
    recommendation
  });
  const summary = buildFolderizationSummary({
    candidateReport,
    familyState,
    migrationPlans,
    naming,
    namingPatterns,
    normalization,
    creationGuidance,
    decision: existingFolderizedFamily ? 'already_folderized' : migrationPlans?.focusCandidate?.decision || 'reject',
    recommendation,
    drift,
    namingDrift,
    propagation,
    contractDrift
  });

  return {
    rowsLoaded: rows.length,
    candidateReport,
    familyState,
    migrationPlans,
    naming,
    namingPatterns: namingPatterns || null,
    normalization,
    creationGuidance,
    propagation,
    scopePath: creationGuidance.scopePath || null,
    focusPath: creationGuidance.focusPath || null,
    focusCandidate: focusCandidate || null,
    existingFolderizedFamily: existingFolderizedFamily || null,
    recommendation,
    drift,
    namingDrift,
    contractDrift,
    decision: existingFolderizedFamily ? 'already_folderized' : migrationPlans?.focusCandidate?.decision || 'reject',
    summary
  };
}

function buildFolderizationReportFromRows(rows = [], options = {}) {
  const candidateList = findFolderizationCandidatesFromRows(rows, options);
  const familyState = buildFolderizationFamilyStateReportFromRows(rows);
  const migrationPlans = {
    candidateCount: 0,
    focusCandidate: null,
    candidates: []
  };
  const naming = buildFolderizationNamingReportFromRows(rows);
  const normalizedScopePath = normalizeGuidancePath(options.scopePath || null);
  const normalizedFocusPath = normalizeGuidancePath(options.focusPath || null);
  const normalizedFocusPaths = [
    ...normalizeFocusPaths(Array.isArray(options.filePaths) ? options.filePaths : []),
    ...(normalizedFocusPath ? [normalizedFocusPath] : []),
    ...(normalizedScopePath ? [normalizedScopePath] : [])
  ];
  const focusCandidate = normalizedFocusPaths.length > 0
    ? findFolderizationCandidateForPaths(candidateList, normalizedFocusPaths)
    : candidateList[0] || null;
  const existingFolderizedFamily = normalizedFocusPaths.length > 0
    ? findExistingFolderizedFamilyForPathsFromRows(rows, normalizedFocusPaths, options)
    : null;

  if (focusCandidate) {
    migrationPlans.focusCandidate = buildFolderizationMigrationPlanFromRows(focusCandidate, rows);
  }

  migrationPlans.candidateCount = candidateList.length;
  migrationPlans.candidates = candidateList.map((candidate) => buildFolderizationMigrationPlanFromRows(candidate, rows));

  return buildFolderizationReport({
    rows,
    candidateList,
    familyState,
    migrationPlans,
    naming,
    namingPatterns: naming.patternSummary || null,
    scopePath: options.scopePath || null,
    focusPath: options.focusPath || null,
    focusCandidate,
    existingFolderizedFamily,
    databaseHealthy: options.databaseHealthy !== false,
    liveRowSyncState: options.liveRowSyncState || 'fresh'
  });
}

function buildFolderizationReportFromRepo(repo, options = {}) {
  if (!repo?.db?.prepare) {
    return {
      rowsLoaded: 0,
      candidateReport: { candidateCount: 0, topCandidates: [] },
      familyState: { totalFamilies: 0, stateCounts: { flat: 0, mixed: 0, already_folderized: 0 }, topFamilies: [] },
      migrationPlans: { candidateCount: 0, focusCandidate: null, candidates: [] },
      naming: { familyCount: 0, renameTargetCount: 0, topFamilies: [] },
      normalization: {
        success: false,
        mode: 'plan',
        candidatePath: null,
        candidatePaths: [],
        analysis: {
          naming: {
            familyCount: 0,
            renameTargetCount: 0,
            topFamilies: [],
            patternSummary: {
              totalFamilies: 0,
              totalTargets: 0,
              patternCounts: {},
              topFamilyPatterns: [],
              topRecommendedStems: []
            }
          },
          safety: {
            level: 'none',
            density: 0,
            reasons: []
          },
          recommendation: {
            action: 'noop',
            reason: 'No folderization normalization plan available.'
          }
        },
        plan: null,
        summary: {
          candidatePath: null,
          candidatePaths: [],
          familyRoot: null,
          directory: null,
          familyCount: 0,
          renameTargetCount: 0,
          renameTargetDensity: 0,
          safetyLevel: 'none',
          recommendedAction: 'noop',
          topFamilyRenameTargetCount: 0,
          patternSummary: {
            totalFamilies: 0,
            totalTargets: 0,
            patternCounts: {},
            topFamilyPatterns: [],
            topRecommendedStems: []
          }
        }
      },
      namingPatterns: { totalFamilies: 0, totalTargets: 0, patternCounts: {}, topFamilyPatterns: [], topRecommendedStems: [] },
      creationGuidance: {
        mode: 'role_pattern_guided',
        scopePath: null,
        focusPath: null,
        matchedBy: 'global',
        familyDomain: null,
        barrelPolicy: 'keep index.js as the barrel surface for folderized families',
        helperPolicy: 'prefer role-only helper basenames inside the selected family',
        collisionPolicy: 'append a family-specific suffix only when a role basename collides',
        selectionReason: 'No reusable family metadata is available',
        preferredFolder: null,
        preferredFamilyRoot: null,
        preferredDirectory: null,
        preferredRoleStems: [],
        familyExamples: [],
        guidance: 'Use role-only basenames and create the next helper under the closest folderized family, keeping the barrel at index.js.'
      },
      propagation: {
        decision: 'reject',
        mode: 'blocked',
        cacheKey: null,
        cacheHit: false,
        moveTargetCount: 0,
        impactedFileCount: 0,
        rewriteCount: 0,
        renameTargetCount: 0,
        validationTargetCount: 0,
        hasCrossFamilyPropagation: false,
        topImpactedFiles: [],
        topCandidates: [],
        candidateCount: 0,
        flatFamilies: 0,
        mixedFamilies: 0,
        alreadyFolderizedFamilies: 0,
        guidance: null,
        recommendationStrategy: null
      },
      scopePath: null,
      focusPath: null,
      focusCandidate: null,
      existingFolderizedFamily: null,
      recommendation: buildEmptyRecommendation(),
      decision: 'reject',
      summary: {
        candidateCount: 0,
        flatFamilies: 0,
        mixedFamilies: 0,
        alreadyFolderizedFamilies: 0,
        namingFamilies: 0,
        namingTargets: 0,
        normalizationTargets: 0,
        normalizationAction: 'noop',
        normalizationSafetyLevel: 'none',
        normalizationDensity: 0,
        namingPatternCounts: {},
        guidanceScopePath: null,
        guidanceFocusPath: null,
        focusDecision: 'reject',
        recommendationStrategy: null,
        propagationMoveTargets: 0,
        propagationImpactedFiles: 0,
        propagationRewriteCount: 0,
        propagationValidationTargets: 0,
        propagationMode: 'blocked',
        propagationCacheKey: null,
        propagationCacheHit: false
      }
    };
  }

  const rows = loadFolderizationRows(repo);
  return buildFolderizationReportFromRows(rows, options);
}

function buildEmptyFolderizationReport(options = {}) {
  return buildFolderizationReportFromRepo(null, options);
}

export {
  buildFolderizationReport,
  buildFolderizationReportFromRows,
  buildFolderizationReportFromRepo,
  buildEmptyFolderizationReport
};
