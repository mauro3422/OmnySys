/**
 * @fileoverview Move orchestration for folderize family operations.
 * Handles file moves, renames, and batch settlement.
 */

import path from 'path';
import fs from 'fs/promises';
import { createLogger } from '../../../utils/logger.js';
import { MoveOrchestrator } from '../../core/shared/move-orchestrator/orchestrator.js';
import { withMutationBatch } from '../../core/shared/mutation-batch.js';
import { extractModuleDependencySourcesFromCode } from '../atomic-edit/exports.js';

const logger = createLogger('OmnySys:mcp:folderize_family:move-orchestration');

/**
 * Detect potential circular imports BEFORE folderization.
 */
export async function detectCircularImportRisks(moveTargets, projectPath, repo) {
  const risks = [];

  if (!repo?.db) return risks;

  const pathMapping = new Map();
  for (const target of moveTargets) {
    pathMapping.set(target.from, target.to);
  }

  for (const target of moveTargets) {
    try {
      const fullPath = path.resolve(projectPath, target.to);
      const code = await fs.readFile(fullPath, 'utf8');
      const imports = extractModuleDependencySourcesFromCode(code);

      for (const imp of imports) {
        const impResolved = path.resolve(path.dirname(fullPath), imp).replace(/\\/g, '/');
        const projectNormalized = path.resolve(projectPath).replace(/\\/g, '/');
        const impRelative = impResolved.replace(projectNormalized + '/', '').replace(/\\/g, '/');

        for (const [oldPath, newPath] of pathMapping) {
          if (newPath === impRelative || impResolved.includes(path.basename(newPath, '.js'))) {
            const targetFullPath = path.resolve(projectPath, newPath);
            try {
              const targetCode = await fs.readFile(targetFullPath, 'utf8');
              const targetImports = extractModuleDependencySourcesFromCode(targetCode);

              for (const targetImp of targetImports) {
                if (targetImp.includes(path.basename(target.to, '.js'))) {
                  risks.push({
                    type: 'circular',
                    fileA: target.to,
                    fileB: newPath,
                    severity: 'medium',
                    message: `Circular import risk: ${path.basename(target.to)} ↔ ${path.basename(newPath)}`
                  });
                }
              }
            } catch {
              // File might not exist yet
            }
          }
        }
      }
    } catch {
      // File might not exist yet
    }
  }

  return risks;
}

/**
 * Rewrite barrel file atomically: read all, rewrite all, write once.
 */
export async function atomicBarrelRewrite(barrelPath, projectPath, moveTargets) {
  const absPath = path.resolve(projectPath, barrelPath);

  try {
    let code = await fs.readFile(absPath, 'utf8');
    let modified = false;
    const rewrites = [];

    const oldToNewMap = new Map();
    for (const target of moveTargets) {
      const oldBasename = path.basename(target.from, '.js');
      const newBasename = path.basename(target.to, '.js');
      oldToNewMap.set(oldBasename, newBasename);
    }

    const lines = code.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      for (const [oldName, newName] of oldToNewMap) {
        if (line.includes(oldName) && (line.includes('from') || line.includes('export'))) {
          lines[i] = line.replace(new RegExp(oldName, 'g'), newName);
          modified = true;
          rewrites.push({
            line: i + 1,
            from: oldName,
            to: newName,
            lineContent: lines[i]
          });
        }
      }
    }

    if (modified) {
      await fs.writeFile(absPath, lines.join('\n'), 'utf8');
      return { success: true, path: barrelPath, rewrites, atomic: true };
    }

    return { success: true, path: barrelPath, rewrites: [], atomic: true };
  } catch (error) {
    return { success: false, path: barrelPath, error: error.message, atomic: true };
  }
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
