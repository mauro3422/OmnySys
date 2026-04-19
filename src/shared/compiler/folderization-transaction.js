import { runAsyncBoundary } from './async-boundary.js';
import { buildFolderizationCircularRiskReport } from './folderization-circular-risk.js';
import { sortMoveTargets, buildAutoRenameTargets } from '../../layer-c-memory/mcp/tools/folderize-family-plan-runner/helpers.js';
import { collectFolderizationRollbackTargets, captureFolderizationRollbackSnapshot } from '../../layer-c-memory/mcp/tools/folderize-family-plan-runner-rollback.js';
import { runFolderizationStages } from '../../layer-c-memory/mcp/tools/folderize-family-plan-runner-phases.js';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('OmnySys:shared:compiler:folderization-transaction');

export async function executeFolderizationTransaction({ focusPlan, projectPath, context, moveContext, server, validateAfterMove, executionGate = null }) {
  return await runAsyncBoundary('executeFolderizationTransaction', async () => {
    const moveTargets = sortMoveTargets(focusPlan.moveTargets, focusPlan.candidate?.barrelFile || null);
    const renameTargets = sortMoveTargets(buildAutoRenameTargets(moveTargets), null);
    const rollbackTargets = collectFolderizationRollbackTargets({
      focusPlan,
      moveTargets,
      renameTargets
    });
    const rollbackSnapshot = await captureFolderizationRollbackSnapshot(projectPath, rollbackTargets);

    const circularRisks = await buildFolderizationCircularRiskReport(
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

export default { executeFolderizationTransaction };
