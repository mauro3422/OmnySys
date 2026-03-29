import {
  buildFolderizedFamilyGroups,
  buildFolderizedFamilySuggestion,
  findBestFolderizedFamilyForPaths,
  loadFolderizationRowsForNaming
} from './directory-structure-folderization-naming-helpers.js';

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

  return {
    familyCount: families.length,
    renameTargetCount: families.reduce((sum, family) => sum + family.renameTargetCount, 0),
    topFamilies: families.slice(0, 10)
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
      topFamilies: []
    };
  }

  return buildFolderizationNamingReportFromRows(loadFolderizationRowsForNaming(repo));
}
