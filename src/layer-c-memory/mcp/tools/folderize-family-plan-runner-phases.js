import { atomicBarrelRewrite, runFolderizeMoveBatch, runFolderizeRenameBatch } from './folderize-family-plan-runner/move-orchestration.js';
import { buildFolderizeWarnings, buildFolderizeFailureResult, rollbackFolderizationTransaction } from './folderize-family-plan-runner-rollback.js';
import { runFolderizeCompletionPhase } from './folderize-family-plan-runner-completion.js';
import { runDeferredGuards } from './folderize-family-plan-runner-guards.js';
import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('OmnySys:mcp:folderize_family:runner');

function buildFolderizationTransactionContext(moveContext, executionGate, rollbackSnapshot) {
  return {
    ...moveContext,
    executionGate,
    folderizationRollbackSnapshot: rollbackSnapshot
  };
}

async function createFolderizationRollbackResponse({
  projectPath,
  transactionalMoveContext,
  rollbackSnapshot,
  failureResult,
  stage,
  executionGate,
  circularRisks
}) {
  const rollback = await rollbackFolderizationTransaction({
    projectPath,
    moveContext: transactionalMoveContext,
    moveResult: failureResult?.moveResult || failureResult?.moveBatch || failureResult,
    renameResult: failureResult?.renameResult || null,
    rollbackSnapshot
  });

  return buildFolderizeFailureResult({
    failureResult: {
      ...failureResult,
      circularRisks,
      warnings: buildFolderizeWarnings(failureResult, circularRisks)
    },
    stage,
    executionGate,
    rollback
  });
}

export async function runFolderizationStages({
  focusPlan,
  projectPath,
  moveContext,
  server,
  validateAfterMove,
  executionGate,
  moveTargets,
  renameTargets,
  rollbackSnapshot,
  circularRisks
}) {
  const transactionalMoveContext = buildFolderizationTransactionContext(moveContext, executionGate, rollbackSnapshot);

  const moveResult = await runFolderizeMoveBatch({
    server,
    focusPlan,
    moveTargets,
    projectPath,
    moveContext: transactionalMoveContext
  });
  if (moveResult?.success === false) {
    return await createFolderizationRollbackResponse({
      projectPath,
      transactionalMoveContext,
      rollbackSnapshot,
      failureResult: moveResult,
      stage: 'move_batch',
      executionGate,
      circularRisks
    });
  }

  const renameResult = renameTargets.length > 0
    ? await runFolderizeRenameBatch({
        server,
        focusPlan,
        renameTargets,
        projectPath,
        moveContext: transactionalMoveContext
      })
    : null;
  if (renameResult?.success === false) {
    return await createFolderizationRollbackResponse({
      projectPath,
      transactionalMoveContext,
      rollbackSnapshot,
      failureResult: {
        ...renameResult,
        moveResult
      },
      stage: 'rename_batch',
      executionGate,
      circularRisks
    });
  }

  const barrelPath = focusPlan.candidate?.barrelFile;
  const barrelRewriteResult = barrelPath
    ? await atomicBarrelRewrite(barrelPath, projectPath, [...moveTargets, ...renameTargets])
    : { success: true, barrelRewrite: null };
  logger.info(`[FOLDERIZE] Atomic barrel rewrite: ${barrelRewriteResult.success ? 'success' : 'failed'} (${barrelRewriteResult.rewrites?.length || 0} rewrites)`);

  if (barrelRewriteResult?.success === false) {
    return await createFolderizationRollbackResponse({
      projectPath,
      transactionalMoveContext,
      rollbackSnapshot,
      failureResult: {
        moveResult,
        renameResult,
        barrelRewrite: barrelRewriteResult,
        error: barrelRewriteResult.error || 'Atomic barrel rewrite failed'
      },
      stage: 'barrel_rewrite',
      executionGate,
      circularRisks
    });
  }

  const rewriteResult = await runFolderizeCompletionPhase({
    focusPlan,
    moveResult,
    renameResult,
    moveTargets,
    renameTargets,
    projectPath,
    moveContext: transactionalMoveContext,
    validateAfterMove
  });

  if (!rewriteResult?.success) {
    return await createFolderizationRollbackResponse({
      projectPath,
      transactionalMoveContext,
      rollbackSnapshot,
      failureResult: {
        ...rewriteResult,
        moveResult,
        renameResult,
        barrelRewrite: barrelRewriteResult
      },
      stage: rewriteResult?.mode || 'rewrite_phase',
      executionGate,
      circularRisks
    });
  }

  if (!validateAfterMove) {
    return {
      ...rewriteResult,
      moveResult,
      renameResult,
      barrelRewrite: barrelRewriteResult,
      executionGate,
      transaction: {
        rollbackProtected: true,
        rollbackSnapshotCount: rollbackSnapshot.length
      }
    };
  }

  const guardResult = await runDeferredGuards({
    focusPlan,
    projectPath,
    moveContext: transactionalMoveContext,
    allTargets: [...moveTargets.map((target) => target.to), ...renameTargets.map((target) => target.to)]
  });

  if (!guardResult.success) {
    return await createFolderizationRollbackResponse({
      projectPath,
      transactionalMoveContext,
      rollbackSnapshot,
      failureResult: {
        ...rewriteResult,
        moveResult,
        renameResult,
        barrelRewrite: barrelRewriteResult,
        deferredGuards: guardResult
      },
      stage: 'deferred_guards',
      executionGate,
      circularRisks
    });
  }

  return {
    ...rewriteResult,
    moveResult,
    renameResult,
    circularRisks,
    barrelRewrite: barrelRewriteResult,
    warnings: buildFolderizeWarnings(rewriteResult, circularRisks),
    deferredGuards: guardResult,
    executionGate,
    transaction: {
      rollbackProtected: true,
      rollbackSnapshotCount: rollbackSnapshot.length
    }
  };
}
