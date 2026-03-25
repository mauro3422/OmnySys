export async function handleOrchestratorFileChange(orchestrator, filePath, changeType, options = {}) {
  const { skipDebounce = false, priority = 'normal' } = options;

  orchestrator.logger.info(`File change detected: ${filePath} (${changeType})`);

  await orchestrator._invalidateFileCache(filePath);

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
