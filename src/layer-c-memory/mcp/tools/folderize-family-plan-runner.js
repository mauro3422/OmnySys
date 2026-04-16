import path from 'path';
import fs from 'fs/promises';
import { createLogger } from '../../../utils/logger.js';
import {
  runAsyncBoundary,
  normalizeSnapshotPath,
  buildFolderizedFamilyGroups,
  buildFolderizedFamilySuggestion,
  detectSemanticPurityConformanceFromSource,
  summarizeCompilerExplainability
} from '../../../shared/compiler/index.js';
import { MoveOrchestrator } from '../core/shared/move-orchestrator/orchestrator.js';
import { withMutationBatch } from '../core/shared/mutation-batch.js';
import { settleMutationFiles } from '../core/shared/mutation-settlement.js';
import { rewriteFolderizedFamilyImports } from './folderize-family-import-rewriter.js';
import { extractModuleDependencySourcesFromCode } from './atomic-edit/exports.js';
import { runFileWatcherSemanticGuards } from '../../../core/file-watcher/analyze-flow.js';
import {
  buildFolderizationMoveSnapshot,
  buildAutoRenameTargets,
  buildFinalMoveTargets,
  sortMoveTargets
} from './folderize-family-plan-runner/helpers.js';
import {
  detectCircularImportRisks,
  atomicBarrelRewrite,
  runFolderizeMoveBatch,
  runFolderizeRenameBatch
} from './folderize-family-plan-runner/move-orchestration.js';

const logger = createLogger('OmnySys:mcp:folderize_family:runner');

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
