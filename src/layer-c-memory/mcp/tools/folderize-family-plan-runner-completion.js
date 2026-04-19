import { createLogger } from '../../../utils/logger.js';
import { settleMutationFiles } from '../core/shared/mutation-settlement/index.js';
import { rewriteFolderizedFamilyImports } from './folderize-family-import-rewriter.js';
import { buildFinalMoveTargets } from './folderize-family-plan-runner/helpers.js';

const logger = createLogger('OmnySys:mcp:folderize_family:completion');

export async function runFolderizeCompletionPhase({
  focusPlan,
  moveResult,
  renameResult,
  moveTargets,
  renameTargets,
  projectPath,
  moveContext,
  validateAfterMove,
  appliedBarrelPath = null
}) {
  const finalMoveTargets = buildFinalMoveTargets(moveTargets, renameTargets);
  const rewriteResult = await rewriteFolderizedFamilyImports({
    projectPath,
    moveTargets: finalMoveTargets,
    impactedFiles: focusPlan.importImpact?.impactedFiles?.map((item) => item.filePath) || [],
    context: {
      ...moveContext,
      appliedBarrelPath
    }
  });

  if (!rewriteResult.success) {
    logger.error(`[Tool] folderize_family import rewrite failed for ${focusPlan.candidate?.familyRoot || focusPlan.candidate?.barrelFile || 'folderized family'}`);
    return {
      success: false,
      mode: 'partial',
      plan: focusPlan,
      results: moveResult.results || [],
      renameResult,
      rewrites: rewriteResult,
      error: 'Folderization imports rewrite failed'
    };
  }

  if (!validateAfterMove) {
    return {
      ...moveResult,
      renameResult,
      rewrites: rewriteResult
    };
  }

  const impactedFiles = Array.isArray(moveContext.folderizationSnapshot?.impactedFiles)
    ? moveContext.folderizationSnapshot.impactedFiles
    : [];
  const validationTargets = Array.from(new Set([
    appliedBarrelPath || focusPlan.candidate.barrelFile || null,
    ...finalMoveTargets.map((target) => target.to),
    ...impactedFiles
  ].filter(Boolean)));

  const settlement = await settleMutationFiles({
    projectPath,
    context: moveContext,
    reason: 'folderize_family',
    touchedFiles: validationTargets,
    validationTargets,
    maxValidationTargets: 10
  });
  const validations = settlement.validations;

  if (settlement?.success === false || Number(settlement?.summary?.issueCount || 0) > 0) {
    return {
      success: false,
      mode: 'validation_failed',
      plan: focusPlan,
      results: moveResult.results || [],
      renameResult,
      rewrites: rewriteResult,
      settlement,
      validations,
      error: 'Folderization validation reported unresolved issues'
    };
  }

  return {
    ...moveResult,
    renameResult,
    rewrites: rewriteResult,
    validations,
    settlement
  };
}
