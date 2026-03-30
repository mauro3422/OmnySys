import { getRecommendation } from './recommendations/RecommendationEngine.js';
import { loadFolderizationRows, normalizeFolderizationPath } from './directory-structure-folderization-data.js';
import {
  buildFolderizationCandidateReport,
  buildFolderizationFamilyStateReportFromRows,
  findExistingFolderizedFamilyForPathsFromRows,
  findFolderizationCandidateForPaths,
  findFolderizationCandidatesFromRepo,
  findFolderizationCandidatesFromRows
} from './directory-structure-folderization-analysis.js';
import {
  buildFolderizationMigrationPlanFromRepo,
  buildFolderizationMigrationPlanFromRows
} from './directory-structure-folderization-migration.js';
import {
  buildFolderizationNamingReportFromRepo,
  buildFolderizationNamingReportFromRows
} from './directory-structure-folderization-naming.js';

function normalizeFocusPaths(filePaths = []) {
  return filePaths
    .map((filePath) => normalizeFolderizationPath(filePath))
    .filter(Boolean);
}

function buildEmptyRecommendation() {
  return {
    message: 'No folderization candidate available',
    action: 'Review folderization signals after more helpers are extracted',
    strategy: 'folderization',
    alternatives: []
  };
}

function buildFolderizationRecommendation({
  decision,
  candidate,
  migrationPlan,
  existingFolderizedFamily
}) {
  if (decision === 'already_folderized') {
    return getRecommendation({
      type: 'folderization_naming',
      context: {
        alreadyFolderized: true,
        familyRoot: existingFolderizedFamily?.familyRoot || candidate?.familyRoot || '',
        directory: existingFolderizedFamily?.directory || candidate?.directory || '',
        recommendedFolder: existingFolderizedFamily?.recommendedFolder || candidate?.recommendedFolder || '',
        barrelFile: existingFolderizedFamily?.barrelFile || candidate?.barrelFile?.path || null
      }
    });
  }

  if (candidate || migrationPlan) {
    return getRecommendation({
      type: 'flat_family_sprawl',
      context: {
        alreadyFolderized: false,
        familyRoot: candidate?.familyRoot || migrationPlan?.candidate?.familyRoot || '',
        directory: candidate?.directory || migrationPlan?.candidate?.directory || '',
        recommendedFolder: candidate?.recommendedFolder || migrationPlan?.candidate?.recommendedFolder || '',
        barrelFile: candidate?.barrelFile?.path || migrationPlan?.candidate?.barrelFile || null,
        instanceCount: candidate?.fileCount || migrationPlan?.candidate?.fileCount || 0
      }
    });
  }

  return buildEmptyRecommendation();
}

function buildFolderizationSummary({
  candidateReport,
  familyState,
  migrationPlans,
  naming,
  namingPatterns,
  decision,
  recommendation
}) {
  return {
    candidateCount: candidateReport?.candidateCount || 0,
    flatFamilies: familyState?.stateCounts?.flat || 0,
    mixedFamilies: familyState?.stateCounts?.mixed || 0,
    alreadyFolderizedFamilies: familyState?.stateCounts?.already_folderized || 0,
    namingFamilies: naming?.familyCount || 0,
    namingTargets: naming?.renameTargetCount || 0,
    namingPatternCounts: namingPatterns?.patternCounts || {},
    focusDecision: migrationPlans?.focusCandidate?.decision || decision || 'reject',
    recommendationStrategy: recommendation?.strategy || null
  };
}

function buildFolderizationCreationGuidance({
  familyState,
  namingPatterns,
  naming
}) {
  const topFamilyPatterns = Array.isArray(namingPatterns?.topFamilyPatterns)
    ? namingPatterns.topFamilyPatterns.slice(0, 5)
    : [];
  const preferredFamilies = Array.isArray(familyState?.topFamilies)
    ? familyState.topFamilies
        .filter((family) => family.migrationState === 'already_folderized' || family.migrationState === 'mixed')
        .slice(0, 5)
    : [];
  const fallbackFamilies = preferredFamilies.length > 0
    ? preferredFamilies
    : Array.isArray(familyState?.topFamilies)
      ? familyState.topFamilies.slice(0, 5)
      : [];
  const preferredFamily = fallbackFamilies[0] || null;
  const preferredFolder = preferredFamily
    ? `${preferredFamily.directory}/${preferredFamily.familyRoot}`
    : null;
  const preferredRoleStems = Array.isArray(namingPatterns?.topRecommendedStems)
    ? namingPatterns.topRecommendedStems.slice(0, 5)
    : [];

  return {
    mode: preferredFamily?.migrationState === 'already_folderized'
      ? 'reuse_existing_family_folder'
      : preferredFamily
        ? 'create_folderized_family'
        : 'role_pattern_guided',
    preferredFolder,
    preferredFamilyRoot: preferredFamily?.familyRoot || null,
    preferredDirectory: preferredFamily?.directory || null,
    preferredRoleStems,
    familyExamples: topFamilyPatterns,
    guidance: preferredFolder
      ? `Create the next file inside ${preferredFolder} using a short role basename such as ${preferredRoleStems[0]?.stem || (naming?.topFamilies?.[0]?.renameTargets?.[0]?.recommendedName || 'core.js')}.`
      : 'Use role-only basenames and create the next helper under the closest folderized family, keeping the barrel at index.js.'
  };
}

function buildFolderizationReport({
  rows,
  candidateList,
  familyState,
  migrationPlans,
  naming,
  namingPatterns,
  focusCandidate,
  existingFolderizedFamily
}) {
  const recommendation = buildFolderizationRecommendation({
    decision: existingFolderizedFamily ? 'already_folderized' : migrationPlans?.focusCandidate?.decision || (candidateList.length > 0 ? 'review' : 'reject'),
    candidate: focusCandidate,
    migrationPlan: migrationPlans?.focusCandidate || null,
    existingFolderizedFamily
  });

  const candidateReport = buildFolderizationCandidateReport(candidateList);
  const creationGuidance = buildFolderizationCreationGuidance({
    familyState,
    namingPatterns,
    naming
  });
  const summary = buildFolderizationSummary({
    candidateReport,
    familyState,
    migrationPlans,
    naming,
    namingPatterns,
    decision: existingFolderizedFamily ? 'already_folderized' : migrationPlans?.focusCandidate?.decision || 'reject',
    recommendation
  });

  return {
    rowsLoaded: rows.length,
    candidateReport,
    familyState,
    migrationPlans,
    naming,
    namingPatterns: namingPatterns || null,
    creationGuidance,
    focusCandidate: focusCandidate || null,
    existingFolderizedFamily: existingFolderizedFamily || null,
    recommendation,
    decision: existingFolderizedFamily ? 'already_folderized' : migrationPlans?.focusCandidate?.decision || 'reject',
    summary
  };
}

export function buildFolderizationReportFromRows(rows = [], options = {}) {
  const candidateList = findFolderizationCandidatesFromRows(rows, options);
  const familyState = buildFolderizationFamilyStateReportFromRows(rows);
  const migrationPlans = {
    candidateCount: 0,
    focusCandidate: null,
    candidates: []
  };
  const naming = buildFolderizationNamingReportFromRows(rows);
  const normalizedFocusPaths = normalizeFocusPaths(Array.isArray(options.filePaths) ? options.filePaths : []);
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
    focusCandidate,
    existingFolderizedFamily
  });
}

export function buildFolderizationReportFromRepo(repo, options = {}) {
  if (!repo?.db?.prepare) {
    return {
      rowsLoaded: 0,
      candidateReport: { candidateCount: 0, topCandidates: [] },
      familyState: { totalFamilies: 0, stateCounts: { flat: 0, mixed: 0, already_folderized: 0 }, topFamilies: [] },
      migrationPlans: { candidateCount: 0, focusCandidate: null, candidates: [] },
      naming: { familyCount: 0, renameTargetCount: 0, topFamilies: [] },
      namingPatterns: { totalFamilies: 0, totalTargets: 0, patternCounts: {}, topFamilyPatterns: [], topRecommendedStems: [] },
      creationGuidance: {
        mode: 'role_pattern_guided',
        preferredFolder: null,
        preferredFamilyRoot: null,
        preferredDirectory: null,
        preferredRoleStems: [],
        familyExamples: [],
        guidance: 'Use role-only basenames and create the next helper under the closest folderized family, keeping the barrel at index.js.'
      },
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
        namingPatternCounts: {},
        focusDecision: 'reject',
        recommendationStrategy: null
      }
    };
  }

  const rows = loadFolderizationRows(repo);
  return buildFolderizationReportFromRows(rows, options);
}

export function buildEmptyFolderizationReport() {
  return buildFolderizationReportFromRepo(null);
}
