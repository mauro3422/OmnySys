import { getRecommendation } from '../recommendations/RecommendationEngine.js';

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

export {
  buildEmptyRecommendation,
  buildFolderizationRecommendation
};
