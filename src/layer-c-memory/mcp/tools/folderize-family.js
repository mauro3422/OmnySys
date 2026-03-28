import fs from 'fs/promises';
import path from 'path';
import { createLogger } from '../../../utils/logger.js';
import { getRepository } from '../../storage/repository/repository-factory.js';
import { MoveOrchestrator } from '../core/shared/move-orchestrator.js';
import { withMutationBatch } from '../core/shared/mutation-batch.js';
import { buildFolderizationMigrationPlanFromRepo } from '../../../shared/compiler/directory-structure-folderization.js';
import { validate_imports } from './validate-imports.js';
import { rewriteFolderizedFamilyImports } from './folderize-family-import-rewriter.js';

const logger = createLogger('OmnySys:mcp:folderize_family');

function isRepositoryReady(repo) {
  return !!(repo?.initialized && repo?.db && repo.db.open !== false);
}

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

async function verifyFileExists(projectPath, filePath) {
  try {
    await fs.access(path.resolve(projectPath, filePath));
    return { exists: true };
  } catch {
    return { exists: false };
  }
}

async function validateMovedFamily(plan, projectPath, context) {
  const validations = [];
  const snapshot = context.folderizationSnapshot || null;
  const repo = getRepository(projectPath);
  const impactedFiles = Array.isArray(snapshot?.impactedFiles) ? snapshot.impactedFiles : [];
  const focusFiles = Array.from(new Set([
    plan.candidate.barrelFile || null,
    ...plan.moveTargets.map((target) => target.to),
    ...impactedFiles
  ].filter(Boolean)));

  if (focusFiles.length === 0) {
    return validations;
  }

  if (!isRepositoryReady(repo)) {
    for (const filePath of focusFiles.slice(0, 10)) {
      const disk = await verifyFileExists(projectPath, filePath);
      validations.push({
        filePath,
        disk,
        validation: {
          skipped: true,
          reason: 'database connection is not open'
        }
      });
    }

    return validations;
  }

  for (const filePath of focusFiles.slice(0, 10)) {
    const disk = await verifyFileExists(projectPath, filePath);
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
      disk,
      validation
    });
  }

  return validations;
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

  return await withMutationBatch(server, {
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

    const rewriteResult = await rewriteFolderizedFamilyImports({
      projectPath,
      moveTargets,
      impactedFiles: focusPlan.importImpact?.impactedFiles?.map((item) => item.filePath) || [],
      context: moveContext
    });

    const validations = validateAfterMove
      ? await validateMovedFamily(focusPlan, projectPath, moveContext)
      : [];

    return {
      success: true,
      mode: 'applied',
      plan: focusPlan,
      results,
      rewrites: rewriteResult,
      validations
    };
  });
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

    return await withMutationBatch(server, {
      reason: 'folderize_family',
      files: focusPlan.files || []
    }, async () => {
      return await executeFolderizationPlan({
        focusPlan,
        projectPath,
        context,
        moveContext,
        server,
        validateAfterMove
      });
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
