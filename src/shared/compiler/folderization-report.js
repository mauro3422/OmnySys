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
    focusDecision: migrationPlans?.focusCandidate?.decision || decision || 'reject',
    recommendationStrategy: recommendation?.strategy || null
  };
}

function buildFolderizationReport({
  rows,
  candidateList,
  familyState,
  migrationPlans,
  naming,
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
  const summary = buildFolderizationSummary({
    candidateReport,
    familyState,
    migrationPlans,
    naming,
    decision: existingFolderizedFamily ? 'already_folderized' : migrationPlans?.focusCandidate?.decision || 'reject',
    recommendation
  });

  return {
    rowsLoaded: rows.length,
    candidateReport,
    familyState,
    migrationPlans,
    naming,
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
