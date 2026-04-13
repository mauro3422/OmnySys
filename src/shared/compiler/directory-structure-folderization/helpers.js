/**
 * @fileoverview Helpers for directory-structure-folderization-analysis
 * 
 * Contains supporting functions for folderization analysis:
 * - buildFamilyStateReport: Reports on family state evolution
 * - buildFolderizationCandidateReport: Reports on folderization candidates  
 * - summarizeFamilyEvolution: Summarizes family evolution metrics
 */

/**
 * Builds a report on family state evolution
 * @param {Map} familyStateByRoot - Family state indexed by root
 * @returns {Object} Report with family state information
 */
export function buildFamilyStateReport(familyStateByRoot) {
  if (!familyStateByRoot || familyStateByRoot.size === 0) {
    return {
      totalFamilies: 0,
      flatCount: 0,
      mixedCount: 0,
      folderizedCount: 0,
      topFamilies: []
    };
  }

  let flatCount = 0;
  let mixedCount = 0;
  let folderizedCount = 0;
  const topFamilies = [];

  for (const [root, state] of familyStateByRoot) {
    const rootCount = state.rootRows?.length || 0;
    const folderCount = state.folderRows?.length || 0;
    
    if (folderCount === 0) {
      flatCount++;
    } else if (rootCount === 0) {
      folderizedCount++;
    } else {
      mixedCount++;
    }

    topFamilies.push({
      familyRoot: root,
      directory: state.directory,
      rootFileCount: rootCount,
      folderFileCount: folderCount,
      totalFiles: rootCount + folderCount
    });
  }

  topFamilies.sort((a, b) => b.totalFiles - a.totalFiles);

  return {
    totalFamilies: familyStateByRoot.size,
    flatCount,
    mixedCount,
    folderizedCount,
    topFamilies: topFamilies.slice(0, 10)
  };
}

/**
 * Builds a report on folderization candidates
 * @param {Array} candidates - List of folderization candidates
 * @returns {Object} Report with candidate information
 */
export function buildFolderizationCandidateReport(candidates = []) {
  if (!candidates || candidates.length === 0) {
    return {
      totalCandidates: 0,
      highConfidence: 0,
      mediumConfidence: 0,
      lowConfidence: 0,
      topCandidates: []
    };
  }

  let highConfidence = 0;
  let mediumConfidence = 0;
  let lowConfidence = 0;

  for (const candidate of candidates) {
    if (candidate.confidence >= 70) {
      highConfidence++;
    } else if (candidate.confidence >= 40) {
      mediumConfidence++;
    } else {
      lowConfidence++;
    }
  }

  const topCandidates = candidates
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 5)
    .map(c => ({
      familyRoot: c.familyRoot,
      directory: c.directory,
      fileCount: c.fileCount,
      confidence: c.confidence,
      recommendedFolder: c.recommendedFolder
    }));

  return {
    totalCandidates: candidates.length,
    highConfidence,
    mediumConfidence,
    lowConfidence,
    topCandidates
  };
}

/**
 * Summarizes family evolution metrics
 * @param {Object} state - Family state object
 * @returns {Object} Evolution summary
 */
export function summarizeFamilyEvolution(state) {
  if (!state) {
    return {
      rootFileCount: 0,
      folderFileCount: 0,
      versionCountTotal: 0,
      latestUpdatedAt: null,
      earliestUpdatedAt: null,
      migrationState: 'flat'
    };
  }

  const rootFileCount = state.rootRows?.length || 0;
  const folderFileCount = state.folderRows?.length || 0;
  const versionCountTotal = state.versionCountTotal || 0;

  let migrationState = 'flat';
  if (folderFileCount > 0 && rootFileCount === 0) {
    migrationState = 'folderized';
  } else if (folderFileCount > 0 && rootFileCount > 0) {
    migrationState = 'mixed';
  }

  return {
    rootFileCount,
    folderFileCount,
    versionCountTotal,
    latestUpdatedAt: state.latestUpdatedAt || null,
    earliestUpdatedAt: state.earliestUpdatedAt || null,
    migrationState
  };
}

export default {
  buildFamilyStateReport,
  buildFolderizationCandidateReport,
  summarizeFamilyEvolution
};