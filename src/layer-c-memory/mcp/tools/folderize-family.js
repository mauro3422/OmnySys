import { createLogger } from '../../../utils/logger.js';
import { getRepository } from '../../storage/repository/repository-factory.js';
import { MoveOrchestrator } from '../core/shared/move-orchestrator.js';
import { buildFolderizationMigrationPlanFromRepo } from '../../../shared/compiler/directory-structure-folderization.js';
import { validate_imports } from './validate-imports.js';
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

async function validateMovedFamily(plan, projectPath, context) {
  const validations = [];
  const focusFiles = Array.from(new Set([
    plan.candidate.barrelFile || null,
    ...plan.moveTargets.map((target) => target.to)
  ].filter(Boolean)));

  if (focusFiles.length === 0) {
    return validations;
  }

  for (const filePath of focusFiles.slice(0, 10)) {
    const validation = await validate_imports({
      filePath,
      checkBroken: true,
      checkUnused: true,
      checkCircular: false,
      checkFileExistence: true
    }, {
      ...context,
      projectPath
    });

    validations.push({
      filePath,
      validation
    });
  }

  return validations;
}

export async function folderize_family(args, context) {
  const {
    candidatePath,
    execute = false,
    validateAfterMove = true
  } = args;
  const { projectPath } = context;

  if (!candidatePath) {
    return { success: false, error: 'Missing required parameter: candidatePath' };
  }

  try {
    const repo = getRepository(projectPath);
    const plan = buildFolderizationMigrationPlanFromRepo(repo, {
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

    if (focusPlan.decision === 'reject') {
      return {
        success: false,
        mode: 'blocked',
        plan: focusPlan,
        error: `Folderization plan rejected for ${candidatePath}`
      };
    }

    const moveTargets = sortMoveTargets(focusPlan.moveTargets, focusPlan.candidate?.barrelFile || null);
    const results = [];

    for (const target of moveTargets) {
      logger.info(`[Tool] folderize move: ${target.from} -> ${target.to}`);
      const moveResult = await MoveOrchestrator.moveFile(target.from, target.to, projectPath, context);
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

    const rewriteResult = await rewriteFolderizedFamilyImports({
      projectPath,
      moveTargets,
      impactedFiles: focusPlan.importImpact?.impactedFiles?.map((item) => item.filePath) || [],
      context
    });

    const validations = validateAfterMove
      ? await validateMovedFamily(focusPlan, projectPath, context)
      : [];

    return {
      success: true,
      mode: 'applied',
      plan: focusPlan,
      results,
      rewrites: rewriteResult,
      validations
    };
  } catch (error) {
    logger.error(`[Tool] folderize_family failed: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

export default { folderize_family };
