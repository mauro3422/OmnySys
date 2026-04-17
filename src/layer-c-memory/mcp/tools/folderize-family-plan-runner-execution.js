import { runAsyncBoundary } from '../../../shared/compiler/index.js';
import { sortMoveTargets, buildAutoRenameTargets } from './folderize-family-plan-runner/helpers.js';
import { detectCircularImportRisks } from './folderize-family-plan-runner/move-orchestration.js';
import { collectFolderizationRollbackTargets, captureFolderizationRollbackSnapshot } from './folderize-family-plan-runner-rollback.js';
import { runFolderizationStages } from './folderize-family-plan-runner-phases.js';
import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('OmnySys:mcp:folderize_family:runner');

export async function executeFolderizationPlan({ focusPlan, projectPath, context, moveContext, server, validateAfterMove, executionGate = null }) {
  return await runAsyncBoundary('executeFolderizationPlan', async () => {
    const moveTargets = sortMoveTargets(focusPlan.moveTargets, focusPlan.candidate?.barrelFile || null);
    const renameTargets = sortMoveTargets(buildAutoRenameTargets(moveTargets), null);
    const rollbackTargets = collectFolderizationRollbackTargets({
      focusPlan,
      moveTargets,
      renameTargets
    });
    const rollbackSnapshot = await captureFolderizationRollbackSnapshot(projectPath, rollbackTargets);

    const circularRisks = await detectCircularImportRisks(
      [...moveTargets, ...renameTargets],
      projectPath,
      context?.orchestrator?.cache?.getRepository?.()
    );

    if (circularRisks.length > 0) {
      logger.warn(`[FOLDERIZE] Circular import risks detected: ${circularRisks.map((r) => r.message).join(', ')}`);
    }

    return await runFolderizationStages({
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
    });
  });
}
