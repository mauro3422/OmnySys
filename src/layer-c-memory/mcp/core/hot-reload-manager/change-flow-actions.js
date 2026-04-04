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


function recordInventorySignal(server, filename, moduleInfo, policy) {
  if (!server) return;

  const sharedState = server.sharedState || (server.sharedState = {});
  const inventorySignals = sharedState.inventorySignals || (sharedState.inventorySignals = {
    total: 0,
    byType: {},
    byRole: {},
    recent: []
  });

  const surfaceName = String(filename || '').replace(/\\/g, '/').split('/').pop() || filename || 'unknown';
  const type = moduleInfo?.type || policy?.reason || 'unknown';
  const role = String(filename || '').includes('compiler') ? 'compiler' : String(filename || '').includes('mcp') ? 'mcp' : 'system';

  inventorySignals.total += 1;
  inventorySignals.byType[type] = (inventorySignals.byType[type] || 0) + 1;
  inventorySignals.byRole[role] = (inventorySignals.byRole[role] || 0) + 1;
  inventorySignals.recent = [
    { surface: surfaceName, filePath: filename, type, role, kind: moduleInfo?.kind || null, at: new Date().toISOString() },
    ...(Array.isArray(inventorySignals.recent) ? inventorySignals.recent : [])
  ].slice(0, 12);
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
      return applyRuntimeReloadChange({ eventType, filename, server, moduleInfo, policy: resolvedPolicy, reloadHandler });
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
  recordInventorySignal(server, filename, moduleInfo, policy);
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
  recordInventorySignal(server, filename, null, policy);
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
  recordInventorySignal(server, filename, moduleInfo, policy);
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

function applyRuntimeReloadChange({ eventType, filename, server, moduleInfo, policy, reloadHandler }) {
  recordInventorySignal(server, filename, moduleInfo, policy);
  logger.info(`â™»ï¸ Runtime change detected: ${filename} (${moduleInfo?.type || 'reloadable surface'}/${eventType})`);
  reloadHandler.applyModuleReload(filename, moduleInfo);
}

function shouldAutoRestartAfterReindex(server) {
  const autoRestartAfterReindex = String(process.env.OMNYSYS_REINDEX_AUTO_RESTART || '').toLowerCase() === 'true';
  return autoRestartAfterReindex && server?.runtimeRestartMode === 'auto';
}
