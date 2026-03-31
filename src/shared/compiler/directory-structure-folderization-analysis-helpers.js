/**
 * @fileoverview Report helpers for folderization analysis.
 */

function summarizeFamilyEvolution(state = {}) {
  return {
    rootFileCount: state.rootRows?.length || 0,
    folderFileCount: state.folderRows?.length || 0,
    versionCountTotal: state.versionCountTotal || 0,
    latestUpdatedAt: state.latestUpdatedAt?.value || null,
    earliestUpdatedAt: state.earliestUpdatedAt?.value || null,
    migrationState: state.folderRows?.length > 0
      ? (state.rootRows?.length > state.folderRows.length ? 'mixed' : 'already_folderized')
      : 'flat'
  };
}

function buildFamilyStateReport(familyStates = new Map()) {
  const topFamilies = Array.from(familyStates.values())
    .map((state) => ({
      directory: state.directory,
      familyRoot: state.familyRoot,
      rootFileCount: state.evolution?.rootFileCount || 0,
      folderFileCount: state.evolution?.folderFileCount || 0,
      versionCountTotal: state.evolution?.versionCountTotal || 0,
      latestUpdatedAt: state.evolution?.latestUpdatedAt || null,
      earliestUpdatedAt: state.evolution?.earliestUpdatedAt || null,
      migrationState: state.evolution?.migrationState || 'flat'
    }))
    .sort((a, b) => (b.folderFileCount + b.rootFileCount) - (a.folderFileCount + a.rootFileCount) || a.familyRoot.localeCompare(b.familyRoot));

  const stateCounts = topFamilies.reduce((counts, family) => {
    const key = family.migrationState || 'flat';
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {
    flat: 0,
    mixed: 0,
    already_folderized: 0
  });

  return {
    totalFamilies: topFamilies.length,
    stateCounts,
    topFamilies: topFamilies.slice(0, 10)
  };
}

function buildFolderizationCandidateReport(candidates = []) {
  return {
    candidateCount: candidates.length,
    topCandidates: candidates.slice(0, 10).map((candidate) => ({
      directory: candidate.directory,
      familyRoot: candidate.familyRoot,
      recommendedFolder: candidate.recommendedFolder || `${candidate.directory}/${candidate.familyRoot}`,
      fileCount: candidate.fileCount,
      confidence: candidate.confidence || 0,
      barrelFile: candidate.barrelFile?.path || null,
      migrationState: candidate.migrationState || candidate.familyEvolution?.migrationState || 'flat',
      familyEvolution: candidate.familyEvolution || null,
      members: candidate.files || candidate.members?.map((member) => member.path) || []
    }))
  };
}

export {
  buildFamilyStateReport,
  buildFolderizationCandidateReport,
  summarizeFamilyEvolution
};
