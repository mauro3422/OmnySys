import path from 'path';
import { createLogger } from '../../../utils/logger.js';
import { runAsyncBoundary } from '../../../shared/compiler/index.js';
import { normalizeSnapshotPath } from '../../../shared/compiler/index.js';
import { MoveOrchestrator } from '../core/shared/move-orchestrator/orchestrator.js';
import { withMutationBatch } from '../core/shared/mutation-batch.js';
import { settleMutationFiles } from '../core/shared/mutation-settlement.js';
import { buildFolderizedFamilyGroups, buildFolderizedFamilySuggestion } from '../../../shared/compiler/index.js';
import { rewriteFolderizedFamilyImports } from './folderize-family-import-rewriter.js';
import { runFileWatcherSemanticGuards } from '../../../core/file-watcher/analyze-flow.js';

const logger = createLogger('OmnySys:mcp:folderize_family:runner');

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

export function buildFolderizationMoveSnapshot(focusPlan) {
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
async function runFolderizeMoveBatch({ server, focusPlan, moveTargets, projectPath, moveContext }) {
  return await withMutationBatch(server, {
    reason: 'folderize_family',
    files: focusPlan.files || []
  }, async () => {
    const results = [];

    // OPTIMIZATION: Move all files FIRST without individual settlement.
    // Settlement (reindex) is done ONCE after all moves complete.
    // This avoids N sequential reindex operations (each ~5-10s).
    const movedFiles = [];

    for (const target of moveTargets) {
      logger.info(`[Tool] folderize move: ${target.from} -> ${target.to}`);
      const moveResult = await MoveOrchestrator.moveFile(target.from, target.to, projectPath, {
        ...moveContext,
        skipSettlement: true,  // Don't reindex after each move
        deferGuards: true      // Defer guards to end of batch
      });
      results.push({
        from: target.from,
        to: target.to,
        result: moveResult
      });

      if (!moveResult?.success) {
        logger.error(`[Tool] folderize_family move failed: ${moveResult?.error || `Failed to move ${target.from}`}`);
        return {
          success: false,
          mode: 'failed',
          plan: focusPlan,
          results,
          error: moveResult?.error || `Failed to move ${target.from}`
        };
      }

      movedFiles.push(target.to);
    }

    // BATCH settlement: reindex ALL moved files at once
    if (movedFiles.length > 0) {
      logger.info(`[Tool] folderize batch reindex: ${movedFiles.length} files`);
      try {
        const { analyzeSingleFile } = await import('#layer-a/pipeline/single-file.js');
        // Analyze all moved files in parallel (faster than sequential)
        await Promise.all(
          movedFiles.map(f => analyzeSingleFile(projectPath, f, { verbose: false, incremental: true }))
        );
        logger.info(`[Tool] folderize batch reindex complete: ${movedFiles.length} files`);
      } catch (error) {
        logger.warn(`[Tool] folderize batch reindex failed: ${error.message}, continuing`);
      }
    }

    return {
      success: true,
      mode: 'applied',
      plan: focusPlan,
      results
    };
  });
}
async function runFolderizeRenameBatch({ server, focusPlan, renameTargets, projectPath, moveContext }) {
  if (renameTargets.length === 0) {
    return null;
  }

  const renameResult = await withMutationBatch(server, {
    reason: 'folderize_family_rename',
    files: renameTargets.map((target) => target.from)
  }, async () => {
    const results = [];

    for (const target of renameTargets) {
      logger.info(`[Tool] folderize rename: ${target.from} -> ${target.to}`);
      const renameMoveResult = await MoveOrchestrator.moveFile(target.from, target.to, projectPath, {
        ...moveContext,
        deferGuards: true  // Defer guards to end of batch
      });
      results.push({
        from: target.from,
        to: target.to,
        result: renameMoveResult
      });

      if (!renameMoveResult?.success) {
        logger.error(`[Tool] folderize_family rename failed: ${renameMoveResult?.error || `Failed to rename ${target.from}`}`);
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

  return renameResult;
}
async function runFolderizeRewritePhase({
  focusPlan,
  moveResult,
  renameResult,
  moveTargets,
  renameTargets,
  projectPath,
  moveContext,
  validateAfterMove
}) {
  const finalMoveTargets = buildFinalMoveTargets(moveTargets, renameTargets);
  const rewriteResult = await rewriteFolderizedFamilyImports({
    projectPath,
    moveTargets: finalMoveTargets,
    impactedFiles: focusPlan.importImpact?.impactedFiles?.map((item) => item.filePath) || [],
    context: moveContext
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

/**
 * Run deferred semantic guards ONCE at the end of the batch.
 * This runs all semantic guards against the final state of all affected files,
 * ensuring we catch any issues that were deferred during individual operations.
 */
async function runDeferredGuards({ focusPlan, projectPath, moveContext, allTargets }) {
  logger.info(`[DEFERRED GUARDS] Running semantic guards for ${allTargets.length} target files...`);

  const results = [];
  const guardContext = {
    rootPath: projectPath,
    ...moveContext,
    deferGuards: false // Ensure guards actually run this time
  };

  // Run guards against each final target file
  for (const targetPath of allTargets) {
    try {
      // Re-analyze the file to get molecule atoms for guard checking
      const { collectAndBuildFileAnalysis } = await import('../../../core/file-watcher/analyze-flow.js');
      const fullPath = path.resolve(projectPath, targetPath);
      const analysis = await collectAndBuildFileAnalysis({ rootPath: projectPath }, targetPath, fullPath);

      if (analysis?.moleculeAtoms?.length > 0) {
        await runFileWatcherSemanticGuards(guardContext, targetPath, analysis.moleculeAtoms);
        results.push({ filePath: targetPath, status: 'checked' });
      }
    } catch (error) {
      logger.error(`[DEFERRED GUARD] Failed for ${targetPath}: ${error.message}`);
      results.push({ filePath: targetPath, status: 'error', error: error.message });
    }
  }

  logger.info(`[DEFERRED GUARDS] Complete: ${results.filter(r => r.status === 'checked').length} checked, ${results.filter(r => r.status === 'error').length} errors`);

  return {
    success: results.every(r => r.status !== 'error'),
    checked: results.filter(r => r.status === 'checked').length,
    errors: results.filter(r => r.status === 'error'),
    total: results.length
  };
}

export async function executeFolderizationPlan({ focusPlan, projectPath, context, moveContext, server, validateAfterMove }) {
  return await runAsyncBoundary('executeFolderizationPlan', async () => {
    try {
      const moveTargets = sortMoveTargets(focusPlan.moveTargets, focusPlan.candidate?.barrelFile || null);
      const renameTargets = sortMoveTargets(buildAutoRenameTargets(moveTargets), null);

      const moveResult = await runFolderizeMoveBatch({
        server,
        focusPlan,
        moveTargets,
        projectPath,
        moveContext
      });

      if (!moveResult?.success) {
        return moveResult;
      }

      const renameResult = await runFolderizeRenameBatch({
        server,
        focusPlan,
        renameTargets,
        projectPath,
        moveContext
      });

      if (renameResult?.success === false) {
        return renameResult;
      }

      const rewriteResult = await runFolderizeRewritePhase({
        focusPlan,
        moveResult,
        renameResult,
        moveTargets,
        renameTargets,
        projectPath,
        moveContext,
        validateAfterMove
      });

      // Run deferred guards ONCE at the end of the entire batch
      // This ensures we catch any issues with the final state
      if (validateAfterMove) {
        const guardResult = await runDeferredGuards({
          focusPlan,
          projectPath,
          moveContext,
          allTargets: [...(moveResult.results || []).map(r => r.to), ...(renameResult?.results || []).map(r => r.to)]
        });
        return {
          ...rewriteResult,
          deferredGuards: guardResult
        };
      }

      return rewriteResult;
    } catch (error) {
      throw error;
    }
  });
}
