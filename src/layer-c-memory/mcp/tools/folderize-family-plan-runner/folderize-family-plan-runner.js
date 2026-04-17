/**
 * @fileoverview Folderization plan runner for MCP tools.
 * Handles execution of folderization plans and snapshot creation.
 */

import { createLogger } from '../../../utils/logger.js';
import { MoveOrchestrator } from '../../core/shared/move-orchestrator/orchestrator.js';
import { withMutationBatch } from '../../core/shared/mutation-batch.js';
import { detectCircularImportRisks } from './move-orchestration.js';
import { buildFolderizationMoveSnapshot } from '../../../../shared/compiler/index.js';

const logger = createLogger('OmnySys:mcp:folderize_family:plan-runner');

/**
 * Execute a folderization plan with validation and risk detection.
 */
export async function executeFolderizationPlan({ focusPlan, projectPath, context, moveContext, server, validateAfterMove = true }) {
  const { moveTargets, renameTargets = [] } = focusPlan;

  // Detect circular import risks before moving
  const circularRisks = await detectCircularImportRisks(moveTargets, projectPath, context?.repository);
  if (circularRisks.length > 0) {
    logger.error(`[Tool] folderize_family circular import risks detected: ${circularRisks.length} risks`);
    return {
      success: false,
      mode: 'circular_risks',
      plan: focusPlan,
      risks: circularRisks,
      error: `Circular import risks detected: ${circularRisks.length} risks`
    };
  }

  // Execute move batch
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

  // Execute rename batch if needed
  if (renameTargets.length > 0) {
    const renameResult = await runFolderizeRenameBatch({
      server,
      focusPlan,
      renameTargets,
      projectPath,
      moveContext
    });

    if (!renameResult?.success) {
      return renameResult;
    }
  }

  // Validate after move if requested
  if (validateAfterMove) {
    try {
      const { analyzeSingleFile } = await import('#layer-a/pipeline/single-file.js');
      const filesToValidate = [...moveTargets.map(t => t.to), ...renameTargets.map(t => t.to)];
      await Promise.all(filesToValidate.map(f => analyzeSingleFile(projectPath, f, { verbose: false, incremental: true })));
      logger.info(`[Tool] folderize_family validation complete: ${filesToValidate.length} files validated`);
    } catch (error) {
      logger.warn(`[Tool] folderize_family validation failed: ${error.message}, continuing`);
    }
  }

  return {
    success: true,
    mode: 'applied',
    plan: focusPlan,
    moveResult,
    renameResult
  };
}

/**
 * Run folderize move batch with proper error handling and logging.
 */
async function runFolderizeMoveBatch({ server, focusPlan, moveTargets, projectPath, moveContext }) {
  return await withMutationBatch(server, {
    reason: 'folderize_family',
    files: focusPlan.files || []
  }, async () => {
    const results = [];
    const movedFiles = [];

    const enhancedMoveContext = {
      ...moveContext,
      skipSelfRewrite: true,
      skipSettlement: true,
      deferGuards: true
    };

    for (const target of moveTargets) {
      logger.info(`[Tool] folderize move: ${target.from} -> ${target.to}`);
      const moveResult = await MoveOrchestrator.moveFile(target.from, target.to, projectPath, enhancedMoveContext);
      results.push({ from: target.from, to: target.to, result: moveResult });

      if (!moveResult?.success) {
        logger.error(`[Tool] folderize_family move failed: ${moveResult?.error || `Failed to move ${target.from}`}`);
        return { success: false, mode: 'failed', plan: focusPlan, results, error: moveResult?.error || `Failed to move ${target.from}` };
      }

      movedFiles.push(target.to);
    }

    if (movedFiles.length > 0) {
      logger.info(`[Tool] folderize batch reindex: ${movedFiles.length} files`);
      try {
        const { analyzeSingleFile } = await import('#layer-a/pipeline/single-file.js');
        await Promise.all(movedFiles.map(f => analyzeSingleFile(projectPath, f, { verbose: false, incremental: true })));
        logger.info(`[Tool] folderize batch reindex complete: ${movedFiles.length} files`);
      } catch (error) {
        logger.warn(`[Tool] folderize batch reindex failed: ${error.message}, continuing`);
      }

      try {
        const { getRepository } = await import('#layer-c/storage/repository/index.js');
        const repo = getRepository(projectPath);
        if (repo?.db) {
          const oldPaths = moveTargets.map(t => t.from);
          for (const oldPath of oldPaths) {
            repo.db.prepare(`UPDATE files SET is_removed = 1 WHERE path = ? AND is_removed = 0`).run(oldPath);
          }
          const insertStmt = repo.db.prepare(`INSERT OR IGNORE INTO files (path, is_removed, last_analysis_at) VALUES (?, 0, datetime('now'))`);
          for (const newPath of movedFiles) {
            insertStmt.run(newPath);
          }
          logger.info(`[Tool] folderize files table updated: ${oldPaths.length} old paths removed, ${movedFiles.length} new paths added`);
        }
      } catch (error) {
        logger.warn(`[Tool] folderize files table update failed: ${error.message}, continuing`);
      }
    }

    return { success: true, mode: 'applied', plan: focusPlan, results };
  });
}

/**
 * Run folderize rename batch with proper error handling and logging.
 */
async function runFolderizeRenameBatch({ server, focusPlan, renameTargets, projectPath, moveContext }) {
  if (renameTargets.length === 0) {
    return null;
  }

  return await withMutationBatch(server, {
    reason: 'folderize_family_rename',
    files: renameTargets.map((target) => target.from)
  }, async () => {
    const results = [];

    for (const target of renameTargets) {
      logger.info(`[Tool] folderize rename: ${target.from} -> ${target.to}`);
      const renameMoveResult = await MoveOrchestrator.moveFile(target.from, target.to, projectPath, {
        ...moveContext,
        deferGuards: true
      });
      results.push({ from: target.from, to: target.to, result: renameMoveResult });

      if (!renameMoveResult?.success) {
        logger.error(`[Tool] folderize_family rename failed: ${renameMoveResult?.error || `Failed to rename ${target.from}`}`);
        return { success: false, mode: 'failed', plan: focusPlan, results, error: renameMoveResult?.error || `Failed to rename ${target.from}` };
      }
    }

    return { success: true, mode: 'applied', plan: focusPlan, results };
  });
}