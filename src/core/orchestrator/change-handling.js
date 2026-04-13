import { loadCompilerExplainability } from '../../shared/compiler/loader.js';

const COMPILER_POLICY_PATHS = [
  'src/shared/compiler/',
  'src/layer-c-memory/mcp/tools/',
];

function isCompilerPolicyFile(filePath) {
  return COMPILER_POLICY_PATHS.some((p) => filePath.includes(p));
}

export async function handleOrchestratorFileChange(orchestrator, filePath, changeType, options = {}) {
  const { skipDebounce = false, priority = 'normal' } = options;

  orchestrator.logger.info(`File change detected: ${filePath} (${changeType})`);

  await orchestrator._invalidateFileCache(filePath);

  // Refresh compiler explainability when policy files change
  if (isCompilerPolicyFile(filePath) && orchestrator.sharedState) {
    try {
      orchestrator.logger.info(`Refreshing compiler explainability after policy file change: ${filePath}`);
      await loadCompilerExplainability(
        orchestrator.projectPath,
        orchestrator.watcherAlerts || [],
        orchestrator.sharedState,
        orchestrator.watcherStats || null,
        {}
      );
    } catch (error) {
      orchestrator.logger.warn(`Failed to refresh compiler explainability: ${error.message}`);
    }
  }

  if (changeType === 'modified' || changeType === 'created') {
    const queuePriority = priority === 'critical'
      ? 'critical'
      : changeType === 'created'
        ? 'high'
        : 'normal';

    orchestrator.queue.enqueue(filePath, queuePriority);

    if ((skipDebounce || priority === 'critical') && !orchestrator.currentJob && orchestrator.isRunning) {
      orchestrator._processNext();
    }
  }

  orchestrator.wsManager?.publish({
    type: 'file:changed',
    filePath,
    changeType,
    priority,
    timestamp: Date.now()
  });
}
