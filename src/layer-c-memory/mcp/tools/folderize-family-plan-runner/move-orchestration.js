/**
 * @fileoverview Move orchestration for folderize family operations.
 * Handles file moves, renames, and batch settlement.
 */

import fs from 'fs/promises';
import path from 'path';
import { createLogger } from '../../../utils/logger.js';
import { MoveOrchestrator } from '../../core/shared/move-orchestrator/orchestrator.js';
import { withMutationBatch } from '../../core/shared/mutation-batch.js';
import { calculateRelativeImport } from '../../../../utils/path-utils.js';
import { applyFolderizationBarrelRewrite, validateCompilerImports } from '../../../../shared/compiler/index.js';

const logger = createLogger('OmnySys:mcp:folderize_family:move-orchestration');

export { applyFolderizationBarrelRewrite as atomicBarrelRewrite } from '../../../../shared/compiler/index.js';

async function restoreFolderizationBarrelShim(projectPath, barrelPath, barrelTargetPath) {
  const absBarrelPath = path.resolve(projectPath, barrelPath);
  const normalizedTargetImport = calculateRelativeImport(barrelPath, barrelTargetPath, projectPath);

  const content = [
    `import { executeFolderizationPlan } from '${normalizedTargetImport}';`,
    '',
    'export { executeFolderizationPlan };',
    '',
    'export default { executeFolderizationPlan };',
    ''
  ].join('\n');

  await fs.mkdir(path.dirname(absBarrelPath), { recursive: true });
  await fs.writeFile(absBarrelPath, content, 'utf8');
}

export async function runFolderizeMoveBatch({ server, focusPlan, moveTargets, projectPath, moveContext }) {
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

      if (moveContext?.folderizationSnapshot?.candidate?.barrelFile === target.from) {
        const barrelRewriteResult = await applyFolderizationBarrelRewrite(target.from, projectPath, moveTargets, {
          validate: false
        });
        if (barrelRewriteResult?.success === false) {
          logger.error(`[Tool] folderize_family barrel pre-rewrite failed: ${barrelRewriteResult?.error || `Failed to rewrite ${target.from}`}`);
          return {
            success: false,
            mode: 'failed',
            plan: focusPlan,
            results,
            error: barrelRewriteResult?.error || `Failed to rewrite ${target.from}`,
            barrelRewrite: barrelRewriteResult
          };
        }
        logger.info(`[Tool] folderize barrel pre-rewrite: ${barrelRewriteResult?.rewrites?.length || 0} rewrites`);
      }

      const moveResult = await MoveOrchestrator.moveFile(target.from, target.to, projectPath, enhancedMoveContext);
      results.push({ from: target.from, to: target.to, result: moveResult });

      if (!moveResult?.success) {
        logger.error(`[Tool] folderize_family move failed: ${moveResult?.error || `Failed to move ${target.from}`}`);
        return { success: false, mode: 'failed', plan: focusPlan, results, error: moveResult?.error || `Failed to move ${target.from}` };
      }

      if (moveContext?.folderizationSnapshot?.candidate?.barrelFile === target.from) {
        try {
          await restoreFolderizationBarrelShim(projectPath, target.from, target.to);
          logger.info(`[Tool] folderize barrel compatibility shim restored: ${target.from}`);
        } catch (error) {
          logger.error(`[Tool] folderize barrel compatibility shim failed: ${error.message}`);
          return {
            success: false,
            mode: 'failed',
            plan: focusPlan,
            results,
            error: error.message
          };
        }
      }

      movedFiles.push(target.to);
    }

    if (movedFiles.length > 0) {
      logger.info(`[Tool] folderize batch reindex: ${movedFiles.length} files`);
      try {
        const { analyzeSingleFile } = await import('#layer-a/pipeline/single-file.js');
        await Promise.all(movedFiles.map((filePath) => analyzeSingleFile(projectPath, filePath, { verbose: false, incremental: true })));
        logger.info(`[Tool] folderize batch reindex complete: ${movedFiles.length} files`);
      } catch (error) {
        logger.warn(`[Tool] folderize batch reindex failed: ${error.message}, continuing`);
      }

      try {
        const validationResults = await Promise.all(movedFiles.map(async (filePath) => {
          return await validateCompilerImports(
            {
              filePath,
              checkBroken: true,
              checkUnused: false,
              checkCircular: false,
              checkFileExistence: true
            },
            { projectPath }
          );
        }));

        const failedValidation = validationResults.find((result) => result?.status === 'HAS_ISSUES' || result?.valid === false || result?.success === false);
        if (failedValidation) {
          return {
            success: false,
            mode: 'failed',
            plan: focusPlan,
            results,
            error: failedValidation?.error || 'Folderize import validation failed after move',
            validationResults
          };
        }
      } catch (error) {
        logger.warn(`[Tool] folderize canonical validation failed: ${error.message}, continuing`);
      }
    }

    return { success: true, mode: 'applied', plan: focusPlan, results };
  });
}

export async function runFolderizeRenameBatch({ server, focusPlan, renameTargets, projectPath, moveContext }) {
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
