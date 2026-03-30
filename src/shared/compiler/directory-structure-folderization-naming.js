import {
  buildFolderizedFamilyGroups,
  buildFolderizedFamilySuggestion,
  findBestFolderizedFamilyForPaths,
  loadFolderizationRowsForNaming
} from './directory-structure-folderization-naming-helpers.js';

function normalizeTargetStem(target = {}) {
  return String(target?.recommendedName || '')
    .replace(/\.js$/i, '')
    .trim();
}

function buildPatternCounts() {
  return {
    shortened: 0,
    rooted: 0,
    collision_avoidance: 0,
    clean: 0,
    barrel: 0,
    unknown: 0
  };
}

export {
  buildFolderizedFamilyGroups,
  buildFolderizedFamilySuggestion,
  findBestFolderizedFamilyForPaths,
  loadFolderizationRowsForNaming
};

export function buildFolderizationNamingReportFromRows(rows = []) {
  const families = buildFolderizedFamilyGroups(rows)
    .map(buildFolderizedFamilySuggestion)
    .filter((family) => family.renameTargetCount > 0)
    .sort((a, b) => b.renameTargetCount - a.renameTargetCount || b.fileCount - a.fileCount || a.familyRoot.localeCompare(b.familyRoot));

  const patternCounts = buildPatternCounts();
  const recommendedStemCounts = new Map();
  const topFamilyPatterns = [];

  for (const family of families) {
    let familyPattern = 'unknown';
    if (family.renameTargets.length > 0) {
      const dominantTarget = family.renameTargets[0];
      familyPattern = dominantTarget?.namingState || 'unknown';
    }

    topFamilyPatterns.push({
      directory: family.directory,
      familyRoot: family.familyRoot,
      fileCount: family.fileCount,
      renameTargetCount: family.renameTargetCount,
      pattern: familyPattern,
      example: family.renameTargets[0] ? {
        from: family.renameTargets[0].from,
        to: family.renameTargets[0].to,
        reason: family.renameTargets[0].reason,
        namingState: family.renameTargets[0].namingState
      } : null
    });

    for (const target of family.renameTargets) {
      const pattern = target?.namingState || 'unknown';
      patternCounts[pattern] = (patternCounts[pattern] || 0) + 1;

      const stem = normalizeTargetStem(target);
      if (stem) {
        recommendedStemCounts.set(stem, (recommendedStemCounts.get(stem) || 0) + 1);
      }
    }
  }

  const topRecommendedStems = Array.from(recommendedStemCounts.entries())
    .map(([stem, count]) => ({ stem, count }))
    .sort((a, b) => b.count - a.count || a.stem.localeCompare(b.stem))
    .slice(0, 15);

  return {
    familyCount: families.length,
    renameTargetCount: families.reduce((sum, family) => sum + family.renameTargetCount, 0),
    topFamilies: families.slice(0, 10),
    patternSummary: {
      totalFamilies: families.length,
      totalTargets: families.reduce((sum, family) => sum + family.renameTargetCount, 0),
      patternCounts,
      topFamilyPatterns: topFamilyPatterns.slice(0, 10),
      topRecommendedStems
    }
  };
}

export function buildFolderizationNamingPlanFromRows(rows = [], filePaths = [], options = {}) {
  const plan = findBestFolderizedFamilyForPaths(rows, filePaths, options);
  return plan || null;
}

export function buildFolderizationNamingPlanFromRepo(repo, filePaths = [], options = {}) {
  if (!repo?.db?.prepare) {
    return null;
  }

  return buildFolderizationNamingPlanFromRows(loadFolderizationRowsForNaming(repo), filePaths, options);
}

export function buildFolderizationNamingReportFromRepo(repo) {
  if (!repo?.db?.prepare) {
    return {
      familyCount: 0,
      renameTargetCount: 0,
      topFamilies: [],
      patternSummary: {
        totalFamilies: 0,
        totalTargets: 0,
        patternCounts: buildPatternCounts(),
        topFamilyPatterns: [],
        topRecommendedStems: []
      }
    };
  }

  return buildFolderizationNamingReportFromRows(loadFolderizationRowsForNaming(repo));
}
