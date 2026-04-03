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
  buildFolderizationNamingReportFromRows,
  findBestFolderizedFamilyForPaths
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

function normalizeGuidancePath(value = '') {
  const normalized = normalizeFolderizationPath(value);
  if (!normalized) {
    return null;
  }

  if (normalized.endsWith('.js')) {
    const slashIndex = normalized.lastIndexOf('/');
    return slashIndex > 0 ? normalized.slice(0, slashIndex) : normalized;
  }

  return normalized;
}

function splitPathSegments(path = '') {
  return String(path || '')
    .split('/')
    .map((segment) => segment.trim())
    .filter(Boolean);
}

function getPathTailSegment(path = '') {
  const segments = splitPathSegments(path);
  return segments.length > 0 ? segments[segments.length - 1] : '';
}

function countSharedPrefixSegments(left = '', right = '') {
  const leftSegments = splitPathSegments(left);
  const rightSegments = splitPathSegments(right);
  const limit = Math.min(leftSegments.length, rightSegments.length);
  let shared = 0;

  for (let index = 0; index < limit; index += 1) {
    if (leftSegments[index] !== rightSegments[index]) {
      break;
    }
    shared += 1;
  }

  return shared;
}

function scoreGuidanceFamily(family, anchorPath = '') {
  if (!family?.directory) {
    return 0;
  }

  const normalizedAnchor = normalizeGuidancePath(anchorPath);
  if (!normalizedAnchor) {
    return 0;
  }

  const normalizedDirectory = normalizeFolderizationPath(family.directory);
  let score = 0;

  if (normalizedAnchor === normalizedDirectory) {
    score += 500;
  } else if (normalizedAnchor.startsWith(`${normalizedDirectory}/`)) {
    score += 400 + normalizedDirectory.length;
  } else if (normalizedDirectory.startsWith(`${normalizedAnchor}/`)) {
    score += 250 + normalizedAnchor.length;
  } else {
    score += countSharedPrefixSegments(normalizedAnchor, normalizedDirectory) * 50;
  }

  score += family.migrationState === 'already_folderized' ? 30 : 0;
  score += family.migrationState === 'mixed' ? 18 : 0;
  score += Math.min(20, Number(family.folderFileCount || 0) + Number(family.rootFileCount || 0));

  return score;
}

function selectGuidanceFamily(familyState = {}, scopePath = null, focusPath = null) {
  const families = Array.isArray(familyState?.topFamilies) ? familyState.topFamilies : [];
  const anchorPaths = [focusPath, scopePath]
    .map(normalizeGuidancePath)
    .filter(Boolean);
  const reusableFamilies = families.filter((family) => family.migrationState === 'already_folderized' || family.migrationState === 'mixed');
  const candidateFamilies = reusableFamilies.length > 0 ? reusableFamilies : families;

  if (candidateFamilies.length === 0) {
    return {
      family: null,
      matchedBy: 'global',
      scopePath: normalizeGuidancePath(scopePath),
      focusPath: normalizeGuidancePath(focusPath),
      selectionReason: 'No reusable family metadata is available'
    };
  }

  const scoredFamilies = candidateFamilies.map((family) => {
    const scores = anchorPaths.map((anchorPath) => scoreGuidanceFamily(family, anchorPath));
    const bestAnchorScore = scores.length > 0 ? Math.max(...scores) : 0;

    return {
      family,
      score: bestAnchorScore,
      hasScopedMatch: bestAnchorScore > 0,
      scopeHits: scores.filter((score) => score > 0).length
    };
  }).sort((a, b) => b.score - a.score || b.scopeHits - a.scopeHits || (b.family.folderFileCount + b.family.rootFileCount) - (a.family.folderFileCount + a.family.rootFileCount) || a.family.familyRoot.localeCompare(b.family.familyRoot));

  const selected = scoredFamilies[0] || null;
  const selectedFamily = selected?.family || null;
  const matchedBy = selected?.hasScopedMatch
    ? (focusPath ? 'focusPath' : 'scopePath')
    : 'global';
  const selectionReason = selected?.hasScopedMatch
    ? `Selected ${selectedFamily.directory}/${selectedFamily.familyRoot} from DB-backed family metadata`
    : `Selected ${selectedFamily.directory}/${selectedFamily.familyRoot} from the strongest reusable family in the DB`;

  return {
    family: selectedFamily,
    matchedBy,
    scopePath: normalizeGuidancePath(scopePath),
    focusPath: normalizeGuidancePath(focusPath),
    selectionReason
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

function buildFolderizationPropagationSummary({
  candidateReport,
  familyState,
  migrationPlans,
  naming,
  creationGuidance,
  recommendation,
  decision
}) {
  const focusPlan = migrationPlans?.focusCandidate || null;
  const importImpact = focusPlan?.importImpact || null;
  const moveTargets = Array.isArray(focusPlan?.moveTargets) ? focusPlan.moveTargets : [];
  const impactedFiles = Array.isArray(importImpact?.impactedFiles) ? importImpact.impactedFiles : [];
  const topImpactedFiles = impactedFiles.slice(0, 5).map((item) => ({
    filePath: item.filePath || null,
    importCount: Number(item.importCount || 0),
    matchedImports: Array.isArray(item.matchedImports) ? item.matchedImports.slice(0, 5) : [],
    dependencyCount: Number(item.dependencyCount || item.importCount || 0)
  }));
  const topCandidates = Array.isArray(migrationPlans?.candidates)
    ? migrationPlans.candidates.slice(0, 5).map((plan) => ({
        familyRoot: plan?.candidate?.familyRoot || null,
        directory: plan?.candidate?.directory || null,
        decision: plan?.decision || null,
        moveTargetCount: Array.isArray(plan?.moveTargets) ? plan.moveTargets.length : 0,
        impactedFileCount: Number(plan?.importImpact?.impactedFileCount || 0),
        rewriteCount: Number(plan?.importImpact?.rewriteCount || 0)
      }))
    : [];
  const moveTargetCount = moveTargets.length;
  const impactedFileCount = Number(importImpact?.impactedFileCount || 0);
  const rewriteCount = Number(importImpact?.rewriteCount || 0);
  const renameTargetCount = Number(naming?.renameTargetCount || 0);
  const validationTargetCount = moveTargetCount + impactedFileCount + (focusPlan?.candidate?.barrelFile ? 1 : 0);

  return {
    decision: decision || focusPlan?.decision || 'reject',
    mode: focusPlan?.decision === 'approve'
      ? 'move_and_rewrite'
      : focusPlan?.decision === 'review'
        ? 'review'
        : focusPlan?.decision === 'already_folderized'
          ? 'rename_only'
          : 'blocked',
    moveTargetCount,
    impactedFileCount,
    rewriteCount,
    renameTargetCount,
    validationTargetCount,
    hasCrossFamilyPropagation: impactedFileCount > 0 || rewriteCount > 0,
    topImpactedFiles,
    topCandidates,
    candidateCount: Number(candidateReport?.candidateCount || 0),
    flatFamilies: Number(familyState?.stateCounts?.flat || 0),
    mixedFamilies: Number(familyState?.stateCounts?.mixed || 0),
    alreadyFolderizedFamilies: Number(familyState?.stateCounts?.already_folderized || 0),
    guidance: creationGuidance?.guidance || null,
    recommendationStrategy: recommendation?.strategy || null
  };
}

function buildFolderizationSummary({
  candidateReport,
  familyState,
  migrationPlans,
  naming,
  namingPatterns,
  creationGuidance,
  decision,
  recommendation,
  drift,
  propagation
}) {
  return {
    candidateCount: candidateReport?.candidateCount || 0,
    flatFamilies: familyState?.stateCounts?.flat || 0,
    mixedFamilies: familyState?.stateCounts?.mixed || 0,
    alreadyFolderizedFamilies: familyState?.stateCounts?.already_folderized || 0,
    namingFamilies: naming?.familyCount || 0,
    namingTargets: naming?.renameTargetCount || 0,
    namingPatternCounts: namingPatterns?.patternCounts || {},
    guidanceScopePath: creationGuidance?.scopePath || null,
    guidanceFocusPath: creationGuidance?.focusPath || null,
    focusDecision: migrationPlans?.focusCandidate?.decision || decision || 'reject',
    recommendationStrategy: recommendation?.strategy || null,
    propagationMoveTargets: propagation?.moveTargetCount || 0,
    propagationImpactedFiles: propagation?.impactedFileCount || 0,
    propagationRewriteCount: propagation?.rewriteCount || 0,
    propagationValidationTargets: propagation?.validationTargetCount || 0,
    propagationMode: propagation?.mode || 'blocked',
    driftState: drift?.state || 'fresh',
    driftScore: drift?.score || 0,
    driftReason: drift?.reason || null,
    driftRecommendation: drift?.recommendation || null,
    driftEvidence: drift?.evidence || null
  };
}

function buildFolderizationDriftSignal({
  databaseHealthy = true,
  liveRowSyncState = 'fresh',
  candidateReport = null,
  familyState = null,
  naming = null,
  recommendation = null
} = {}) {
  const candidateCount = Number(candidateReport?.candidateCount || 0);
  const flatFamilies = Number(familyState?.stateCounts?.flat || 0);
  const mixedFamilies = Number(familyState?.stateCounts?.mixed || 0);
  const namingTargets = Number(naming?.renameTargetCount || 0);
  const namingDebt = Number(naming?.renameTargetCount || 0);
  const hasStructuralPressure = candidateCount > 0 || flatFamilies > 0 || mixedFamilies > 0 || namingTargets > 0 || namingDebt > 0;

  if (!databaseHealthy) {
    return {
      state: 'blocked',
      score: 100,
      reason: 'Database health is not trustworthy, so folderization guidance should not be consumed.',
      recommendation: 'Reconcile database projections before using folderization to guide new moves.',
      evidence: { liveRowSyncState, candidateCount, flatFamilies, mixedFamilies, namingTargets, namingDebt }
    };
  }

  if (liveRowSyncState === 'blocked') {
    return {
      state: 'blocked',
      score: 90,
      reason: 'Live row sync is blocked, which can invalidate folderization guidance.',
      recommendation: 'Reconcile the live support tables before trusting folderization guidance.',
      evidence: { liveRowSyncState, candidateCount, flatFamilies, mixedFamilies, namingTargets, namingDebt }
    };
  }

  if (liveRowSyncState === 'stale' || liveRowSyncState === 'partial') {
    return {
      state: 'stale',
      score: 50,
      reason: 'Folderization is being evaluated against a partially drifted support surface.',
      recommendation: recommendation?.message || 'Use the folderization snapshot only after live-row reconciliation stabilizes.',
      evidence: { liveRowSyncState, candidateCount, flatFamilies, mixedFamilies, namingTargets, namingDebt }
    };
  }

  if (hasStructuralPressure) {
    return {
      state: 'fresh',
      score: 20,
      reason: 'Folderization pressure exists but the support surface is consistent enough to trust.',
      recommendation: recommendation?.message || 'Keep folderization decisions tied to the strongest reusable family and avoid extra barrels.',
      evidence: { liveRowSyncState, candidateCount, flatFamilies, mixedFamilies, namingTargets, namingDebt }
    };
  }

  return {
    state: 'fresh',
    score: 0,
    reason: 'Folderization support surfaces are aligned.',
    recommendation: recommendation?.message || 'Reuse the closest canonical family and keep barrel logic thin.',
    evidence: { liveRowSyncState, candidateCount, flatFamilies, mixedFamilies, namingTargets, namingDebt }
  };
}

function buildFolderizationCreationGuidance({
  rows,
  familyState,
  namingPatterns,
  naming,
  scopePath = null,
  focusPath = null
}) {
  const topFamilyPatterns = Array.isArray(namingPatterns?.topFamilyPatterns)
    ? namingPatterns.topFamilyPatterns.slice(0, 5)
    : [];
  const folderizedScopeSuggestion = (scopePath || focusPath)
    ? findBestFolderizedFamilyForPaths(rows || [], [focusPath, scopePath], { minFileCount: 1 })
    : null;
  const selectionAnchor = normalizeGuidancePath(focusPath || scopePath);
  const selectionAnchorTail = getPathTailSegment(selectionAnchor || '');
  const folderizedScopeMatchesAnchor = Boolean(folderizedScopeSuggestion)
    && Boolean(selectionAnchorTail)
    && (
      folderizedScopeSuggestion.familyRoot === selectionAnchorTail
      || getPathTailSegment(folderizedScopeSuggestion.directory) === selectionAnchorTail
    );
  const selection = folderizedScopeSuggestion
    && folderizedScopeMatchesAnchor
    ? {
        family: folderizedScopeSuggestion,
        matchedBy: focusPath ? 'focusPath' : 'scopePath',
        scopePath: normalizeGuidancePath(scopePath),
        focusPath: normalizeGuidancePath(focusPath),
        selectionReason: `DB-backed folderized family match: reuse ${folderizedScopeSuggestion.directory}`
      }
    : selectGuidanceFamily(familyState, scopePath, focusPath);
  const preferredFamily = selection.family || null;
  const preferredFolder = preferredFamily
    ? (folderizedScopeSuggestion ? preferredFamily.directory : `${preferredFamily.directory}/${preferredFamily.familyRoot}`)
    : null;
  const preferredRoleStems = Array.isArray(namingPatterns?.topRecommendedStems)
    ? namingPatterns.topRecommendedStems.slice(0, 5)
    : [];
  const scopeContext = {
    scopePath: selection.scopePath,
    focusPath: selection.focusPath,
    matchedBy: selection.matchedBy,
    familyDomain: preferredFamily?.directory || null,
    barrelPolicy: 'keep index.js as the barrel surface for folderized families',
    helperPolicy: 'prefer role-only helper basenames inside the selected family',
    collisionPolicy: 'append a family-specific suffix only when a role basename collides',
    selectionReason: selection.selectionReason
  };

  return {
    mode: preferredFamily?.migrationState === 'already_folderized'
      ? 'reuse_existing_family_folder'
      : preferredFamily
        ? 'create_folderized_family'
        : 'role_pattern_guided',
    ...scopeContext,
    preferredFolder,
    preferredFamilyRoot: preferredFamily?.familyRoot || null,
    preferredDirectory: preferredFamily?.directory || null,
    preferredRoleStems,
    familyExamples: topFamilyPatterns,
    guidance: preferredFolder
      ? `${selection.selectionReason}. Create the next file inside ${preferredFolder} using a short role basename such as ${preferredRoleStems[0]?.stem || (naming?.topFamilies?.[0]?.renameTargets?.[0]?.recommendedName || 'core.js')}.`
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
  scopePath,
  focusPath,
  focusCandidate,
  existingFolderizedFamily,
  databaseHealthy = true,
  liveRowSyncState = 'fresh'
}) {
  const creationGuidance = buildFolderizationCreationGuidance({
    rows,
    familyState,
    namingPatterns,
    naming,
    scopePath,
    focusPath
  });
  const recommendation = buildFolderizationRecommendation({
    decision: existingFolderizedFamily ? 'already_folderized' : migrationPlans?.focusCandidate?.decision || (candidateList.length > 0 ? 'review' : 'reject'),
    candidate: focusCandidate,
    migrationPlan: migrationPlans?.focusCandidate || null,
    existingFolderizedFamily
  });
  const candidateReport = buildFolderizationCandidateReport(candidateList);
  const drift = buildFolderizationDriftSignal({
    databaseHealthy,
    liveRowSyncState,
    candidateReport,
    familyState,
    naming,
    recommendation
  });
  const propagation = buildFolderizationPropagationSummary({
    candidateReport,
    familyState,
    migrationPlans,
    naming,
    creationGuidance,
    recommendation,
    decision: existingFolderizedFamily ? 'already_folderized' : migrationPlans?.focusCandidate?.decision || 'reject'
  });
  const summary = buildFolderizationSummary({
    candidateReport,
    familyState,
    migrationPlans,
    naming,
    namingPatterns,
    creationGuidance,
    decision: existingFolderizedFamily ? 'already_folderized' : migrationPlans?.focusCandidate?.decision || 'reject',
    recommendation,
    drift,
    propagation
  });

  return {
    rowsLoaded: rows.length,
    candidateReport,
    familyState,
    migrationPlans,
    naming,
    namingPatterns: namingPatterns || null,
    creationGuidance,
    propagation,
    scopePath: creationGuidance.scopePath || null,
    focusPath: creationGuidance.focusPath || null,
    focusCandidate: focusCandidate || null,
    existingFolderizedFamily: existingFolderizedFamily || null,
    recommendation,
    drift,
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
        namingPatternCounts: {},
        guidanceScopePath: null,
        guidanceFocusPath: null,
        focusDecision: 'reject',
        recommendationStrategy: null,
        propagationMoveTargets: 0,
        propagationImpactedFiles: 0,
        propagationRewriteCount: 0,
        propagationValidationTargets: 0,
        propagationMode: 'blocked'
      }
    };
  }

  const rows = loadFolderizationRows(repo);
  return buildFolderizationReportFromRows(rows, options);
}

export function buildEmptyFolderizationReport(options = {}) {
  return buildFolderizationReportFromRepo(null, options);
}
