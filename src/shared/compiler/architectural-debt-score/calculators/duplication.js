import { createLogger } from '#utils/logger.js';
import { loadDuplicateRows } from '../../architectural-debt-score-repository.js';
import {
  findExistingFolderizedFamilyForPathsFromRepo,
  findFolderizationCandidateForPaths,
  findFolderizationCandidatesFromRepo
} from '../../directory-structure-folderization.js';
import { normalizeFolderizationPath } from '../../directory-structure-folderization-data.js';
import { getRecommendation } from '../../recommendations/RecommendationEngine.js';

const logger = createLogger('OmnySys:ArchitecturalDebtScore');

function normalizeScopePaths(options = {}, files = []) {
  return [
    options.focusPath,
    options.scopePath,
    ...files
  ]
    .map((filePath) => normalizeFolderizationPath(filePath))
    .filter(Boolean);
}

function buildScopeAwareFolderizationHint(repo, folderizationCandidates, files = [], options = {}) {
  const scopePaths = normalizeScopePaths(options, files);

  if (scopePaths.length > 0) {
    const scopedFamily = findExistingFolderizedFamilyForPathsFromRepo(repo, scopePaths, { minFileCount: 1 });
    if (scopedFamily) {
      return {
        ...scopedFamily,
        recommendedFolder: scopedFamily.migrationState === 'already_folderized'
          ? scopedFamily.directory
          : scopedFamily.recommendedFolder
      };
    }
  }

  const scopedCandidate = scopePaths.length > 0
    ? findFolderizationCandidateForPaths(folderizationCandidates, scopePaths)
    : null;

  if (scopedCandidate) {
    return scopedCandidate;
  }

  return findFolderizationCandidateForPaths(folderizationCandidates, files)
    || findExistingFolderizedFamilyForPathsFromRepo(repo, files)
    || null;
}

export async function calculateDuplicationScore(projectPath, repo, options = {}) {
  const issues = [];
  let duplicateGroups = 0;
  let duplicateImplementations = 0;

  try {
    const duplicates = loadDuplicateRows(repo);
    if (duplicates.length > 0) {
      const folderizationCandidates = findFolderizationCandidatesFromRepo(repo);
      duplicateGroups = duplicates.length;
      duplicateImplementations = duplicates.reduce((sum, duplicate) => sum + duplicate.instanceCount, 0);

      for (const duplicate of duplicates.slice(0, 20)) {
        const files = duplicate.files.split(',').map((filePath) => filePath.trim()).filter(Boolean);
        const folderizationHint = buildScopeAwareFolderizationHint(repo, folderizationCandidates, files, options);

        issues.push({
          type: 'conceptual_duplicate',
          semanticFingerprint: duplicate.fingerprint,
          instanceCount: duplicate.instanceCount,
          files,
          severity: duplicate.instanceCount > 5 ? 'high' : 'medium',
          folderizationHint: folderizationHint ? {
            familyRoot: folderizationHint.familyRoot,
            recommendedFolder: folderizationHint.recommendedFolder,
            barrelFile: folderizationHint.barrelFile?.path || null,
            confidence: folderizationHint.confidence,
            fileCount: folderizationHint.fileCount,
            migrationState: folderizationHint.migrationState || null,
            alreadyFolderized: !!folderizationHint.alreadyFolderized,
            familyEvolution: folderizationHint.familyEvolution || null
          } : null,
          recommendation: getRecommendation({
            type: 'conceptual_duplicate',
            filePath: files[0],
            context: {
            instanceCount: duplicate.instanceCount,
            folderizationHint: folderizationHint ? {
              familyRoot: folderizationHint.familyRoot,
              recommendedFolder: folderizationHint.recommendedFolder,
              barrelFile: folderizationHint.barrelFile?.path || folderizationHint.barrelFile || null,
              confidence: folderizationHint.confidence,
              fileCount: folderizationHint.fileCount,
              migrationState: folderizationHint.migrationState || null,
              alreadyFolderized: !!folderizationHint.alreadyFolderized,
              familyEvolution: folderizationHint.familyEvolution || null
              } : null
            }
          }).message
        });
      }
    }
  } catch (err) {
    logger.error(`[calculateDuplicationScore] Error analyzing duplication: ${err.message}`);
  }

  const normalized = Math.min(100, Math.round(duplicateGroups * 2));

  return {
    normalized,
    issues,
    details: {
      duplicateGroups,
      duplicateImplementations,
      avgInstancesPerGroup: duplicateGroups > 0 ? Math.round(duplicateImplementations / duplicateGroups * 100) / 100 : 0
    }
  };
}
