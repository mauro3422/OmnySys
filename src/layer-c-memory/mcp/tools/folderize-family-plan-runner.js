import path from 'path';
import fs from 'fs/promises';
import { createLogger } from '../../../utils/logger.js';
import { runAsyncBoundary } from '../../../shared/compiler/index.js';
import { normalizeSnapshotPath } from '../../../shared/compiler/index.js';
import { MoveOrchestrator } from '../core/shared/move-orchestrator/orchestrator.js';
import { withMutationBatch } from '../core/shared/mutation-batch.js';
import { settleMutationFiles } from '../core/shared/mutation-settlement.js';
import { buildFolderizedFamilyGroups, buildFolderizedFamilySuggestion } from '../../../shared/compiler/index.js';
import { rewriteFolderizedFamilyImports } from './folderize-family-import-rewriter.js';
import { extractModuleDependencySourcesFromCode } from './atomic-edit/exports.js';
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

/**
 * Detect potential circular imports BEFORE folderization.
 * Returns warnings if moving files would create import cycles.
 */
async function detectCircularImportRisks(moveTargets, projectPath, repo) {
  const risks = [];
  
  if (!repo?.db) return risks;
  
  // Build a map of old path → new path
  const pathMapping = new Map();
  for (const target of moveTargets) {
    pathMapping.set(target.from, target.to);
  }
  
  // For each moved file, check if it imports other moved files
  for (const target of moveTargets) {
    try {
      const fullPath = path.resolve(projectPath, target.to);
      const code = await fs.readFile(fullPath, 'utf8');
      const imports = extractModuleDependencySourcesFromCode(code);
      
      for (const imp of imports) {
        // Check if this import points to another moved file
        const impResolved = path.resolve(path.dirname(fullPath), imp).replace(/\\/g, '/');
        const projectNormalized = path.resolve(projectPath).replace(/\\/g, '/');
        const impRelative = impResolved.replace(projectNormalized + '/', '').replace(/\\/g, '/');
        
        // Check if this matches another moved file
        for (const [oldPath, newPath] of pathMapping) {
          if (newPath === impRelative || impResolved.includes(path.basename(newPath, '.js'))) {
            // Check for cycle: does the target also import back to this file?
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
 * This prevents partial writes that can corrupt the barrel.
 */
async function atomicBarrelRewrite(barrelPath, projectPath, moveTargets) {
  const absPath = path.resolve(projectPath, barrelPath);
  
  try {
    let code = await fs.readFile(absPath, 'utf8');
    let modified = false;
    const rewrites = [];
    
    // Build old → new mapping for all moved files
    const oldToNewMap = new Map();
    for (const target of moveTargets) {
      const oldBasename = path.basename(target.from, '.js');
      const newBasename = path.basename(target.to, '.js');
      oldToNewMap.set(oldBasename, newBasename);
    }
    
    // Process each line
    const lines = code.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Check if line is an export/import from a moved file
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
      // Write ALL changes at once - atomic
      await fs.writeFile(absPath, lines.join('\n'), 'utf8');
      return {
        success: true,
        path: barrelPath,
        rewrites,
        atomic: true
      };
    }
    
    return {
      success: true,
      path: barrelPath,
      rewrites: [],
      atomic: true
    };
  } catch (error) {
    return {
      success: false,
      path: barrelPath,
      error: error.message,
      atomic: true
    };
  }
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

    // CRITICAL: Set skipSelfRewrite=true for ALL moves in folderization.
    // The MoveOrchestrator's self-rewrite only knows about the single file being moved,
    // not about other files moving to the same folder. This causes it to generate
    // incorrect imports like './schema-registry-helpers.js' → './helpers.js' when
    // it should be './schema-registry-helpers.js' → './helpers.js' (via intra-family rewrite).
    // We rely on rewriteIntraFamilyImports in the rewrite phase to handle this correctly.
    const enhancedMoveContext = {
      ...moveContext,
      skipSelfRewrite: true,  // Always skip self-rewrite in folderization
      skipSettlement: true,
      deferGuards: true
    };

    for (const target of moveTargets) {
      logger.info(`[Tool] folderize move: ${target.from} -> ${target.to}`);
      const moveResult = await MoveOrchestrator.moveFile(target.from, target.to, projectPath, enhancedMoveContext);
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

    // BATCH settlement: reindex ALL moved files at once AND update files table
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

      // CRITICAL FIX: Update files table to reflect moved files
      // This prevents false positive "HAS_ISSUES" in validation caused by stale DB cache
      try {
        const { getRepository } = await import('#layer-c/storage/repository/index.js');
        const repo = getRepository(projectPath);
        if (repo?.db) {
          // Mark old paths as removed
          const oldPaths = moveTargets.map(t => t.from);
          for (const oldPath of oldPaths) {
            repo.db.prepare(`UPDATE files SET is_removed = 1 WHERE path = ? AND is_removed = 0`).run(oldPath);
          }
          // Insert new paths
          const insertStmt = repo.db.prepare(`
            INSERT OR IGNORE INTO files (path, is_removed, last_analysis_at)
            VALUES (?, 0, datetime('now'))
          `);
          for (const newPath of movedFiles) {
            insertStmt.run(newPath);
          }
          logger.info(`[Tool] folderize files table updated: ${oldPaths.length} old paths removed, ${movedFiles.length} new paths added`);
        }
      } catch (error) {
        logger.warn(`[Tool] folderize files table update failed: ${error.message}, continuing`);
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
  
  // Build guard context with all required functions
  const guardContext = {
    rootPath: projectPath,
    ...moveContext,
    deferGuards: false,
    // CRITICAL FIX: Add getAtomsForFile function that governance guards expect
    async getAtomsForFile(filePath) {
      try {
        const { getRepository } = await import('#layer-c/storage/repository/index.js');
        const repo = getRepository(projectPath);
        if (!repo?.db) return [];
        
        const normalizedPath = filePath.replace(/\\/g, '/');
        return repo.db.prepare(`
          SELECT id, name, type as atom_type, file_path, line_start, line_end,
                 complexity, lines_of_code, is_exported, is_async, dna_json
          FROM atoms
          WHERE file_path = ? AND (is_removed IS NULL OR is_removed = 0)
          ORDER BY line_start
        `).all(normalizedPath) || [];
      } catch (error) {
        logger.warn(`[DEFERRED GUARDS] getAtomsForFile failed for ${filePath}: ${error.message}`);
        return [];
      }
    }
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

      // NEW: Detect circular import risks BEFORE moving files
      const circularRisks = await detectCircularImportRisks(
        [...moveTargets, ...renameTargets], 
        projectPath, 
        context?.orchestrator?.cache?.getRepository?.()
      );
      
      if (circularRisks.length > 0) {
        logger.warn(`[FOLDERIZE] Circular import risks detected: ${circularRisks.map(r => r.message).join(', ')}`);
      }

      const moveResult = await runFolderizeMoveBatch({
        server,
        focusPlan,
        moveTargets,
        projectPath,
        moveContext
      });

      if (!moveResult?.success) {
        return {
          ...moveResult,
          circularRisks,
          warnings: circularRisks.map(r => r.message)
        };
      }

      const renameResult = await runFolderizeRenameBatch({
        server,
        focusPlan,
        renameTargets,
        projectPath,
        moveContext
      });

      if (renameResult?.success === false) {
        return {
          ...renameResult,
          circularRisks,
          warnings: circularRisks.map(r => r.message)
        };
      }

      // NEW: Atomic barrel rewrite - rewrite ALL barrel imports at once
      const barrelPath = focusPlan.candidate?.barrelFile;
      let barrelRewriteResult = null;
      if (barrelPath) {
        barrelRewriteResult = await atomicBarrelRewrite(
          barrelPath, 
          projectPath, 
          [...moveTargets, ...renameTargets]
        );
        logger.info(`[FOLDERIZE] Atomic barrel rewrite: ${barrelRewriteResult.success ? 'success' : 'failed'} (${barrelRewriteResult.rewrites?.length || 0} rewrites)`);
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
          circularRisks,
          barrelRewrite: barrelRewriteResult,
          warnings: circularRisks.map(r => r.message),
          deferredGuards: guardResult
        };
      }

      return {
        ...rewriteResult,
        circularRisks,
        barrelRewrite: barrelRewriteResult,
        warnings: circularRisks.map(r => r.message)
      };
    } catch (error) {
      throw error;
    }
  });
}
