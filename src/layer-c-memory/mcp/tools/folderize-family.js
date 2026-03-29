import { createLogger } from '../../../utils/logger.js';
import { getRepository } from '../../storage/repository/repository-factory.js';
import { MoveOrchestrator } from '../core/shared/move-orchestrator.js';
import { withMutationBatch } from '../core/shared/mutation-batch.js';
import { settleMutationFiles } from '../core/shared/mutation-settlement.js';
import { buildFolderizationMigrationPlanFromRepo, buildFolderizedFamilyGroups, buildFolderizedFamilySuggestion } from '../../../shared/compiler/index.js';
import { rewriteFolderizedFamilyImports } from './folderize-family-import-rewriter.js';

const logger = createLogger('OmnySys:mcp:folderize_family');

function sortMoveTargets(moveTargets = [], barrelPath = null) {
  return moveTargets.slice().sort((a, b) => {
    const aIsBarrel = barrelPath && a.from === barrelPath;
    const bIsBarrel = barrelPath && b.from === barrelPath;

    if (aIsBarrel !== bIsBarrel) {
      return aIsBarrel ? 1 : -1;
    }

    return a.from.localeCompare(b.from);
  });
}

function normalizeSnapshotPath(filePath = '') {
  return String(filePath || '')
    .trim()
    .replace(/\\/g, '/')
    .replace(/^\.\//, '')
    .replace(/^\/+/, '');
}

function buildFolderizationMoveSnapshot(focusPlan) {
  const impactedFiles = Array.isArray(focusPlan?.importImpact?.impactedFiles)
    ? focusPlan.importImpact.impactedFiles
        .map((item) => normalizeSnapshotPath(item?.filePath || item))
        .filter(Boolean)
    : [];

  const dependentsBySourcePath = new Map();

  for (const target of focusPlan?.moveTargets || []) {
    const key = normalizeSnapshotPath(target?.from);
    if (!key) {
      continue;
    }

    dependentsBySourcePath.set(key, impactedFiles);
  }

  return {
    createdAt: new Date().toISOString(),
    candidate: {
      familyRoot: focusPlan?.candidate?.familyRoot || null,
      recommendedFolder: focusPlan?.candidate?.recommendedFolder || null,
      barrelFile: focusPlan?.candidate?.barrelFile || null
    },
    impactedFiles,
    dependentsBySourcePath,
    getDependentsForPath(filePath) {
      const normalized = normalizeSnapshotPath(filePath);
      return dependentsBySourcePath.get(normalized) || impactedFiles;
    }
  };
}

function buildAutoRenameTargets(moveTargets = []) {
  const syntheticRows = moveTargets
    .map((target) => {
      const normalizedPath = normalizeSnapshotPath(target?.to || '');
      if (!normalizedPath) {
        return null;
      }

      return {
        path: normalizedPath,
        directory: normalizedPath.includes('/')
          ? normalizedPath.slice(0, normalizedPath.lastIndexOf('/'))
          : ''
      };
    })
    .filter(Boolean);

  if (syntheticRows.length === 0) {
    return [];
  }

  const groups = buildFolderizedFamilyGroups(syntheticRows);
  if (groups.length === 0) {
    return [];
  }

  return buildFolderizedFamilySuggestion(groups[0])?.renameTargets || [];
}

function buildFinalMoveTargets(moveTargets = [], renameTargets = []) {
  const renameMap = new Map(
    renameTargets
      .map((target) => [normalizeSnapshotPath(target?.from), normalizeSnapshotPath(target?.to)])
      .filter(([from, to]) => from && to)
  );

  return moveTargets.map((target) => ({
    from: normalizeSnapshotPath(target.from),
    to: renameMap.get(normalizeSnapshotPath(target.to)) || normalizeSnapshotPath(target.to)
  }));
}

async function executeFolderizationPlan({
  focusPlan,
  projectPath,
  context,
  moveContext,
  server,
  validateAfterMove
}) {
  const moveTargets = sortMoveTargets(focusPlan.moveTargets, focusPlan.candidate?.barrelFile || null);
  const renameTargets = sortMoveTargets(buildAutoRenameTargets(moveTargets), null);

  const moveResult = await withMutationBatch(server, {
    reason: 'folderize_family',
    files: focusPlan.files || []
  }, async () => {
    const results = [];

    for (const target of moveTargets) {
      logger.info(`[Tool] folderize move: ${target.from} -> ${target.to}`);
      const moveResult = await MoveOrchestrator.moveFile(target.from, target.to, projectPath, moveContext);
      results.push({
        from: target.from,
        to: target.to,
        result: moveResult
      });

      if (!moveResult?.success) {
        return {
          success: false,
          mode: 'failed',
          plan: focusPlan,
          results,
          error: moveResult?.error || `Failed to move ${target.from}`
        };
      }
    }

    return {
      success: true,
      mode: 'applied',
      plan: focusPlan,
      results
    };
  });

  if (!moveResult?.success) {
    return moveResult;
  }

  let renameResult = null;
  if (renameTargets.length > 0) {
    renameResult = await withMutationBatch(server, {
      reason: 'folderize_family_rename',
      files: renameTargets.map((target) => target.from)
    }, async () => {
      const results = [];

      for (const target of renameTargets) {
        logger.info(`[Tool] folderize rename: ${target.from} -> ${target.to}`);
        const renameMoveResult = await MoveOrchestrator.moveFile(target.from, target.to, projectPath, moveContext);
        results.push({
          from: target.from,
          to: target.to,
          result: renameMoveResult
        });

        if (!renameMoveResult?.success) {
          return {
            success: false,
            mode: 'failed',
            plan: focusPlan,
            results,
            error: renameMoveResult?.error || `Failed to rename ${target.from}`
          };
        }
      }

      return {
        success: true,
        mode: 'applied',
        plan: focusPlan,
        results
      };
    });

    if (!renameResult?.success) {
      return renameResult;
    }
  }

  const finalMoveTargets = buildFinalMoveTargets(moveTargets, renameTargets);
  const rewriteResult = await rewriteFolderizedFamilyImports({
    projectPath,
    moveTargets: finalMoveTargets,
    impactedFiles: focusPlan.importImpact?.impactedFiles?.map((item) => item.filePath) || [],
    context: moveContext
  });

  if (!rewriteResult.success) {
    return {
      success: false,
      mode: renameTargets.length > 0 ? 'partial' : 'partial',
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
    focusPlan.candidate.barrelFile || null,
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

  return {
    ...moveResult,
    renameResult,
    rewrites: rewriteResult,
    validations
  };
}

export async function folderize_family(args, context) {
  const {
    candidatePath,
    execute = false,
    validateAfterMove = true
  } = args;
  const { projectPath } = context;
  const server = context.server || context.orchestrator?.server || null;

  if (!candidatePath) {
    return { success: false, error: 'Missing required parameter: candidatePath' };
  }

  try {
    const plan = buildFolderizationMigrationPlanFromRepo(getRepository(projectPath), {
      focusCandidate: [candidatePath]
    });

    const focusPlan = plan.focusCandidate;
    if (!focusPlan) {
      return {
        success: false,
        error: `No folderization candidate found for ${candidatePath}`,
        plan
      };
    }

    if (!execute) {
      return {
        success: true,
        mode: 'preview',
        plan: focusPlan
      };
    }

    const folderizationSnapshot = buildFolderizationMoveSnapshot(focusPlan);
    const moveContext = {
      ...context,
      folderizationSnapshot
    };

    if (focusPlan.decision === 'reject') {
      return {
        success: false,
        mode: 'blocked',
        plan: focusPlan,
        error: `Folderization plan rejected for ${candidatePath}`
      };
    }

    return await executeFolderizationPlan({
      focusPlan,
      projectPath,
      context,
      moveContext,
      server,
      validateAfterMove
    });
  } catch (error) {
    logger.error(`[Tool] folderize_family failed: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

export default { folderize_family };
