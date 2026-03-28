import fs from 'fs/promises';
import path from 'path';
import { createLogger } from '../../../utils/logger.js';
import { getRepository } from '../../storage/repository/repository-factory.js';
import { MoveOrchestrator } from '../core/shared/move-orchestrator.js';
import { withMutationBatch } from '../core/shared/mutation-batch.js';
import { buildFolderizationNamingPlanFromRows } from '../../../shared/compiler/directory-structure-folderization-naming.js';
import { validate_imports } from './validate-imports.js';
import { rewriteFolderizedFamilyImports } from './folderize-family-import-rewriter.js';
import { loadFolderizationRows, normalizeFolderizationPath } from '../../../shared/compiler/directory-structure-folderization-data.js';

const logger = createLogger('OmnySys:mcp:rename_folderized_family');

function isRepositoryReady(repo) {
  return !!(repo?.initialized && repo?.db && repo.db.open !== false);
}

function sortRenameTargets(renameTargets = []) {
  return renameTargets.slice().sort((a, b) => a.from.localeCompare(b.from));
}

function normalizeSnapshotPath(filePath = '') {
  return String(filePath || '')
    .trim()
    .replace(/\\/g, '/')
    .replace(/^\.\//, '')
    .replace(/^\/+/, '');
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
      : [
          ...(Array.isArray(row.importTargets) ? row.importTargets : []),
          ...(Array.isArray(row.exportTargets) ? row.exportTargets : []),
          ...(Array.isArray(row.imports)
            ? row.imports.map((entry) => normalizeFolderizationPath(entry?.resolved || entry?.target || entry?.source || entry?.path || entry?.filePath || entry)).filter(Boolean)
            : []),
          ...(Array.isArray(row.exports)
            ? row.exports.map((entry) => normalizeFolderizationPath(entry?.resolved || entry?.target || entry?.source || entry?.path || entry?.filePath || entry?.from || '')).filter(Boolean)
            : [])
        ];

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

async function verifyFileExists(projectPath, filePath) {
  try {
    await fs.access(path.resolve(projectPath, filePath));
    return { exists: true };
  } catch {
    return { exists: false };
  }
}

async function validateRenamedFamily(plan, projectPath, context) {
  const validations = [];
  const snapshot = context.folderizationSnapshot || null;
  const repo = getRepository(projectPath);
  const impactedFiles = Array.isArray(snapshot?.impactedFiles) ? snapshot.impactedFiles : [];
  const focusFiles = Array.from(new Set([
    plan.barrelFile || null,
    ...plan.renameTargets.map((target) => target.to),
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

  const validations = validateAfterMove
    ? await validateRenamedFamily(focusPlan, projectPath, moveContext)
    : [];

  return {
    success: true,
    mode: 'applied',
    plan: focusPlan,
    renameImpact,
    results,
    rewrites: rewriteResult,
    validations
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

    return await withMutationBatch(server, {
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
  } catch (error) {
    logger.error(`[Tool] rename_folderized_family failed: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

export default { rename_folderized_family };
