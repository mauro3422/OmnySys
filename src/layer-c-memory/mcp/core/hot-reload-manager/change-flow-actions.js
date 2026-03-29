import { createLogger } from '../../../utils/logger.js';
import { classifyRuntimeChange, RuntimeChangeAction } from './policy/runtime-change-policy.js';
import { queueRuntimeRestart } from './restart-coordinator.js';
import {
  buildRestartLifecycleGuidance,
  evaluateAtomRefactoringSignals
} from '../../../../shared/compiler/index.js';

const logger = createLogger('OmnySys:hot-reload');

export function buildHotReloadConformanceContext({ filename, server }) {
  const sharedSignals = ['_pendingHotReloadChanges', '_hotReloadDeferredDrainTimer'];
  return {
    restartLifecycle: buildRestartLifecycleGuidance({
      restartType: 'hot_reload_runtime_restart',
      proxyMode: server?.runtimeRestartMode === 'auto'
    }),
    semanticSignals: evaluateAtomRefactoringSignals({
      name: filename,
      filePath: filename,
      isAsync: true,
      hasErrorHandling: true,
      sharedStateAccess: sharedSignals,
      eventEmitters: ['server.emit']
    })
  };
}

export function dispatchReloadableChange({
  eventType,
  filename,
  server,
  moduleInfo,
  policy,
  reloadHandler,
  runtimeContext
}) {
  const resolvedPolicy = policy || classifyRuntimeChange(filename, moduleInfo);

  switch (resolvedPolicy.action) {
    case RuntimeChangeAction.IGNORE:
      logger.debug(`Ignoring non-runtime file: ${filename}`);
      return;
    case RuntimeChangeAction.REFRESH:
      return applyRefreshChange({ eventType, filename, server, moduleInfo, policy: resolvedPolicy, reloadHandler, runtimeContext });
    case RuntimeChangeAction.RESTART:
      return applyRestartChange({ filename, server, policy: resolvedPolicy });
    case RuntimeChangeAction.REINDEX:
      return applyReindexChange({ eventType, filename, server, moduleInfo, policy: resolvedPolicy, runtimeContext });
    default:
      return applyRuntimeReloadChange({ eventType, filename, moduleInfo, reloadHandler });
  }
}

function applyRefreshChange({
  eventType,
  filename,
  server,
  moduleInfo,
  policy,
  reloadHandler,
  runtimeContext
}) {
  logger.info(`â™»ï¸ Refresh-worthy change detected: ${filename} (${moduleInfo?.type || policy.reason}/${eventType})`);
  server?.emit?.('hot-reload:refresh-requested', {
    file: filename,
    reason: policy.reason,
    action: policy.action,
    lifecycle: runtimeContext.restartLifecycle,
    semanticSignals: runtimeContext.semanticSignals
  });
  reloadHandler.applyModuleReload(filename, moduleInfo);
}

function applyRestartChange({ filename, server, policy }) {
  logger.warn(`ðŸš¨ Runtime restart required: ${filename} (${policy.reason})`);
  queueRuntimeRestart(server, {
    filename,
    reason: policy.reason,
    eventName: 'hot-reload:restart-pending'
  });
}

function applyReindexChange({
  eventType,
  filename,
  server,
  moduleInfo,
  policy,
  runtimeContext
}) {
  logger.info(`â™»ï¸ Reindex-worthy change detected: ${filename} (${moduleInfo?.type || policy.reason}/${eventType})`);
  server?.emit?.('hot-reload:reindex-requested', {
    file: filename,
    reason: policy.reason,
    action: policy.action,
    runtimeReloadDeferred: true,
    runtimeRestartMode: server?.runtimeRestartMode || 'manual',
    lifecycle: runtimeContext.restartLifecycle,
    semanticSignals: runtimeContext.semanticSignals
  });

  if (shouldAutoRestartAfterReindex(server)) {
    queueRuntimeRestart(server, {
      filename,
      reason: `${policy.reason} (deferred until reindex settles)`,
      eventName: 'hot-reload:restart-pending'
    });
  }
}

function applyRuntimeReloadChange({ eventType, filename, moduleInfo, reloadHandler }) {
  logger.info(`â™»ï¸ Runtime change detected: ${filename} (${moduleInfo?.type || 'reloadable surface'}/${eventType})`);
  reloadHandler.applyModuleReload(filename, moduleInfo);
}

function shouldAutoRestartAfterReindex(server) {
  const autoRestartAfterReindex = String(process.env.OMNYSYS_REINDEX_AUTO_RESTART || '').toLowerCase() === 'true';
  return autoRestartAfterReindex && server?.runtimeRestartMode === 'auto';
}
