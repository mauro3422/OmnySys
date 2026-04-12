import {
  buildFolderizationNamingPlanFromRows,
  buildFolderizationNamingReportFromRows,
  loadFolderizationRowsForNaming
} from './directory-structure-folderization-naming/index.js';
import { normalizeSnapshotPath } from './snapshot-path.js';

function normalizeCandidatePaths(candidatePaths = []) {
  return Array.from(new Set(
    (Array.isArray(candidatePaths) ? candidatePaths : [candidatePaths])
      .map((path) => normalizeSnapshotPath(path))
      .filter(Boolean)
  ));
}

function buildNormalizationSafety(namingReport = {}, renameTargetCount = 0) {
  const familyCount = Number(namingReport.familyCount || 0);
  const density = familyCount > 0
    ? Math.round((Number(renameTargetCount || 0) / familyCount) * 100) / 100
    : 0;
  const reasons = [];

  if (renameTargetCount <= 0) {
    return {
      level: 'none',
      density,
      reasons: ['No naming targets detected.']
    };
  }

  if (renameTargetCount > 4) {
    reasons.push('Large rename surface.');
  }

  if (density >= 1) {
    reasons.push('High rename density.');
  }

  const topFamily = Array.isArray(namingReport.topFamilies) ? namingReport.topFamilies[0] : null;
  if (Number(topFamily?.renameTargetCount || 0) >= 4) {
    reasons.push('Hot family with multiple rename targets.');
  }

  const collisionAvoidance = Number(namingReport.patternSummary?.patternCounts?.collision_avoidance || 0);
  if (collisionAvoidance > 0) {
    reasons.push('Collision avoidance needed.');
  }

  return {
    level: reasons.length === 0 ? 'safe' : reasons.length === 1 ? 'guarded' : 'risky',
    density,
    reasons
  };
}

function buildNormalizationRecommendation({ safety, renameTargetCount, mode }) {
  if (renameTargetCount <= 0) {
    return {
      action: 'noop',
      reason: 'No naming targets were detected.'
    };
  }

  if (mode === 'analyze') {
    return {
      action: 'review',
      reason: 'Analyze-only mode requested; review the plan before executing.'
    };
  }

  if (safety.level === 'safe') {
    return {
      action: 'execute',
      reason: 'Rename targets are bounded and the family is safe to normalize.'
    };
  }

  return {
    action: 'review',
    reason: 'Normalization is possible, but the current plan should be reviewed before execution.'
  };
}

function buildNormalizationSummary({
  candidatePath = null,
  candidatePaths = [],
  namingReport = {},
  namingPlan = null,
  safety = null,
  recommendation = null,
  mode = 'plan'
} = {}) {
  const topFamily = Array.isArray(namingReport.topFamilies) ? namingReport.topFamilies[0] : null;

  return {
    mode,
    candidatePath,
    candidatePaths,
    familyRoot: namingPlan?.familyRoot || topFamily?.familyRoot || null,
    directory: namingPlan?.directory || topFamily?.directory || null,
    familyCount: Number(namingReport.familyCount || 0),
    renameTargetCount: Number(namingReport.renameTargetCount || namingPlan?.renameTargets?.length || 0),
    renameTargetDensity: safety?.density || 0,
    safetyLevel: safety?.level || 'none',
    recommendedAction: recommendation?.action || 'noop',
    topFamilyRenameTargetCount: Number(topFamily?.renameTargetCount || 0),
    patternSummary: namingReport.patternSummary || {
      totalFamilies: 0,
      totalTargets: 0,
      patternCounts: {},
      topFamilyPatterns: [],
      topRecommendedStems: []
    }
  };
}

export function buildFolderizationNormalizationPlanFromRows(rows = [], candidatePaths = [], options = {}) {
  const normalizedCandidatePaths = normalizeCandidatePaths(candidatePaths);
  const candidatePath = normalizedCandidatePaths[0] || normalizeSnapshotPath(options.candidatePath || null);
  const mode = options.mode || (options.execute ? 'execute' : 'plan');
  const namingReport = buildFolderizationNamingReportFromRows(rows);
  const namingPlan = candidatePath
    ? buildFolderizationNamingPlanFromRows(rows, [candidatePath], options)
    : null;
  const renameTargets = Array.isArray(namingPlan?.renameTargets)
    ? namingPlan.renameTargets.map((target) => ({ ...target }))
    : [];
  const safety = buildNormalizationSafety(namingReport, renameTargets.length);
  const recommendation = buildNormalizationRecommendation({
    safety,
    renameTargetCount: renameTargets.length,
    mode
  });

  return {
    success: true,
    mode,
    candidatePath,
    candidatePaths: normalizedCandidatePaths,
    analysis: {
      naming: namingReport,
      safety,
      recommendation
    },
    plan: namingPlan
      ? {
          ...namingPlan,
          candidatePath,
          renameTargets
        }
      : null,
    summary: buildNormalizationSummary({
      candidatePath,
      candidatePaths: normalizedCandidatePaths,
      namingReport,
      namingPlan,
      safety,
      recommendation,
      mode
    })
  };
}

export function buildFolderizationNormalizationPlanFromRepo(repo, candidatePaths = [], options = {}) {
  if (!repo?.db?.prepare) {
    return {
      success: false,
      mode: options.mode || (options.execute ? 'execute' : 'plan'),
      candidatePath: normalizeCandidatePaths(candidatePaths)[0] || normalizeSnapshotPath(options.candidatePath || null),
      candidatePaths: normalizeCandidatePaths(candidatePaths),
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
          level: 'missing',
          density: 0,
          reasons: ['Repository is unavailable.']
        },
        recommendation: {
          action: 'noop',
          reason: 'Repository is unavailable.'
        }
      },
      plan: null,
      summary: {
        candidatePath: normalizeCandidatePaths(candidatePaths)[0] || normalizeSnapshotPath(options.candidatePath || null),
        candidatePaths: normalizeCandidatePaths(candidatePaths),
        familyRoot: null,
        directory: null,
        familyCount: 0,
        renameTargetCount: 0,
        renameTargetDensity: 0,
        safetyLevel: 'missing',
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
    };
  }

  return buildFolderizationNormalizationPlanFromRows(
    loadFolderizationRowsForNaming(repo),
    candidatePaths,
    options
  );
}

export default {
  buildFolderizationNormalizationPlanFromRows,
  buildFolderizationNormalizationPlanFromRepo
};
