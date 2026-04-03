import { createLogger } from '../../../utils/logger.js';
import { getRepository } from '../../storage/repository/repository-factory.js';
import { MoveOrchestrator } from '../core/shared/move-orchestrator.js';
import { withMutationBatch } from '../core/shared/mutation-batch.js';
import { settleMutationFiles } from '../core/shared/mutation-settlement.js';
import { rewriteFolderizedFamilyImports } from './folderize-family-import-rewriter.js';
import {
  buildFolderizationNamingPlanFromRows,
  loadFolderizationRows,
  normalizeFolderizationPath
} from '../../../shared/compiler/index.js';
import { normalizeSnapshotPath } from '../../../shared/compiler/index.js';

const logger = createLogger('OmnySys:mcp:rename_folderized_family');

function sortRenameTargets(renameTargets = []) {
  return renameTargets.slice().sort((a, b) => a.from.localeCompare(b.from));
}

function buildRowDependencyTargets(row = {}) {
  return [
    ...(Array.isArray(row.importTargets) ? row.importTargets : []),
    ...(Array.isArray(row.exportTargets) ? row.exportTargets : []),
    ...(Array.isArray(row.imports)
      ? row.imports.map((entry) => normalizeFolderizationPath(entry?.resolved || entry?.target || entry?.source || entry?.path || entry?.filePath || entry)).filter(Boolean)
      : []),
    ...(Array.isArray(row.exports)
      ? row.exports.map((entry) => normalizeFolderizationPath(entry?.resolved || entry?.target || entry?.source || entry?.path || entry?.filePath || entry?.from || '')).filter(Boolean)
      : [])
  ];
}

function collectRenameImpact(rows = [], renameTargets = []) {
  const targetSet = new Set(renameTargets.map((target) => normalizeSnapshotPath(target?.from)).filter(Boolean));
  const impactedFiles = [];

  for (const row of rows) {
    const rowPath = normalizeSnapshotPath(row.path || row.filePath || '');
    if (!rowPath || targetSet.has(rowPath)) {
      continue;
    }

    const dependencyTargets = Array.isArray(row.dependencyTargets)
      ? row.dependencyTargets
      : buildRowDependencyTargets(row);

    const matchedDependencies = dependencyTargets.filter((target) => targetSet.has(normalizeSnapshotPath(target)));
    if (matchedDependencies.length === 0) {
      continue;
    }

    impactedFiles.push({
      filePath: rowPath,
      matchedImports: matchedDependencies,
      matchedDependencies,
      importCount: matchedDependencies.length,
      dependencyCount: matchedDependencies.length
    });
  }

  impactedFiles.sort((a, b) => b.importCount - a.importCount || a.filePath.localeCompare(b.filePath));

  return {
    impactedFileCount: impactedFiles.length,
    impactedFiles,
    rewriteCount: impactedFiles.reduce((sum, item) => sum + item.importCount, 0)
  };
}

function buildRenameSnapshot(focusPlan, impactedFiles = []) {
  const impactedPaths = impactedFiles.map((item) => normalizeSnapshotPath(item.filePath)).filter(Boolean);
  const dependentsBySourcePath = new Map();

  for (const target of focusPlan?.renameTargets || []) {
    const key = normalizeSnapshotPath(target?.from);
    if (!key) {
      continue;
    }

    dependentsBySourcePath.set(key, impactedPaths);
  }

  return {
    createdAt: new Date().toISOString(),
    candidate: {
      familyRoot: focusPlan?.familyRoot || null,
      directory: focusPlan?.directory || null,
      barrelFile: focusPlan?.barrelFile || null
    },
    impactedFiles: impactedPaths,
    dependentsBySourcePath,
    getDependentsForPath(filePath) {
      const normalized = normalizeSnapshotPath(filePath);
      return dependentsBySourcePath.get(normalized) || impactedPaths;
    }
  };
}

async function executeRenamePlan({
  focusPlan,
  rows,
  projectPath,
  context,
  moveContext,
  server,
  validateAfterMove
}) {
  const renameTargets = sortRenameTargets(focusPlan.renameTargets || []);
  const renameImpact = collectRenameImpact(rows, renameTargets);
  const results = [];

  for (const target of renameTargets) {
    logger.info(`[Tool] rename_folderized_family: ${target.from} -> ${target.to}`);
    const moveResult = await MoveOrchestrator.moveFile(target.from, target.to, projectPath, moveContext);
    results.push({
      from: target.from,
      to: target.to,
      result: moveResult
    });

    if (!moveResult?.success) {
      logger.error(`[Tool] rename_folderized_family move failed: ${moveResult?.error || `Failed to rename ${target.from}`}`);
      return {
        success: false,
        mode: 'failed',
        plan: focusPlan,
        results,
        renameImpact,
        error: moveResult?.error || `Failed to rename ${target.from}`
      };
    }
  }

  const rewriteResult = await rewriteFolderizedFamilyImports({
    projectPath,
    moveTargets: renameTargets,
    impactedFiles: renameImpact.impactedFiles.map((item) => item.filePath),
    context: moveContext
  });

  if (!rewriteResult.success) {
    logger.error(`[Tool] rename_folderized_family import rewrite failed for ${focusPlan.familyRoot || focusPlan.directory || 'folderized family'}`);
    return {
      success: false,
      mode: 'partial',
      plan: focusPlan,
      results,
      renameImpact,
      rewrites: rewriteResult,
      error: 'Folderized family import rewrite failed'
    };
  }

  return {
    success: true,
    mode: 'applied',
    plan: focusPlan,
    renameImpact,
    results,
    rewrites: rewriteResult
  };
}

export async function rename_folderized_family(args, context) {
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
    const rows = repo?.db?.prepare ? loadFolderizationRows(repo) : [];
    const plan = buildFolderizationNamingPlanFromRows(rows, [candidatePath]);

    if (!plan) {
      return {
        success: false,
        error: `No folderized family naming plan found for ${candidatePath}`
      };
    }

    if ((plan.renameTargets || []).length === 0) {
      return {
        success: true,
        mode: 'noop',
        plan,
        message: 'No rename targets found for the selected folderized family'
      };
    }

    if (!execute) {
      return {
        success: true,
        mode: 'preview',
        plan
      };
    }

    const renameSnapshot = buildRenameSnapshot(plan);
    const moveContext = {
      ...context,
      folderizationSnapshot: renameSnapshot
    };

    const executionResult = await withMutationBatch(server, {
      reason: 'rename_folderized_family',
      files: (plan.renameTargets || []).map((target) => target.from)
    }, async () => {
      return await executeRenamePlan({
        focusPlan: plan,
        rows,
        projectPath,
        context,
        moveContext,
        server,
        validateAfterMove
      });
    });

    if (!executionResult?.success || !validateAfterMove) {
      return executionResult;
    }

    const impactedFiles = Array.isArray(moveContext.folderizationSnapshot?.impactedFiles)
      ? moveContext.folderizationSnapshot.impactedFiles
      : [];
    const validationTargets = Array.from(new Set([
      plan.barrelFile || null,
      ...plan.renameTargets.map((target) => target.to),
      ...impactedFiles
    ].filter(Boolean)));

    const settlement = await settleMutationFiles({
      projectPath,
      context: moveContext,
      reason: 'rename_folderized_family',
      touchedFiles: validationTargets,
      validationTargets,
      maxValidationTargets: 10
    });
    const validations = settlement.validations;

    return {
      ...executionResult,
      validations
    };
  } catch (error) {
    logger.error(`[Tool] rename_folderized_family failed: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

export default { rename_folderized_family };
